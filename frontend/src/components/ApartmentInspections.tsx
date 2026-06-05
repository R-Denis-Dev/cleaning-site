import { useEffect, useState } from 'react';

import api from '@/api/client';

type Violation = {
  id: number;
  category: string;
  score: number;
  comment?: string | null;
};

type Inspection = {
  id: number;
  status: string;
  scheduled_at: string;
  notes?: string | null;
  violations: Violation[];
};

export function ApartmentInspections({ apartmentId }: { apartmentId: number }) {
  const [items, setItems] = useState<Inspection[]>([]);

  useEffect(() => {
    api
      .get<Inspection[]>(`/housing/apartments/${apartmentId}/inspections`)
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [apartmentId]);

  if (!items.length) {
    return (
      <div className="card-shell p-4">
        <h3 className="text-heading mb-2 text-lg font-semibold">Проверки</h3>
        <p className="text-muted text-sm">Нарушений по проверкам пока нет</p>
      </div>
    );
  }

  return (
    <div className="card-shell space-y-3 p-4">
      <h3 className="text-heading text-lg font-semibold">Проверки</h3>
      {items.map((ins) => (
        <div key={ins.id} className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-600/80">
          <p className="text-muted text-xs">
            {new Date(ins.scheduled_at).toLocaleDateString('ru-RU')} · {ins.status}
          </p>
          {ins.notes && <p className="mt-1 text-sm">{ins.notes}</p>}
          <ul className="mt-2 space-y-1">
            {ins.violations.map((v) => (
              <li key={v.id} className="text-sm text-rose-800 dark:text-rose-200">
                {v.category} (−{v.score}){v.comment ? `: ${v.comment}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
