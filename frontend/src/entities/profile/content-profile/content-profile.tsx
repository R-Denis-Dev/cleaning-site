import { Schedule, Task } from '../types/profile';
import { InfoProfile } from './components/content-profile-info';
import { TasksProfile } from './components/tasks-profile';

interface Props {
  myDayIndex: number | null;
  schedules: Schedule[];
  loadingTasks: boolean;
  tasks: Task[];
  days: string[];
  canToggle: boolean;
  onToggleTask: (taskId: number) => void;
}

export const ContentProfile = ({
  myDayIndex,
  schedules,
  loadingTasks,
  tasks,
  days,
  canToggle,
  onToggleTask,
}: Props) => {
  return (
    <div className="space-y-6">
      <InfoProfile days={days} myDayIndex={myDayIndex} schedules={schedules} />

      <TasksProfile
        tasks={tasks}
        loadingTasks={loadingTasks}
        canToggle={canToggle}
        onToggleTask={onToggleTask}
      />
    </div>
  );
};
