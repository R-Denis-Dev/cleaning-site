import { useEffect, useState } from 'react';

import api from '@/api/client';

type Reminder = {
  kind: string;
  message: string;
  day_of_week?: number;
  incomplete_tasks?: number;
};

export function ReminderBanner() {
  const [items, setItems] = useState<Reminder[]>([]);

  useEffect(() => {
    api
      .get<Reminder[]>('/reports/reminders')
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {items.map((r) => (
        <div
          key={r.kind}
          className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          {r.message}
        </div>
      ))}
    </div>
  );
}
