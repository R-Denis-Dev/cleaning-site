import { Schedule } from '../../types/profile';
import { WEEKDAY_SHORT } from '@/utils/constants';

interface Props {
  days: string[];
  myDayIndex: number | null;
  schedules: Schedule[];
}

export const InfoProfile = ({ days, myDayIndex, schedules }: Props) => {
  return (
    <div className="card-shell p-4 md:p-5">
      <p className="text-sm text-muted mb-3">Ваш день уборки</p>
      <p className="text-lg font-semibold text-heading mb-4">
        {myDayIndex !== null ? days[myDayIndex] : 'Вы ещё не выбрали день в расписании'}
      </p>

      <p className="text-sm text-muted mb-2">Занятость по дням</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {days.map((day, index) => {
          const schedule = schedules.find((s) => s.day_of_week === index);
          const label = schedule?.username ?? 'Свободно';
          const isMine = myDayIndex === index;

          return (
            <div
              key={day}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                isMine
                  ? 'bg-sky-50 border-sky-200 dark:bg-sky-600/20 dark:border-sky-500/50'
                  : 'list-item-shell'
              }`}
            >
              <span className="text-sm font-medium text-body shrink-0">
                {WEEKDAY_SHORT[index] ?? day.slice(0, 2)}
              </span>
              <span
                className={`text-xs text-right truncate max-w-[55%] ${
                  isMine ? 'text-sky-700 dark:text-sky-200 font-medium' : 'text-muted'
                }`}
                title={label}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
