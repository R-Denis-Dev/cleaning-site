import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { ModalPortal } from '@/components/ModalPortal';
import { UserAvatar } from '@/components/UserAvatar';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

type Member = {
  user_id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  equipped_frame_code?: string | null;
};

type ApartmentDetail = {
  id: number;
  number: number;
  building_code: string;
  current_residents: number;
  max_residents: number;
  total_cleanings: number;
  equipped_frame_code?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  members: Member[];
  recent_inspections_count?: number;
};

type Props = {
  apartmentId: number | null;
  onClose: () => void;
};

export function ApartmentDetailModal({ apartmentId, onClose }: Props) {
  const [data, setData] = useState<ApartmentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apartmentId) {
      setData(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<ApartmentDetail>(`/housing/apartments/${apartmentId}`);
        setData(res.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось загрузить квартиру'));
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apartmentId, onClose]);

  useEffect(() => {
    if (!apartmentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [apartmentId, onClose]);

  return (
    <ModalPortal open={apartmentId !== null}>
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="card-shell relative z-[201] max-h-[85vh] w-full overflow-y-auto rounded-t-2xl shadow-2xl sm:max-w-md sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="apartment-modal-title"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
            <h2 id="apartment-modal-title" className="text-lg font-semibold text-heading">
              Квартира
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-slate-900 dark:hover:text-white text-2xl leading-none p-1"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>

          <div className="p-4">
            {loading || !data ? (
              <p className="text-sm text-muted animate-pulse py-8 text-center">Загрузка…</p>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <ApartmentBadge
                    buildingCode={data.building_code}
                    apartmentNumber={data.number}
                    size="md"
                    frameCode={data.equipped_frame_code}
                    avatarUrl={data.avatar_url}
                  />
                  <div>
                    <p className="text-lg font-semibold text-heading">
                      {data.building_code}, кв. {data.number}
                    </p>
                    <p className="text-sm text-muted">
                      {data.total_cleanings} уборок · {data.current_residents}/{data.max_residents}{' '}
                      жильцов
                      {(data.recent_inspections_count ?? 0) > 0 &&
                        ` · проверок: ${data.recent_inspections_count}`}
                    </p>
                    <Link
                      to={`/apartments/${data.id}`}
                      onClick={onClose}
                      className="text-xs text-sky-600 hover:underline dark:text-sky-400 mt-1 inline-block"
                    >
                      Полная страница квартиры
                    </Link>
                  </div>
                </div>

                {data.description && (
                  <p className="text-sm text-body mb-4 p-3 rounded-xl list-item-shell">
                    {data.description}
                  </p>
                )}

                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Жильцы
                </p>
                {data.members.length ? (
                  <ul className="space-y-2">
                    {data.members.map((m) => (
                      <li key={m.user_id}>
                        <Link
                          to={`/profile/${m.user_id}`}
                          onClick={onClose}
                          className="flex items-center gap-3 p-2 rounded-xl list-item-shell hover:border-sky-400 transition-colors"
                        >
                          <UserAvatar
                            avatarUrl={m.avatar_url}
                            name={displayName(m)}
                            size="sm"
                            frameCode={m.equipped_frame_code}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-body truncate">
                              {displayName(m)}
                            </p>
                            <p className="text-xs text-muted">
                              {m.role === 'manager' ? 'Ответственный' : 'Житель'}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Нет жильцов</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
