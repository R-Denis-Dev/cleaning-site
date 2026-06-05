import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { getApiErrorMessage } from '@/utils/apiError';

type Swap = {
  id: number;
  requester_username: string;
  target_username: string;
  status: string;
};

export function SwapRequests({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<Swap[]>([]);

  const load = useCallback(() => {
    api.get<Swap[]>('/extras/swap-requests').then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const accept = async (id: number) => {
    try {
      await api.post(`/extras/swap-requests/${id}/accept`);
      toast.success('Обмен принят');
      load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Ошибка'));
    }
  };

  const reject = async (id: number) => {
    try {
      await api.post(`/extras/swap-requests/${id}/reject`);
      toast.success('Отклонено');
      load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Ошибка'));
    }
  };

  if (!items.length) return null;

  return (
    <div className="card-shell mb-4 p-4">
      <h3 className="text-heading mb-2 text-sm font-semibold">Запросы на обмен днями</h3>
      <ul className="space-y-2 text-sm">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2">
            <span>
              {s.requester_username} → {s.target_username}
            </span>
            <button type="button" className="rounded bg-emerald-600 px-2 py-1 text-white" onClick={() => accept(s.id)}>
              Принять
            </button>
            <button type="button" className="rounded bg-slate-500 px-2 py-1 text-white" onClick={() => reject(s.id)}>
              Отклонить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
