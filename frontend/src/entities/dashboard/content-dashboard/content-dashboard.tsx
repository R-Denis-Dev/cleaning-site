import toast from 'react-hot-toast';
import { useCallback, useEffect, useState } from 'react';

import api from '@/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import { WEEKDAYS } from '@/utils/constants';
import { getApiErrorMessage } from '@/utils/apiError';

import { Schedule, Task, TaskListPayload } from '../types/dashboard';
import { CleaningHistory } from '@/components/CleaningHistory';
import { ReminderBanner } from '@/components/ReminderBanner';
import { SwapRequests } from '@/components/SwapRequests';

import { DaysDashboard } from './days-dashboard';
import { TasksDashboard } from './tasks-dashboard';

export const ContentDashboard = () => {
  const { user, setUser } = useAuth();
  const currentUsername = user?.username;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState(0);
  const [canToggle, setCanToggle] = useState(false);
  const [isMyCleaningDay, setIsMyCleaningDay] = useState(false);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [weeklyLimit, setWeeklyLimit] = useState(2);
  const [weeklyRemaining, setWeeklyRemaining] = useState(2);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [swapListKey, setSwapListKey] = useState(0);

  const loadSchedules = useCallback(async () => {
    const res = await api.get<Schedule[]>('/schedules/');
    setSchedules(res.data);
    return res.data;
  }, []);

  const loadTasksForDay = useCallback(async (dayIndex: number) => {
    setLoadingTasks(true);
    try {
      const res = await api.get<TaskListPayload>(`/tasks/${dayIndex}`);
      setTasks(res.data.tasks);
      setProgress(res.data.progress_percent);
      setCanToggle(res.data.can_toggle ?? false);
      setIsMyCleaningDay(res.data.is_my_cleaning_day_today ?? false);
      setWeeklyUsed(res.data.weekly_cleanings_used ?? 0);
      setWeeklyLimit(res.data.weekly_cleanings_limit ?? 2);
      setWeeklyRemaining(res.data.weekly_cleanings_remaining ?? 2);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить задачи'));
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('access_token')) {
        setLoading(false);
        return;
      }
      try {
        const data = await loadSchedules();
        const myDay = data.find((s) => s.is_taken && s.username === currentUsername);
        const today = data.find((s) => s.is_today);
        const dayToOpen = myDay?.day_of_week ?? today?.day_of_week ?? null;
        if (dayToOpen !== null) {
          setSelectedDayIndex(dayToOpen);
          await loadTasksForDay(dayToOpen);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось загрузить расписание'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadSchedules, loadTasksForDay, currentUsername]);

  useEffect(() => {
    const onFocus = () => {
      if (selectedDayIndex !== null) {
        loadTasksForDay(selectedDayIndex);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [selectedDayIndex, loadTasksForDay]);

  const toggleTask = async (taskId: number) => {
    try {
      await api.post(`/tasks/${taskId}/toggle`);
      if (selectedDayIndex !== null) {
        await loadTasksForDay(selectedDayIndex);
        const me = await api.get('/users/me');
        setUser(me.data);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить задачу'));
    }
  };

  const addTask = async (name: string) => {
    if (selectedDayIndex === null) return;
    try {
      await api.post(`/tasks/day/${selectedDayIndex}/custom`, { name });
      await loadTasksForDay(selectedDayIndex);
      toast.success('Задача добавлена для всей квартиры');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось добавить задачу'));
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm('Удалить эту задачу?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (selectedDayIndex !== null) {
        await loadTasksForDay(selectedDayIndex);
      }
      toast.success('Задача удалена');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить задачу'));
    }
  };

  const takeDay = async (scheduleId: number) => {
    try {
      await api.post(`/schedules/${scheduleId}/take`);
      const data = await loadSchedules();
      const taken = data.find((s) => s.id === scheduleId);
      if (taken) {
        setSelectedDayIndex(taken.day_of_week);
        await loadTasksForDay(taken.day_of_week);
      }
      toast.success('День закреплён — можно отмечать задачи');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось занять день'));
    }
  };

  const requestSwap = async (
    myScheduleId: number,
    theirScheduleId: number,
    targetUserId: number,
  ) => {
    try {
      await api.post('/extras/swap-requests', {
        target_user_id: targetUserId,
        my_schedule_id: myScheduleId,
        target_schedule_id: theirScheduleId,
      });
      toast.success('Запрос на обмен отправлен');
      setSwapListKey((k) => k + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить запрос'));
    }
  };

  const releaseDay = async (scheduleId: number) => {
    try {
      await api.post(`/schedules/${scheduleId}/release`);
      await loadSchedules();
      if (selectedDayIndex !== null) {
        await loadTasksForDay(selectedDayIndex);
      }
      toast.success('День освобождён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось освободить день'));
    }
  };

  const handleDayClick = async (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    await loadTasksForDay(dayIndex);
  };

  if (loading) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 pb-6 animate-pulse lg:grid-cols-2 lg:gap-8 lg:pb-10">
        <div className="flex flex-col gap-4">
          <div className="h-36 rounded-2xl bg-slate-200 dark:bg-white/5 lg:h-40" />
          <div className="h-40 flex-1 rounded-2xl bg-slate-200 dark:bg-white/5" />
        </div>
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-white/5 lg:min-h-[320px]" />
      </div>
    );
  }

  return (
    <div className="w-full pb-6 lg:pb-10">
      <ReminderBanner />
      <SwapRequests refreshKey={swapListKey} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-stretch">
        <div className="flex min-h-0 flex-col gap-4 md:gap-5 lg:gap-6">
          <DaysDashboard
            days={[...WEEKDAYS]}
            schedules={schedules}
            selectedDayIndex={selectedDayIndex}
            onDayClick={handleDayClick}
            onTakeDay={takeDay}
            onReleaseDay={releaseDay}
            onRequestSwap={requestSwap}
            currentUsername={currentUsername}
          />
          {!user?.is_admin && (
            <CleaningHistory className="flex-1 min-h-[200px] lg:min-h-0" />
          )}
        </div>

        <div className="flex min-h-0 flex-col lg:min-h-full">
          <TasksDashboard
            tasks={tasks}
            loadingTasks={loadingTasks}
            selectedDayIndex={selectedDayIndex}
            days={[...WEEKDAYS]}
            progress={progress}
            canToggle={canToggle}
            isMyCleaningDay={isMyCleaningDay}
            onToggleTask={toggleTask}
            onAddTask={addTask}
            onDeleteTask={deleteTask}
            weeklyUsed={weeklyUsed}
            weeklyLimit={weeklyLimit}
            weeklyRemaining={weeklyRemaining}
          />
        </div>
      </div>
    </div>
  );
};
