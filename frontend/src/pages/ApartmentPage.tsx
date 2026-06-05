import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { ApartmentInspections } from '@/components/ApartmentInspections';
import { AppContainer } from '@/components/layout/AppContainer';
import { Leaderboard } from '@/entities/dashboard/components/leaderboard';
import { getApiErrorMessage } from '@/utils/apiError';

type ApartmentDetail = {
  id: number;
  number: number;
  building_code: string;
  total_cleanings: number;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
  description?: string | null;
};

export default function ApartmentPage() {
  const { id } = useParams();
  const apartmentId = Number(id);
  const [data, setData] = useState<ApartmentDetail | null>(null);

  useEffect(() => {
    if (!apartmentId || Number.isNaN(apartmentId)) return;
    api
      .get<ApartmentDetail>(`/housing/apartments/${apartmentId}`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(getApiErrorMessage(e, 'Квартира не найдена')));
  }, [apartmentId]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/apartments/${apartmentId}`
      : '';

  return (
    <div className="page-shell min-h-screen">
      <AppContainer className="py-8">
        <Link to="/dashboard" className="text-sm text-sky-600 hover:underline">
          ← На панель
        </Link>
        {data ? (
          <div className="mt-6 space-y-6">
            <div className="card-shell flex items-center gap-4 p-6">
              <ApartmentBadge
                buildingCode={data.building_code}
                apartmentNumber={data.number}
                avatarUrl={data.avatar_url}
                frameCode={data.equipped_frame_code}
                size="md"
              />
              <div>
                <h1 className="text-heading text-2xl font-semibold">
                  Дом {data.building_code}, кв. {data.number}
                </h1>
                <p className="text-muted">{data.total_cleanings} уборок</p>
                {data.description && <p className="mt-2 text-sm">{data.description}</p>}
              </div>
            </div>
            <div className="card-shell flex flex-col items-center gap-3 p-4 text-sm sm:flex-row sm:items-start">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
                alt="QR-код страницы квартиры"
                width={160}
                height={160}
                className="rounded-lg border border-slate-200 dark:border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-muted mb-1">Ссылка для шаринга:</p>
                <code className="break-all text-xs">{shareUrl}</code>
              </div>
            </div>
            <ApartmentInspections apartmentId={data.id} />
            <div className="card-shell p-4">
              <p className="text-heading mb-4 font-medium">Рейтинг</p>
              <Leaderboard />
            </div>
          </div>
        ) : (
          <p className="mt-8 text-muted animate-pulse">Загрузка…</p>
        )}
      </AppContainer>
    </div>
  );
}
