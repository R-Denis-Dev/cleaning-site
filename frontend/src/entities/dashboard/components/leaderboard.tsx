import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { ApartmentDetailModal } from '@/components/ApartmentDetailModal';
import { UserAvatar } from '@/components/UserAvatar';
import { LeaderboardApartmentEntry, LeaderboardUserEntry } from '@/types/frames';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

const BUILDINGS = ['', 'C1', 'C2', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
const PERIODS = [
  { id: 'all', label: 'Всё время' },
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'semester', label: 'Семестр' },
] as const;

export function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUserEntry[]>([]);
  const [apartments, setApartments] = useState<LeaderboardApartmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [period, setPeriod] = useState<string>('all');
  const [building, setBuilding] = useState('');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams({ limit: String(limit), period });
        if (building) q.set('building_code', building);
        const [usersRes, aptsRes] = await Promise.all([
          api.get<LeaderboardUserEntry[]>(`/users/leaderboard?${q}`),
          api.get<LeaderboardApartmentEntry[]>(`/housing/leaderboard?${q}`),
        ]);
        setUsers(usersRes.data);
        setApartments(aptsRes.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось загрузить рейтинг'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, building, limit]);

  if (loading) {
    return <p className="text-sm text-muted animate-pulse text-center py-4">Загружаем рейтинг...</p>;
  }

  if (!users.length && !apartments.length) {
    return <p className="text-sm text-muted text-center py-4">Пока нет завершённых уборок.</p>;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-lg px-3 py-1 text-xs ${
              period === p.id ? 'bg-sky-600 text-white' : 'btn-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
        <select
          className="input-field text-xs py-1"
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
        >
          {BUILDINGS.map((b) => (
            <option key={b || 'all'} value={b}>
              {b || 'Все корпуса'}
            </option>
          ))}
        </select>
        <select
          className="input-field text-xs py-1"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              Топ {n}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 w-full max-w-5xl mx-auto">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 text-center lg:text-left">
            Топ жильцов
          </p>
          {users.length ? (
            <ol className="space-y-2">
              {users.filter((u) => !u.is_admin).map((u) => (
                <li key={u.id}>
                  <Link
                    to={`/profile/${u.id}`}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl list-item-shell hover:border-sky-300 dark:hover:border-sky-500/30 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-body min-w-0">
                      <span className="text-amber-600 dark:text-amber-400 shrink-0 w-6 text-center">
                        #{u.rank}
                      </span>
                      <UserAvatar
                        avatarUrl={u.avatar_url}
                        name={displayName(u)}
                        size="sm"
                        isAdmin={u.is_admin}
                        adminFrameColor={u.admin_frame_color}
                        frameCode={u.is_admin ? null : u.equipped_frame_code}
                      />
                      <span className="truncate">{displayName(u)}</span>
                    </span>
                    <span className="text-xs text-muted shrink-0">{u.total_cleanings}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted text-center">Нет данных</p>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 text-center lg:text-left">
            Топ квартир
          </p>
          {apartments.length ? (
            <ol className="space-y-2">
              {apartments.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedApartmentId(a.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl list-item-shell hover:border-sky-300 dark:hover:border-sky-500/30 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2 text-sm text-body min-w-0">
                      <span className="text-amber-600 dark:text-amber-400 shrink-0 w-6 text-center">
                        #{a.rank}
                      </span>
                      <ApartmentBadge
                        buildingCode={a.building_code}
                        apartmentNumber={a.apartment_number}
                        frameCode={a.equipped_frame_code}
                        avatarUrl={a.avatar_url}
                      />
                      <span className="truncate">
                        {a.building_code}, кв. {a.apartment_number}
                      </span>
                    </span>
                    <span className="text-xs text-muted shrink-0">{a.total_cleanings}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted text-center">Нет данных</p>
          )}
        </div>
      </div>

      <ApartmentDetailModal
        apartmentId={selectedApartmentId}
        onClose={() => setSelectedApartmentId(null)}
      />
    </>
  );
}
