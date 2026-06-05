import { useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { TaskComments } from '@/components/TaskComments';
import { getApiErrorMessage } from '@/utils/apiError';

import { Task } from '../types/dashboard';

interface TasksDashboardProps {
  tasks: Task[];
  loadingTasks: boolean;
  selectedDayIndex: number | null;
  days: string[];
  progress: number;
  canToggle: boolean;
  isMyCleaningDay: boolean;
  weeklyUsed: number;
  weeklyLimit: number;
  weeklyRemaining: number;
  onToggleTask: (taskId: number) => void;
  onAddTask: (name: string) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

export const TasksDashboard = ({
  tasks,
  loadingTasks,
  selectedDayIndex,
  days,
  progress,
  canToggle,
  isMyCleaningDay,
  weeklyUsed,
  weeklyLimit,
  weeklyRemaining,
  onToggleTask,
  onAddTask,
  onDeleteTask,
}: TasksDashboardProps) => {
  const [newTaskName, setNewTaskName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    setAdding(true);
    try {
      await onAddTask(newTaskName.trim());
      setNewTaskName('');
    } finally {
      setAdding(false);
    }
  };

  if (selectedDayIndex === null) {
    return (
      <div className="card-shell p-6">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="text-2xl">📋</span>
          <p className="text-sm">Выберите день недели, чтобы открыть чек-лист.</p>
        </div>
      </div>
    );
  }

  return (
        <div className="card-shell p-4 sm:p-5 md:p-6 lg:p-8 h-full min-h-[280px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Чек-лист · {days[selectedDayIndex]}
          </h3>
          {isMyCleaningDay && canToggle ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Это ваш день — можно отмечать задачи
            </p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400/90 mt-0.5">
              Отмечать задачи можно только в день, закреплённый за вами в расписании
            </p>
          )}
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">{progress}%</span>
            <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted mb-4">
        Уборок на этой неделе:{' '}
        <span className="font-medium text-body">
          {weeklyUsed}/{weeklyLimit}
        </span>
        {weeklyRemaining > 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400"> · осталось {weeklyRemaining}</span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400"> · лимит исчерпан до понедельника</span>
        )}
      </p>

      {loadingTasks ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-800/60" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-slate-400 mb-4">
          Задач пока нет. Добавьте свою или дождитесь настройки шаблонов ответственного.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`px-3 py-2.5 rounded-xl border transition-colors ${
                task.is_done
                  ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canToggle}
                onClick={() => onToggleTask(task.id)}
                title={
                  canToggle
                    ? undefined
                    : 'Отмечать можно только в свой день уборки'
                }
                className={`flex items-center gap-3 text-left flex-1 min-w-0 ${
                  canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center text-xs transition-colors ${
                    task.is_done
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'border-slate-500 hover:border-sky-400'
                  }`}
                >
                  {task.is_done ? '✓' : ''}
                </span>
                <span className="min-w-0">
                  <span
                    className={`text-sm block ${
                      task.is_done
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {task.name}
                  </span>
                  {task.is_custom && (
                    <span className="text-[10px] text-sky-600 dark:text-sky-400/80">Добавлено жильцом</span>
                  )}
                </span>
              </button>
              {task.can_delete && (
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="shrink-0 text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  Удалить
                </button>
              )}
              </div>
              <TaskComments taskId={task.id} />
            </li>
          ))}
        </ul>
      )}

      {isMyCleaningDay && progress === 100 && selectedDayIndex !== null && (
        <div className="mb-3">
          <label className="text-xs text-muted block mb-1">Фотоотчёт за день (опционально)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-xs"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              try {
                await api.post(`/extras/cleaning-photo/${selectedDayIndex}`, fd, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Фото прикреплено');
              } catch (err) {
                toast.error(getApiErrorMessage(err, 'Не удалось загрузить фото'));
              }
            }}
          />
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 pt-3 border-t border-slate-800">
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          placeholder="Добавить задачу для всей квартиры…"
          maxLength={200}
          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-sky-500 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={adding || !newTaskName.trim()}
          className="px-4 py-2 text-sm rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 shrink-0"
        >
          {adding ? '…' : '+'}
        </button>
      </form>
    </div>
  );
};
