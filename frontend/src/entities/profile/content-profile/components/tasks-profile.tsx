import { Task } from '../../types/profile';

interface TasksProfileProps {
  tasks: Task[];
  loadingTasks: boolean;
  canToggle: boolean;
  onToggleTask: (taskId: number) => void;
}

export const TasksProfile = ({
  tasks,
  loadingTasks,
  canToggle,
  onToggleTask,
}: TasksProfileProps) => {
  if (loadingTasks) {
    return (
      <div className="card-shell p-4 md:p-5">
        <p className="text-sm text-muted animate-pulse">Загружаем задачи...</p>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="card-shell p-4 md:p-5">
        <p className="text-sm text-muted">На ваш день задач пока нет.</p>
      </div>
    );
  }

  return (
    <div className="card-shell p-4 md:p-5">
      <p className="text-sm text-muted mb-1">Ваши задачи на день</p>
      {!canToggle && (
        <p className="text-xs text-amber-700 dark:text-amber-400/90 mb-3">
          Отмечать задачи можно в день, закреплённый за вами в расписании
        </p>
      )}
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center justify-between px-3 py-2 rounded-xl list-item-shell"
          >
            <button
              type="button"
              disabled={!canToggle}
              onClick={() => onToggleTask(task.id)}
              className={`flex items-center gap-3 text-left flex-1 ${
                canToggle ? '' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full border shrink-0 ${
                  task.is_done
                    ? 'bg-emerald-500 border-emerald-400'
                    : 'border-slate-400 dark:border-slate-500'
                }`}
              />
              <span
                className={`text-sm ${
                  task.is_done ? 'line-through text-muted' : 'text-body'
                }`}
              >
                {task.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
