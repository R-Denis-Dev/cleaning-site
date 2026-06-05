import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { getApiErrorMessage } from '@/utils/apiError';

type Inspection = {
  id: number;
  status: string;
  created_at: string;
  violations: { category: string; score?: number | null; comment?: string | null }[];
};

type Props = {
  apartmentId: number;
  description?: string | null;
  onUpdated: () => void;
};

export function ApartmentDescription({ apartmentId, description, onUpdated }: Props) {
  const [text, setText] = useState(description ?? '');
  const [saving, setSaving] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    setText(description ?? '');
  }, [description]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<Inspection[]>(
          `/housing/apartments/${apartmentId}/inspections`,
          { params: { limit: 5 } },
        );
        setInspections(res.data);
      } catch {
        /* optional */
      }
    };
    load();
  }, [apartmentId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/housing/apartments/me/description', { description: text });
      toast.success('Описание сохранено');
      onUpdated();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  const recentViolations = inspections.flatMap((i) =>
    i.violations.map((v) => ({ ...v, inspectionId: i.id })),
  );

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
      <p className="text-sm text-muted mb-2">Описание квартиры</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Расскажите о квартире: особенности, договорённости жильцов…"
        className="input-field resize-none mb-2"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
      >
        {saving ? 'Сохранение…' : 'Сохранить описание'}
      </button>

      {recentViolations.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted mb-2">Последние замечания с проверок</p>
          <ul className="space-y-1">
            {recentViolations.slice(0, 5).map((v, idx) => (
              <li key={`${v.inspectionId}-${idx}`} className="violation-badge">
                {v.category}
                {v.score != null && `: ${v.score} баллов`}
                {v.comment && ` — ${v.comment}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
