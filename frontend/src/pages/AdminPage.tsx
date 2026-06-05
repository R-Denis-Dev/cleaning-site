import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { AdminApartmentPicker, AptOverview } from '@/components/admin/AdminApartmentPicker';
import { AdminHeader } from '@/components/AdminHeader';
import { ModalPortal } from '@/components/ModalPortal';
import { UserAvatar } from '@/components/UserAvatar';
import { AnnouncementDetail, AnnouncementDetailModal } from '@/components/AnnouncementDetailModal';
import { AppContainer } from '@/components/layout/AppContainer';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminUserDetail } from '@/types/user';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

type Tab = 'residents' | 'apartments' | 'announcements';

type Inspection = {
  id: number;
  apartment_id: number;
  building_code: string;
  apartment_number: number;
  status: string;
  notes?: string | null;
  violations: { id: number; category: string; score?: number | null; comment?: string | null }[];
};

type AptMember = {
  user_id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  total_cleanings: number;
  is_admin: boolean;
  is_blocked: boolean;
  equipped_frame_code?: string | null;
  admin_frame_color?: string | null;
  admin_frame_style?: string | null;
};

type UserStats = {
  user: AdminUserDetail;
  is_blocked: boolean;
  bonus_tasks_this_week: { id: number; title: string; description?: string | null }[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'residents', label: 'Жители Каллисто' },
  { id: 'apartments', label: 'Квартиры' },
  { id: 'announcements', label: 'Мероприятия' },
];

