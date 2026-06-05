import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ApartmentDescription } from '@/components/ApartmentDescription';
import { HousingSearch } from '@/components/HousingSearch';
import { ApartmentAvatarUpload } from '@/components/ApartmentAvatarUpload';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { AppContainer } from '@/components/layout/AppContainer';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/app/contexts/AuthContext';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';
import { useNotifications } from '@/hooks/useNotifications';
import { ApartmentInspections } from '@/components/ApartmentInspections';
import { ContentDashboard } from '../content-dashboard/content-dashboard';
import { CallistoAdminsTab } from '../components/CallistoAdminsTab';
import { Leaderboard } from '../components/leaderboard';
import { HeaderDashBoard } from './components/header-dashboard';

type Building = { id: number; code: string; name: string };

type Apartment = {
  id: number;
  number: number;
  building_code: string;
  current_residents: number;
  max_residents: number;
  use_default_tasks?: boolean;
  cleaning_mode?: string;
  description?: string | null;
  total_cleanings?: number;
  equipped_frame_code?: string | null;
  avatar_url?: string | null;
};

type ApartmentMember = {
  user_id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  equipped_frame_code?: string | null;
};

type TaskTemplate = {
  id: number;
  name: string;
  description?: string | null;
};

const CLEANING_MODES = [
  { id: 'light', label: 'Лёгкая уборка' },
  { id: 'general', label: 'Генеральная уборка' },
] as const;

