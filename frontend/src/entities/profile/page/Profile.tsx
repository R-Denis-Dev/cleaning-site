import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { AdminHeader } from '@/components/AdminHeader';
import { AppContainer } from '@/components/layout/AppContainer';
import { useAuth } from '@/app/contexts/AuthContext';
import { WEEKDAYS } from '@/utils/constants';
import { getApiErrorMessage } from '@/utils/apiError';
import { ProfileSettings } from '../components/ProfileSettings';
import { ContentProfile } from '../content-profile/content-profile';
import { HeaderProfile } from './components/header-profile';
import { Schedule, Task, TaskListPayload } from '../types/profile';

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [canToggle, setCanToggle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const myDayIndex = useMemo(() => {
    if (!user) return null;
    const mySchedule = schedules.find(
      (s) => s.is_taken && s.username && s.username === user.username,
    );
    return mySchedule ? mySchedule.day_of_week : null;
  }, [schedules, user]);

  const loadSchedules = async () => {
    const res = await api.get<Schedule[]>('/schedules/');
    setSchedules(res.data);
  };

  const loadTasksForDay = async (dayIndex: number) => {
    setLoadingTasks(true);
    try {
      const res = await api.get<TaskListPayload>(`/tasks/${dayIndex}`);
      setTasks(res.data.tasks);
      setCanToggle(res.data.can_toggle ?? false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить задачи'));
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!localStorage.getItem('access_token')) {
        setLoading(false);
        return;
      }
      if (user?.is_admin) {
        setLoading(false);
        return;
      }
      try {
        await loadSchedules();
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось загрузить профиль'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.is_admin]);

  useEffect(() => {
    if (myDayIndex === null) {
      setTasks([]);
      return;
    }
    loadTasksForDay(myDayIndex);
  }, [myDayIndex]);

  const toggleTask = async (taskId: number) => {
    try {
      await api.post(`/tasks/${taskId}/toggle`);
      if (myDayIndex !== null) {
        await loadTasksForDay(myDayIndex);
        const me = await api.get('/users/me');
        setUser(me.data);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить задачу'));
    }
  };

  if (loading || !user) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="text-muted text-xl animate-pulse">Загружаем профиль...</div>
      </div>
    );
  }

  const isAdmin = user.is_admin;

  return (
    <div className="page-shell min-h-screen flex flex-col">
      {isAdmin && <AdminHeader />}
      <AppContainer className="py-6 md:py-8 lg:py-10 flex-1">
        <button
          type="button"
          onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
          className="mb-6 inline-flex items-center text-sm text-muted hover:text-heading"
        >
          ← {isAdmin ? 'К админ-панели' : 'Назад к панели'}
        </button>

        <div className="card-shell p-5 sm:p-6 md:p-8 lg:p-10 max-w-3xl mx-auto">
          <HeaderProfile user={user} myDayIndex={myDayIndex} tasks={tasks} days={[...WEEKDAYS]} />

          {!isAdmin && (
            <ContentProfile
              myDayIndex={myDayIndex}
              schedules={schedules}
              loadingTasks={loadingTasks}
              tasks={tasks}
              days={[...WEEKDAYS]}
              canToggle={canToggle}
              onToggleTask={toggleTask}
            />
          )}

          <ProfileSettings />
        </div>
      </AppContainer>
    </div>
  );
}
