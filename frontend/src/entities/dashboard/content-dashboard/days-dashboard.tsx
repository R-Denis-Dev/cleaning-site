import { Schedule } from '../types/dashboard';
import { WEEKDAY_SHORT } from '@/utils/constants';

interface DaysDashboardProps {
  days: string[];
  schedules: Schedule[];
  selectedDayIndex: number | null;
  onDayClick: (dayIndex: number) => void;
  onTakeDay: (scheduleId: number) => void;
  onReleaseDay: (scheduleId: number) => void;
  onRequestSwap?: (
    myScheduleId: number,
    theirScheduleId: number,
    targetUserId: number,
  ) => void;
  currentUsername: string | undefined;
}

export const DaysDashboard = ({
  days,
  schedules,
  selectedDayIndex,
  onDayClick,
  onTakeDay,
  onReleaseDay,
  onRequestSwap,
  currentUsername,
}: DaysDashboardProps) => {
  const mySchedule = schedules.find(
    (s) => s.is_taken && s.username === currentUsername,
  );

  const selectedLabel =
    selectedDayIndex !== null ? days[selectedDayIndex] : null;

  return (
    <div className="card-shell p-4 sm:p-5 md:p-6">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-heading">Расписание</h3>
          <p className="text-xs text-muted mt-0.5">
            Нажмите на день, чтобы открыть чек-лист
          </p>
          {selectedLabel && (
            <p className="text-xs text-body mt-1.5 sm:hidden">
              Выбрано: <span className="font-medium">{selectedLabel}</span>
            </p>
          )}
        </div>
        {mySchedule && (
          <p className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2 shrink-0 max-w-full">
            <span className="text-muted dark:text-emerald-400/80">Ваш день: </span>
            <strong className="break-words">{days[mySchedule.day_of_week]}</strong>
          </p>
        )}
      </div>

      {/* Мобильный: горизонтальная прокрутка. Планшет+: сетка 7 колонок */}
      <div className="overflow-x-auto md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0 pb-1">
        <div className="flex gap-2 min-w-max md:min-w-0 md:grid md:grid-cols-7 md:gap-2 lg:gap-3">
          {days.map((day, index) => {
            const schedule = schedules.find((s) => s.day_of_week === index);
            const isSelected = selectedDayIndex === index;
            const isTaken = !!schedule?.is_taken;
            const isMine = isTaken && schedule?.username === currentUsername;
            const isToday = schedule?.is_today;
            const shortLabel = WEEKDAY_SHORT[index] ?? day.slice(0, 2);

            let cardClass =
              'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-sky-300 dark:hover:border-sky-500/40';
            if (isSelected) {
              cardClass =
                'border-sky-500 bg-sky-50 dark:bg-sky-600/25 text-sky-900 dark:text-white ring-2 ring-sky-500/40';
            } else if (isMine) {
              cardClass =
                'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-100';
            } else if (isTaken) {
              cardClass =
                'border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400';
            }

            return (
              <div
                key={day}
                className="flex flex-col w-[4.75rem] shrink-0 md:w-auto md:shrink"
              >
                <button
                  type="button"
                  onClick={() => onDayClick(index)}
                  title={day}
                  aria-label={`${day}${isToday ? ', сегодня' : ''}${isTaken ? `, занято: ${schedule?.username}` : ', свободно'}`}
                  aria-pressed={isSelected}
                  className={`relative flex flex-col items-center justify-center min-h-[3.25rem] md:min-h-[3.75rem] lg:min-h-[4.25rem] rounded-xl border px-1 py-2 md:py-3 transition-all ${cardClass}`}
                >
                  <span className="text-sm md:text-base font-bold leading-none">{shortLabel}</span>
                  {isToday && (
                    <span
                      className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500"
                      title="Сегодня"
                    />
                  )}
                  {isTaken && !isToday && (
                    <span
                      className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
                        isMine ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                  )}
                </button>

                <div className="mt-1.5 min-h-[2.25rem] flex flex-col items-center justify-start gap-0.5">
                  {schedule ? (
                    isTaken ? (
                      isMine ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReleaseDay(schedule.id);
                          }}
                          className="text-[11px] leading-tight text-sky-700 dark:text-sky-300 hover:underline py-1 px-0.5 min-h-[28px] flex items-center"
                        >
                          Освободить
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          <span
                            className="text-[10px] leading-tight text-muted text-center w-full max-w-[4.5rem] truncate px-0.5"
                            title={schedule.username ?? ''}
                          >
                            {schedule.username}
                          </span>
                          {mySchedule &&
                            onRequestSwap &&
                            schedule.user_id &&
                            schedule.user_id !== mySchedule.user_id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestSwap(
                                    mySchedule.id,
                                    schedule.id,
                                    schedule.user_id!,
                                  );
                                }}
                                className="text-[10px] text-sky-700 dark:text-sky-300 hover:underline"
                              >
                                Обмен
                              </button>
                            )}
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTakeDay(schedule.id);
                        }}
                        className="text-[11px] leading-tight font-medium text-sky-700 dark:text-sky-300 py-1 px-1 min-h-[28px] flex items-center"
                      >
                        Занять
                      </button>
                    )
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLabel && (
        <p className="hidden sm:block text-xs text-muted mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
          Открыт чек-лист: <span className="font-medium text-body">{selectedLabel}</span>
        </p>
      )}
    </div>
  );
};