export default function AdminPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('residents');

  const [residentQ, setResidentQ] = useState('');
  const [residents, setResidents] = useState<AdminUserDetail[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [bonusTitle, setBonusTitle] = useState('');
  const [bonusDescription, setBonusDescription] = useState('');

  const [selectedApt, setSelectedApt] = useState<AptOverview | null>(null);
  const [aptMembers, setAptMembers] = useState<AptMember[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violationCategory, setViolationCategory] = useState('ПХД');
  const [violationScore, setViolationScore] = useState('');
  const [violationComment, setViolationComment] = useState('');
  const [activeInspectionId, setActiveInspectionId] = useState<number | null>(null);

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annEventAt, setAnnEventAt] = useState('');
  const [annImage, setAnnImage] = useState<File | null>(null);
  const [publishedAnnouncements, setPublishedAnnouncements] = useState<AnnouncementDetail[]>([]);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [ratingInput, setRatingInput] = useState('');

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user && !user.is_admin) navigate('/dashboard');
  }, [user, navigate]);

  const loadResidents = useCallback(async () => {
    setLoadingResidents(true);
    try {
      const res = await api.get<AdminUserDetail[]>('/admin/residents', {
        params: { q: residentQ || undefined, limit: 200 },
      });
      setResidents(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить жителей'));
    } finally {
      setLoadingResidents(false);
    }
  }, [residentQ]);

  useEffect(() => {
    if (user?.is_admin && tab === 'residents') loadResidents();
  }, [user?.is_admin, tab, loadResidents]);

  const activeAdmins = residents.filter((u) => u.is_admin && !u.is_blocked);
  const activeResidents = residents.filter((u) => !u.is_admin && !u.is_blocked);
  const blockedResidents = residents.filter((u) => u.is_blocked);

  const selectApartment = async (apt: AptOverview) => {
    setSelectedApt(apt);
    setActiveInspectionId(null);
    try {
      const [membersRes, inspRes] = await Promise.all([
        api.get<AptMember[]>(`/admin/apartments/${apt.id}/members`),
        api.get<Inspection[]>('/admin/inspections', { params: { apartment_id: apt.id } }),
      ]);
      setAptMembers(membersRes.data);
      setInspections(inspRes.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить квартиру'));
    }
  };

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await api.get<AnnouncementDetail[]>('/announcements', { params: { limit: 50 } });
      setPublishedAnnouncements(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin && tab === 'announcements') loadAnnouncements();
  }, [user?.is_admin, tab, loadAnnouncements]);

  const openUserStats = async (u: AdminUserDetail) => {
    setSelectedUser(u);
    setRatingInput(String(u.total_cleanings));
    try {
      const res = await api.get<UserStats>(`/admin/users/${u.id}/stats`);
      setUserStats(res.data);
      setRatingInput(String(res.data.user.total_cleanings));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить статистику'));
    }
  };

  const saveUserRating = async () => {
    if (!selectedUser) return;
    const value = Number(ratingInput);
    if (Number.isNaN(value) || value < 0) {
      toast.error('Введите корректное число уборок');
      return;
    }
    try {
      await api.patch(`/admin/users/${selectedUser.id}/rating`, { total_cleanings: value });
      toast.success('Рейтинг обновлён');
      loadResidents();
      const statsRes = await api.get<UserStats>(`/admin/users/${selectedUser.id}/stats`);
      setUserStats(statsRes.data);
      setRatingInput(String(statsRes.data.user.total_cleanings));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить рейтинг'));
    }
  };

  const deleteViolation = async (violationId: number) => {
    if (!confirm('Удалить это замечание?')) return;
    try {
      await api.delete(`/admin/violations/${violationId}`);
      toast.success('Замечание удалено');
      if (selectedApt) selectApartment(selectedApt);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить'));
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!confirm('Удалить мероприятие? Уведомление исчезнет у всех.')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Мероприятие удалено');
      loadAnnouncements();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить'));
    }
  };

  const blockUser = async (userId: number) => {
    if (!confirm('Заблокировать участника? Он будет исключён из квартиры, профиль очистится.')) return;
    try {
      await api.post(`/admin/users/${userId}/block`);
      toast.success('Участник заблокирован');
      loadResidents();
      if (selectedApt) selectApartment(selectedApt);
      if (selectedUser?.id === userId) setSelectedUser(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось заблокировать'));
    }
  };

  const kickFromApt = async (userId: number) => {
    if (!selectedApt || !confirm('Исключить из квартиры?')) return;
    try {
      await api.delete(`/admin/apartments/${selectedApt.id}/members/${userId}`);
      toast.success('Исключён из квартиры');
      selectApartment(selectedApt);
      loadResidents();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ошибка'));
    }
  };

  const setManager = async (userId: number) => {
    if (!selectedApt) return;
    try {
      await api.post(`/admin/apartments/${selectedApt.id}/manager/${userId}`);
      toast.success('Ответственный назначен');
      selectApartment(selectedApt);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ошибка'));
    }
  };

  const unblockUser = async (userId: number) => {
    try {
      await api.post(`/admin/users/${userId}/unblock`);
      toast.success('Участник разблокирован');
      loadResidents();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось разблокировать'));
    }
  };

  const deleteBonusTask = async (bonusId: number) => {
    if (!confirm('Удалить доп. задание у пользователя?')) return;
    try {
      await api.delete(`/admin/bonus-tasks/${bonusId}`);
      toast.success('Доп. задание удалено');
      if (selectedUser) openUserStats(selectedUser);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить задание'));
    }
  };

  const addBonusTask = async () => {
    if (!selectedUser || !bonusTitle.trim()) return;
    try {
      await api.post(`/admin/users/${selectedUser.id}/bonus-tasks`, {
        title: bonusTitle.trim(),
        description: bonusDescription.trim() || null,
      });
      toast.success('Доп. задание назначено');
      setBonusTitle('');
      setBonusDescription('');
      openUserStats(selectedUser);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ошибка'));
    }
  };

  const createInspection = async () => {
    if (!selectedApt) return;
    try {
      const res = await api.post<Inspection>('/admin/inspections', { apartment_id: selectedApt.id });
      setInspections((prev) => [res.data, ...prev]);
      setActiveInspectionId(res.data.id);
      toast.success('Проверка назначена');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось создать проверку'));
    }
  };

  const deleteInspection = async (inspectionId: number) => {
    if (!confirm('Удалить назначенную проверку? Все замечания по ней тоже будут удалены.')) return;
    try {
      await api.delete(`/admin/inspections/${inspectionId}`);
      setInspections((prev) => prev.filter((i) => i.id !== inspectionId));
      if (activeInspectionId === inspectionId) {
        setActiveInspectionId(null);
      }
      toast.success('Проверка удалена');
      if (selectedApt) selectApartment(selectedApt);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить проверку'));
    }
  };

  const addViolation = async () => {
    if (!activeInspectionId) {
      toast.error('Выберите проверку');
      return;
    }
    try {
      await api.post(`/admin/inspections/${activeInspectionId}/violations`, {
        category: violationCategory,
        score: violationScore ? Number(violationScore) : null,
        comment: violationComment || null,
      });
      if (selectedApt) selectApartment(selectedApt);
      toast.success('Нарушение записано');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось записать нарушение'));
    }
  };

  const publishAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      toast.error('Заполните заголовок и текст');
      return;
    }
    try {
      const form = new FormData();
      form.append('title', annTitle.trim());
      form.append('body', annBody.trim());
      if (annEventAt) form.append('event_at', new Date(annEventAt).toISOString());
      if (annImage) form.append('image', annImage);
      await api.post('/announcements', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Мероприятие опубликовано');
      setAnnTitle('');
      setAnnBody('');
      setAnnEventAt('');
      setAnnImage(null);
      loadAnnouncements();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось опубликовать'));
    }
  };

  if (!user?.is_admin) return null;

  return (
    <div className="page-shell min-h-screen flex flex-col">
      <AdminHeader />
      <AppContainer className="py-6 md:py-8 lg:py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <span className="badge-soft mb-2">Каллисто · Администрация</span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-heading">
              Админ-панель
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/v1/reports/admin/cleaning-export"
              className="btn-secondary px-3 py-2 text-sm"
              onClick={(e) => {
                const token = localStorage.getItem('access_token');
                if (token) {
                  e.preventDefault();
                  fetch('/api/v1/reports/admin/cleaning-export', {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((r) => r.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'cleaning_history.csv';
                      a.click();
                    })
                    .catch(() => toast.error('Не удалось скачать CSV'));
                }
              }}
            >
              CSV уборок
            </a>
            <span className="text-sm text-muted py-2 hidden sm:inline">Управление Каллисто</span>
          </div>
        </div>

        <div className="app-tabs mb-6 w-full max-w-2xl">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`app-tabs-btn ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-700 text-heading shadow-sm'
                  : 'text-muted hover:text-body'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'residents' && (
          <section className="card-shell p-5">
            <h2 className="section-title mb-3">Участники Каллисто</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                value={residentQ}
                onChange={(e) => setResidentQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadResidents()}
                placeholder="Поиск по ФИО, логину, email"
                className="input-field flex-1 min-w-[200px]"
              />
              <button type="button" onClick={loadResidents} className="btn-primary px-4 py-2 text-sm">
                {loadingResidents ? 'Загрузка…' : 'Найти'}
              </button>
            </div>

            {activeAdmins.length > 0 && (
              <div className="mb-6 pb-6 border-b border-amber-200/60 dark:border-amber-800/50">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
                  Администраторы Каллисто ({activeAdmins.length})
                </h3>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {activeAdmins.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20"
                    >
                      <UserAvatar
                        avatarUrl={u.avatar_url}
                        name={displayName(u)}
                        size="sm"
                        isAdmin
                        adminFrameColor={u.admin_frame_color}
                        frameCode={null}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-body">{displayName(u)}</p>
                        <p className="text-xs text-muted truncate">
                          @{u.username} · {u.email}
                          <span className="text-amber-700 dark:text-amber-300"> · администратор</span>
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openUserStats(u)}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Управление
                        </button>
                        <Link to={`/profile/${u.id}`} className="btn-secondary text-xs px-2 py-1">
                          Профиль
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h3 className="text-sm font-semibold text-body mb-3">
              Жители ({activeResidents.length})
            </h3>
            <ul className="space-y-2 max-h-[24rem] overflow-y-auto">
              {activeResidents.length === 0 ? (
                <li className="text-sm text-muted py-6 text-center">Жители не найдены</li>
              ) : (
                activeResidents.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-xl list-item-shell"
                  >
                    <UserAvatar
                      avatarUrl={u.avatar_url}
                      name={displayName(u)}
                      size="sm"
                      isAdmin={false}
                      adminFrameColor={u.admin_frame_color}
                      frameCode={u.equipped_frame_code}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-body">{displayName(u)}</p>
                      <p className="text-xs text-muted truncate">
                        @{u.username} · {u.email}
                        {u.apartment &&
                          ` · ${u.apartment.building_code}-${u.apartment.apartment_number}`}
                        {` · ${u.total_cleanings} уборок`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openUserStats(u)}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        Управление
                      </button>
                      <Link to={`/profile/${u.id}`} className="btn-secondary text-xs px-2 py-1">
                        Профиль
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {blockedResidents.length > 0 && (
              <div className="mt-6 pt-6 border-t border-rose-200/60 dark:border-rose-900/50">
                <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-3">
                  Заблокированные участники ({blockedResidents.length})
                </h3>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {blockedResidents.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-rose-200/50 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20"
                    >
                      <UserAvatar
                        avatarUrl={u.avatar_url}
                        name={displayName(u)}
                        size="sm"
                        isAdmin={u.is_admin}
                        adminFrameColor={u.admin_frame_color}
                        frameCode={u.is_admin ? null : u.equipped_frame_code}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-body truncate">{displayName(u)}</p>
                        <p className="text-xs text-muted truncate">@{u.username}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unblockUser(u.id)}
                        className="text-xs btn-secondary px-2 py-1 shrink-0"
                      >
                        Разблокировать
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === 'apartments' && (
          <section className="card-shell p-5 space-y-6">
            <h2 className="section-title">Квартиры и нарушения</h2>
            <AdminApartmentPicker
              selectedId={selectedApt?.id ?? null}
              onSelect={(apt) => selectApartment(apt)}
            />

            {selectedApt && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <p className="text-sm text-body">
                  <strong className="text-heading">
                    {selectedApt.building_code}, кв. {selectedApt.number}
                  </strong>
                  {selectedApt.manager_username && (
                    <span className="text-muted"> · ответственный: {selectedApt.manager_username}</span>
                  )}
                </p>

                <div>
                  <p className="text-xs text-muted mb-2">Жильцы</p>
                  <ul className="space-y-2">
                    {aptMembers.map((m) => (
                      <li
                        key={m.user_id}
                        className="flex items-center gap-2 p-2 rounded-lg list-item-shell"
                      >
                        <UserAvatar
                          avatarUrl={m.avatar_url}
                          name={m.display_name || m.username}
                          size="sm"
                          isAdmin={m.is_admin}
                          adminFrameColor={m.admin_frame_color}
                          frameCode={m.is_admin ? null : m.equipped_frame_code}
                        />
                        <span className="text-sm text-body flex-1">
                          {m.display_name || m.username}
                          {m.role === 'manager' && ' · ответственный'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setManager(m.user_id)}
                          className="text-xs btn-secondary px-2 py-1"
                        >
                          Сделать ответственным
                        </button>
                        <button
                          type="button"
                          onClick={() => kickFromApt(m.user_id)}
                          className="text-xs text-rose-600 px-2 py-1"
                        >
                          Исключить
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={createInspection}
                  className="px-4 py-2 text-sm rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  Назначить проверку
                </button>

                {inspections.length > 0 && (
                  <ul className="space-y-1">
                    {inspections.map((insp) => (
                      <li
                        key={insp.id}
                        className={`flex items-center gap-2 rounded-lg border text-sm ${
                          activeInspectionId === insp.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                            : 'list-item-shell'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveInspectionId(insp.id)}
                          className="flex-1 text-left px-3 py-2 min-w-0"
                        >
                          #{insp.id} · {insp.status} · {insp.violations.length} наруш.
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteInspection(insp.id)}
                          className="shrink-0 px-2 py-2 text-xs text-rose-600 hover:underline"
                          title="Удалить проверку"
                        >
                          Удалить
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={violationCategory}
                    onChange={(e) => setViolationCategory(e.target.value)}
                    placeholder="Категория"
                    className="input-field"
                  />
                  <input
                    value={violationScore}
                    onChange={(e) => setViolationScore(e.target.value)}
                    placeholder="Баллы"
                    type="number"
                    className="input-field"
                  />
                  <input
                    value={violationComment}
                    onChange={(e) => setViolationComment(e.target.value)}
                    placeholder="Комментарий"
                    className="input-field"
                  />
                </div>
                <button
                  type="button"
                  onClick={addViolation}
                  className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white font-medium"
                >
                  Записать нарушение
                </button>

                {inspections.some((i) => i.violations.length > 0) && (
                  <ul className="mt-4 space-y-2">
                    <p className="text-xs text-muted">Замечания (нарушения):</p>
                    {inspections.flatMap((insp) =>
                      insp.violations.map((v) => (
                        <li
                          key={v.id}
                          className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg violation-badge"
                        >
                          <span className="text-sm">
                            {insp.building_code}-{insp.apartment_number}: {v.category}
                            {v.score != null && ` — ${v.score} б.`}
                            {v.comment && ` (${v.comment})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteViolation(v.id)}
                            className="text-xs text-rose-600 shrink-0 hover:underline"
                          >
                            Удалить
                          </button>
                        </li>
                      )),
                    )}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {tab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card-shell p-5">
              <h2 className="section-title mb-3">Новое мероприятие</h2>
              <p className="text-sm text-muted mb-4">
                Сверху — картинка, ниже название, описание и дата. Все получат уведомление.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Изображение (необязательно)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="input-field text-sm"
                    onChange={(e) => setAnnImage(e.target.files?.[0] ?? null)}
                  />
                </div>
                <input
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Название мероприятия"
                  className="input-field"
                />
                <textarea
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Описание"
                  rows={5}
                  className="input-field"
                />
                <div>
                  <label className="text-xs text-muted block mb-1">Дата и время</label>
                  <input
                    type="datetime-local"
                    value={annEventAt}
                    onChange={(e) => setAnnEventAt(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button type="button" onClick={publishAnnouncement} className="btn-primary w-full py-2">
                  Опубликовать
                </button>
              </div>
            </section>

            <section className="card-shell p-5">
              <h2 className="section-title mb-3">Опубликованные</h2>
              {publishedAnnouncements.length === 0 ? (
                <p className="text-sm text-muted">Пока нет мероприятий</p>
              ) : (
                <ul className="space-y-2 max-h-[32rem] overflow-y-auto">
                  {publishedAnnouncements.map((a) => (
                    <li key={a.id} className="list-item-shell p-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewAnnouncement(a)}
                        className="text-left text-sm font-medium text-heading hover:text-sky-600"
                      >
                        {a.title}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewAnnouncement(a)}
                          className="text-xs btn-secondary px-2 py-1"
                        >
                          Просмотр
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(a.id)}
                          className="text-xs text-rose-600 px-2 py-1"
                        >
                          Удалить
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </AppContainer>

      <AnnouncementDetailModal
        item={previewAnnouncement}
        onClose={() => setPreviewAnnouncement(null)}
      />

      {selectedUser && userStats && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              aria-label="Закрыть"
              onClick={() => setSelectedUser(null)}
            />
            <div className="relative z-10 card-shell max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={userStats.user.avatar_url}
                name={displayName(userStats.user)}
                isAdmin={userStats.user.is_admin}
                adminFrameColor={userStats.user.admin_frame_color}
                frameCode={
                  userStats.user.is_admin ? null : userStats.user.equipped_frame_code
                }
              />
              <div>
                <h3 className="font-semibold text-heading">{displayName(userStats.user)}</h3>
                <p className="text-xs text-muted">@{userStats.user.username}</p>
              </div>
            </div>
            {userStats.user.apartment && (
              <p className="text-sm text-body">
                {userStats.user.apartment.building_code}-
                {userStats.user.apartment.apartment_number}
              </p>
            )}
            {!userStats.user.is_admin && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-muted block mb-1">Рейтинг (уборок)</label>
                  <input
                    type="number"
                    min={0}
                    value={ratingInput}
                    onChange={(e) => setRatingInput(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button type="button" onClick={saveUserRating} className="btn-primary px-4 py-2 text-sm">
                  Сохранить рейтинг
                </button>
              </div>
            )}
            {userStats.bonus_tasks_this_week.length > 0 && (
              <ul className="text-sm space-y-1">
                <p className="text-xs text-muted">Доп. задания на неделю:</p>
                {userStats.bonus_tasks_this_week.map((t) => (
                  <li
                    key={t.id}
                    className="list-item-shell px-2 py-1 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{t.title}</span>
                    <button
                      type="button"
                      onClick={() => deleteBonusTask(t.id)}
                      className="text-xs text-rose-600 shrink-0 hover:underline"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              value={bonusTitle}
              onChange={(e) => setBonusTitle(e.target.value)}
              placeholder="Название доп. задания"
              className="input-field"
            />
            <textarea
              value={bonusDescription}
              onChange={(e) => setBonusDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              rows={3}
              className="input-field resize-none"
            />
            <button type="button" onClick={addBonusTask} className="btn-primary w-full py-2 text-sm">
              Назначить доп. задание
            </button>
            {!userStats.is_blocked && userStats.user.id !== user?.id && (
              <button
                type="button"
                onClick={() => blockUser(userStats.user.id)}
                className="w-full py-2 text-sm rounded-xl border border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                Заблокировать участника
              </button>
            )}
            <button type="button" onClick={() => setSelectedUser(null)} className="btn-secondary w-full py-2">
              Закрыть
            </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
