import { useEffect, useMemo, useState } from 'react';

import api from '@/api/client';

export type AptOverview = {
  id: number;
  building_code: string;
  number: number;
  current_residents: number;
  violations_count: number;
  pending_inspections: number;
  manager_username?: string | null;
};

type Props = {
  selectedId: number | null;
  onSelect: (apt: AptOverview) => void;
};

const BUILDINGS = ['C1', 'C2', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

export function AdminApartmentPicker({ selectedId, onSelect }: Props) {
  const [building, setBuilding] = useState('C1');
  const [numberFilter, setNumberFilter] = useState('');
  const [onlyOccupied, setOnlyOccupied] = useState(false);
  const [onlyViolations, setOnlyViolations] = useState(false);
  const [apartments, setApartments] = useState<AptOverview[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (code: string) => {
    setLoading(true);
    try {
      const res = await api.get<AptOverview[]>('/admin/apartments', {
        params: { building_code: code, limit: 500 },
      });
      setApartments(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(building);
  }, [building]);

  const filtered = useMemo(() => {
    let list = apartments;
    if (numberFilter.trim()) {
      const n = Number(numberFilter);
      if (!Number.isNaN(n)) {
        list = list.filter((a) => a.number === n);
      } else {
        list = list.filter((a) => String(a.number).includes(numberFilter.trim()));
      }
    }
    if (onlyOccupied) list = list.filter((a) => a.current_residents > 0);
    if (onlyViolations) list = list.filter((a) => a.violations_count > 0);
    return list;
  }, [apartments, numberFilter, onlyOccupied, onlyViolations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted block mb-1">Корпус</label>
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="input-field min-w-[100px]"
          >
            {BUILDINGS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted block mb-1">Номер квартиры</label>
          <input
            type="text"
            inputMode="numeric"
            value={numberFilter}
            onChange={(e) => setNumberFilter(e.target.value)}
            placeholder="Напр. 22"
            className="input-field"
          />
        </div>
        <button type="button" onClick={() => load(building)} className="btn-primary px-4 py-2 text-sm">
          {loading ? '…' : 'Обновить'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2 text-body cursor-pointer">
          <input
            type="checkbox"
            checked={onlyOccupied}
            onChange={(e) => setOnlyOccupied(e.target.checked)}
            className="rounded"
          />
          Только с жильцами
        </label>
        <label className="flex items-center gap-2 text-body cursor-pointer">
          <input
            type="checkbox"
            checked={onlyViolations}
            onChange={(e) => setOnlyViolations(e.target.checked)}
            className="rounded"
          />
          С нарушениями
        </label>
        <span className="text-muted">Найдено: {filtered.length}</span>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-heading">Квартира</th>
              <th className="text-left px-3 py-2 font-medium text-heading hidden sm:table-cell">Жильцы</th>
              <th className="text-left px-3 py-2 font-medium text-heading hidden sm:table-cell">Наруш.</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className={`border-t border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  selectedId === a.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''
                }`}
              >
                <td className="px-3 py-2.5 font-medium text-body">
                  {a.building_code}-{a.number}
                </td>
                <td className="px-3 py-2.5 text-muted hidden sm:table-cell">{a.current_residents}</td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  {a.violations_count > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">⚠ {a.violations_count}</span>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(a)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedId === a.id
                        ? 'bg-sky-600 text-white'
                        : 'btn-secondary'
                    }`}
                  >
                    {selectedId === a.id ? 'Выбрано' : 'Открыть'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Квартиры не найдены</p>
        )}
      </div>
    </div>
  );
}