const TABS = [
  { id: 'cleaning' as const, label: 'Уборка' },
  { id: 'housing' as const, label: 'Квартира' },
  { id: 'rating' as const, label: 'Рейтинг' },
  { id: 'admins' as const, label: 'Администрация' },
];

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('cleaning');

  const [isLoadingApartment, setIsLoadingApartment] = useState(true);
  const [myApartment, setMyApartment] = useState<Apartment | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [showApartmentPicker, setShowApartmentPicker] = useState(false);
  const [members, setMembers] = useState<ApartmentMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [useDefaultTasks, setUseDefaultTasks] = useState<boolean | null>(null);
  const [cleaningMode, setCleaningMode] = useState<string>('general');

  const isManager = user?.apartment?.role === 'manager';

  useNotifications(user?.id, myApartment?.id);

  const refreshUser = async () => {
    const res = await api.get('/users/me');
    setUser(res.data);
  };

  const loadMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      const res = await api.get<ApartmentMember[]>('/housing/apartments/me/members');
      setMembers(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить жильцов'));
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoadingTemplates(true);
      const res = await api.get<TaskTemplate[]>('/tasks/templates/me');
      setTemplates(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить шаблоны'));
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const loadMyApartment = async (): Promise<boolean> => {
    try {
      const res = await api.get<Apartment>('/housing/apartments/me');
      setMyApartment(res.data);
      setUseDefaultTasks(res.data.use_default_tasks ?? true);
      setCleaningMode(res.data.cleaning_mode ?? 'general');
      return true;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 400 || status === 404) {
        setMyApartment(null);
        return false;
      }
      throw error;
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('access_token')) {
        setIsLoadingApartment(false);
        return;
      }
      try {
        const hasApartment = await loadMyApartment();
        if (hasApartment) {
          await loadMembers();
        } else {
          setMembers([]);
        }
      } catch {
        setMyApartment(null);
        setMembers([]);
      } finally {
        setIsLoadingApartment(false);
      }
    };
    init();
  }, [loadMembers]);

  useEffect(() => {
    if (isManager && myApartment) {
      loadTemplates();
    }
  }, [isManager, myApartment, loadTemplates]);

  const loadBuildings = async () => {
    const res = await api.get<Building[]>('/housing/buildings');
    setBuildings(res.data);
  };

  const loadApartments = async (code: string) => {
    const res = await api.get<Apartment[]>(`/housing/buildings/${code}/apartments`);
    setApartments(res.data);
  };

  const handleSelectBuilding = async (code: string) => {
    setSelectedBuilding(code);
    await loadApartments(code);
  };

  const handleJoinApartment = async (apartmentId: number) => {
    const hasApartment = Boolean(myApartment || user?.apartment);
    try {
      if (hasApartment || isMoving) {
        await api.post(`/housing/apartments/${apartmentId}/move`);
        toast.success('Вы переехали в новую квартиру');
      } else {
        await api.post(`/housing/apartments/${apartmentId}/join`);
        toast.success('Квартира выбрана');
      }
      await loadMyApartment();
      await loadMembers();
      await refreshUser();
      setIsMoving(false);
      setShowApartmentPicker(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось выбрать квартиру'));
    }
  };

  const startSelectApartment = async (asMove: boolean) => {
    setIsMoving(asMove);
    setShowApartmentPicker(true);
    setSelectedBuilding(null);
    setApartments([]);
    if (!buildings.length) {
      await loadBuildings();
    }
  };

  const handleLeaveApartment = async () => {
    if (!confirm('Покинуть квартиру? Ваши дни в расписании будут освобождены.')) return;
    try {
      await api.post('/housing/apartments/me/leave');
      setMyApartment(null);
      setMembers([]);
      setShowApartmentPicker(false);
      await refreshUser();
      toast.success('Вы покинули квартиру');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось покинуть квартиру'));
    }
  };

  const handleRemoveMember = async (userId: number, username: string) => {
    if (!myApartment) return;
    if (!confirm(`Исключить ${username} из квартиры?`)) return;
    try {
      await api.delete(`/housing/apartments/${myApartment.id}/members/${userId}`);
      await loadMembers();
      toast.success('Жилец исключён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось исключить жильца'));
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    try {
      const res = await api.post<TaskTemplate>('/tasks/templates/me', {
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || null,
      });
      setTemplates((prev) => [...prev, res.data]);
      setNewTemplateName('');
      setNewTemplateDescription('');
      toast.success('Шаблон добавлен');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось добавить шаблон'));
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await api.delete(`/tasks/templates/me/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Шаблон удалён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить шаблон'));
    }
  };

  const toggleUseDefaultTasks = async () => {
    if (useDefaultTasks === null) return;
    try {
      const res = await api.post<{ use_default_tasks: boolean }>(
        '/housing/apartments/me/use-default-tasks',
        null,
        { params: { use_default: !useDefaultTasks } },
      );
      setUseDefaultTasks(res.data.use_default_tasks);
      toast.success(
        res.data.use_default_tasks
          ? 'Включены стандартные наборы задач'
          : 'Включены свои шаблоны',
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось переключить режим'));
    }
  };

  const changeCleaningMode = async (mode: string) => {
    try {
      const res = await api.post<{ cleaning_mode: string }>(
        '/housing/apartments/me/cleaning-mode',
        { mode },
      );
      setCleaningMode(res.data.cleaning_mode);
      setUseDefaultTasks(true);
      toast.success('Тип уборки обновлён — новые задачи добавлены, прогресс сохранён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сменить тип уборки'));
    }
  };

  const renderApartmentSelector = () => (
    <div className="mt-4 list-item-shell p-4">
      <p className="text-sm text-body mb-3">
        {isMoving ? 'Выберите новый дом и квартиру для переселения' : 'Выберите дом и квартиру'}
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {buildings.map((b) => (
          <button
            key={b.code}
            type="button"
            onClick={() => handleSelectBuilding(b.code)}
            className={`px-3 py-2 text-sm rounded-xl border ${
              selectedBuilding === b.code
                ? 'bg-sky-600 text-white border-sky-500'
                : 'btn-secondary px-3 py-2 text-sm'
            }`}
          >
            {b.code}
          </button>
        ))}
      </div>
      {selectedBuilding && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
          {apartments.map((apt) => (
            <button
              key={apt.id}
              type="button"
              onClick={() => handleJoinApartment(apt.id)}
              disabled={apt.current_residents >= apt.max_residents}
              className="px-2 py-2 text-xs rounded-lg list-item-shell hover:border-sky-400 text-slate-800 dark:text-gray-100 flex flex-col disabled:opacity-40"
            >
              <span className="font-semibold">№{apt.number}</span>
              <span className="text-[10px] text-gray-300">
                {apt.current_residents}/{apt.max_residents}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (user?.is_admin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="page-shell min-h-screen flex flex-col">
      <HeaderDashBoard />

      <AppContainer as="main" className="flex-1 mt-2 sm:mt-4 pb-8 lg:pb-12">
        <nav
          className="app-tabs mb-5 md:mb-6 lg:mb-8 md:justify-center lg:justify-start overflow-x-auto"
          aria-label="Разделы панели"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`app-tabs-btn ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-sm font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'cleaning' &&
          (myApartment ? (
            <ContentDashboard />
          ) : (
            <div className="card-shell p-8 text-center mb-10">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Сначала выберите квартиру во вкладке «Квартира».
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('housing')}
                className="px-4 py-2 text-sm rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
              >
                Перейти к выбору квартиры
              </button>
            </div>
          ))}

        {activeTab === 'rating' && (
          <div className="card-shell p-4 sm:p-6 lg:p-8 max-w-4xl xl:max-w-5xl mx-auto w-full">
            <p className="text-base lg:text-lg font-medium text-heading mb-5 lg:mb-6 text-center">
              Рейтинг уборок
            </p>
            <Leaderboard />
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="card-shell p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
            <p className="text-base lg:text-lg font-medium text-heading mb-2 text-center">
              Администрация Каллисто
            </p>
            <p className="text-sm text-muted text-center mb-6">
              Список администраторов — можно открыть профиль каждого.
            </p>
            <CallistoAdminsTab />
          </div>
        )}

        {activeTab === 'housing' && (
          <div className="space-y-5 md:space-y-6 lg:space-y-8 pb-4">
            <details className="card-shell p-4 lg:p-5 group">
              <summary className="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer list-none flex justify-between">
                Поиск дома и квартиры
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <HousingSearch />
              </div>
            </details>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6 lg:gap-8 items-start">
            <div className="card-shell p-4 sm:p-5 lg:p-6">
            {isLoadingApartment ? (
              <p className="text-sm text-slate-500 animate-pulse">Загружаем квартиру...</p>
            ) : myApartment ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ApartmentBadge
                      buildingCode={myApartment.building_code}
                      apartmentNumber={myApartment.number}
                      size="md"
                      frameCode={myApartment.equipped_frame_code}
                      avatarUrl={myApartment.avatar_url}
                    />
                    <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ваша квартира</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      Дом {myApartment.building_code}, кв. {myApartment.number}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Жильцов: {myApartment.current_residents}/{myApartment.max_residents}
                      {myApartment.total_cleanings != null && (
                        <> · {myApartment.total_cleanings} уборок квартиры</>
                      )}
                      {user?.apartment?.role === 'manager' && ' · ответственный за уборку'}
                    </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startSelectApartment(true)}
                      className="px-3 py-2 text-sm rounded-xl bg-sky-600 hover:bg-sky-700"
                    >
                      Переселиться
                    </button>
                    <button
                      type="button"
                      onClick={handleLeaveApartment}
                      className="px-3 py-2 text-sm rounded-xl border border-red-500/50 text-red-300 hover:bg-red-500/10"
                    >
                      Покинуть
                    </button>
                  </div>
                </div>
                {showApartmentPicker && renderApartmentSelector()}
                <ApartmentAvatarUpload
                  apartment={{
                    building_code: myApartment.building_code,
                    number: myApartment.number,
                    avatar_url: myApartment.avatar_url,
                    equipped_frame_code: myApartment.equipped_frame_code,
                  }}
                  onUpdated={loadMyApartment}
                />
                <ApartmentDescription
                  apartmentId={myApartment.id}
                  description={myApartment.description}
                  onUpdated={loadMyApartment}
                />
                <div className="mt-4">
                  <ApartmentInspections apartmentId={myApartment.id} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  <Link to={`/apartments/${myApartment.id}`} className="text-sky-600 hover:underline">
                    Страница квартиры для шаринга
                  </Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Выберите квартиру для участия в расписании уборки.
                </p>
                <button
                  type="button"
                  onClick={() => startSelectApartment(false)}
                  className="px-4 py-2 text-sm rounded-xl bg-sky-600 hover:bg-sky-700"
                >
                  Выбрать квартиру
                </button>
                {(showApartmentPicker || !buildings.length) && renderApartmentSelector()}
              </>
            )}
            </div>

            {myApartment && (
              <div className="card-shell p-4 sm:p-5 lg:p-6 xl:sticky xl:top-4">
                <p className="text-sm lg:text-base font-medium text-heading mb-3 lg:mb-4">Жильцы</p>
                {isLoadingMembers ? (
                  <p className="text-sm text-muted animate-pulse">Загрузка...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3">
                    {members.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                      >
                        <Link
                          to={`/profile/${m.user_id}`}
                          className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-90"
                        >
                          <UserAvatar
                            avatarUrl={m.avatar_url}
                            name={displayName(m)}
                            size="sm"
                            frameCode={m.equipped_frame_code}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                              {displayName(m)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {m.role === 'manager' ? 'Ответственный' : 'Житель'}
                              {m.user_id === user?.id && ' (вы)'}
                            </p>
                          </div>
                        </Link>
                        {isManager && m.user_id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.user_id, m.username)}
                            className="text-[11px] text-red-500 dark:text-red-300 hover:text-red-400"
                          >
                            Исключить
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isManager && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Настройка задач</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Стандартные наборы или свои шаблоны для чек-листа.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {CLEANING_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!useDefaultTasks}
                      onClick={() => changeCleaningMode(m.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg border ${
                        cleaningMode === m.id && useDefaultTasks
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sky-500 disabled:opacity-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={toggleUseDefaultTasks}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-sky-500 ml-auto"
                  >
                    {useDefaultTasks ? 'Режим: стандартные' : 'Режим: свои шаблоны'}
                  </button>
                </div>

                {!useDefaultTasks && (
                  <>
                    <form
                      onSubmit={handleCreateTemplate}
                      className="grid grid-cols-1 md:grid-cols-[2fr,3fr,auto] gap-2 mb-4"
                    >
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-sky-500"
                        placeholder="Название задачи"
                        required
                      />
                      <input
                        type="text"
                        value={newTemplateDescription}
                        onChange={(e) => setNewTemplateDescription(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-sky-500"
                        placeholder="Описание (необязательно)"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-sky-600 hover:bg-sky-700 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Добавить
                      </button>
                    </form>

                    {isLoadingTemplates ? (
                      <p className="text-sm text-slate-500">Загрузка шаблонов...</p>
                    ) : templates.length === 0 ? (
                      <p className="text-sm text-slate-500">Добавьте свои задачи для чек-листа.</p>
                    ) : (
                      <ul className="space-y-2">
                        {templates.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800"
                          >
                            <div>
                              <p className="text-sm text-slate-900 dark:text-white">{t.name}</p>
                              {t.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="text-[11px] text-red-500 dark:text-red-300"
                            >
                              Удалить
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                  </div>
                )}
              </div>
            )}

            </div>
          </div>
        )}
      </AppContainer>
    </div>
  );
}
