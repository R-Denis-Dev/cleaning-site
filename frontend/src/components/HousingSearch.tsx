import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { ApartmentDetailModal } from '@/components/ApartmentDetailModal';
import { getApiErrorMessage } from '@/utils/apiError';

type ApartmentSearch = {
  id: number;
  number: number;
  building_code: string;
  building_name: string;
  current_residents: number;
  max_residents: number;
  description_preview?: string | null;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  total_cleanings?: number;
};

export function HousingSearch() {
  const [buildingCode, setBuildingCode] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [results, setResults] = useState<ApartmentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = async () => {
    if (!buildingCode.trim() && !apartmentNumber.trim()) {
      toast.error('Укажите корпус или номер квартиры');
      return;
    }
    setLoading(true);
    setHasSearched(true);
    setSelectedId(null);
    try {
      const params: Record<string, string | number> = { limit: 30 };
      if (buildingCode.trim()) params.building_code = buildingCode.trim().toUpperCase();
      if (apartmentNumber.trim()) params.apartment_number = Number(apartmentNumber);
      const res = await api.get<ApartmentSearch[]>('/housing/search', { params });
      setResults(res.data);
      if (res.data.length === 0) {
        toast('Ничего не найдено', { icon: '🔍' });
      } else if (res.data.length === 1) {
        toast('Нажмите на квартиру, чтобы увидеть жильцов', { icon: '👆' });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ошибка поиска'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    search();
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 mb-3">
        <input
          value={buildingCode}
          onChange={(e) => setBuildingCode(e.target.value)}
          placeholder="Корпус (C1, R3…)"
          className="input-field w-28 text-sm py-2"
        />
        <input
          value={apartmentNumber}
          onChange={(e) => setApartmentNumber(e.target.value)}
          placeholder="№ квартиры"
          type="number"
          min={1}
          className="input-field w-28 text-sm py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
        >
          {loading ? 'Поиск…' : 'Найти'}
        </button>
      </form>

      {hasSearched && results.length === 0 && !loading && (
        <p className="text-sm text-muted py-2">По вашему запросу квартир не найдено.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Найдено: {results.length}. Нажмите на квартиру для подробностей.
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {results.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                    selectedId === a.id
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 hover:border-sky-400 dark:hover:border-sky-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ApartmentBadge
                      buildingCode={a.building_code}
                      apartmentNumber={a.number}
                      size="sm"
                      avatarUrl={a.avatar_url}
                      frameCode={a.equipped_frame_code}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-body">
                        {a.building_code}, кв. {a.number}
                      </p>
                      <p className="text-xs text-muted">
                        {a.current_residents}/{a.max_residents} жильцов
                        {a.building_name !== a.building_code && ` · ${a.building_name}`}
                      </p>
                      {a.description_preview && (
                        <p className="text-xs text-muted mt-1 line-clamp-2">
                          {a.description_preview}
                        </p>
                      )}
                    </div>
                    <span className="text-muted shrink-0 text-lg" aria-hidden>
                      ›
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {selectedId && (
            <p className="text-xs text-sky-600 dark:text-sky-400">
              <Link to={`/apartments/${selectedId}`} className="hover:underline">
                Открыть страницу квартиры
              </Link>
            </p>
          )}
        </div>
      )}

      <ApartmentDetailModal apartmentId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
