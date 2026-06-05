import { useEffect, useState } from 'react';

import api from '@/api/client';
import { WEEKDAY_NAMES } from '@/utils/constants';

type Entry = {
  id: number;
  username: string;
  display_name?: string | null;
  week_start: string;
  day_of_week: number;
  completed_at: string;
  photo_url?: string | null;
};

type Missed = {
  username: string;
  display_name?: string | null;
  day_of_week: number;
  week_start: string;
};

type Props = {
  className?: string;
};

export function CleaningHistory({ className = '' }: Props) {
  const [history, setHistory] = useState<Entry[]>([]);
  const [missed, setMissed] = useState<Missed[]>([]);

  useEffect(() => {
    api.get<Entry[]>('/reports/cleaning-history?limit=30').then((r) => setHistory(r.data));
    api.get<Missed[]>('/reports/missed-cleanings').then((r) => setMissed(r.data));
  }, []);

  return (
    <div
      className={`card-shell flex flex-col space-y-4 p-4 ${className}`.trim()}
    >
      <h3 className="text-heading shrink-0 text-lg font-semibold">История уборок</h3>
      {missed.length > 0 && (
        <div>
          <p className="text-muted mb-2 text-sm">Не засчитано на этой неделе:</p>
          <ul className="space-y-1 text-sm text-rose-700 dark:text-rose-300">
            {missed.map((m, i) => (
              <li key={i}>
                {m.display_name || m.username} — {WEEKDAY_NAMES[m.day_of_week]}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm lg:max-h-none max-h-48">
        {history.map((h) => (
          <li key={h.id} className="flex justify-between gap-2 border-b border-slate-200/60 py-1 dark:border-slate-700/60">
            <span>
              {h.display_name || h.username} · {WEEKDAY_NAMES[h.day_of_week]}
            </span>
            <span className="text-muted shrink-0">
              {new Date(h.completed_at).toLocaleDateString('ru-RU')}
            </span>
          </li>
        ))}
        {!history.length && <li className="text-muted">Пока нет записей</li>}
      </ul>
    </div>
  );
}
