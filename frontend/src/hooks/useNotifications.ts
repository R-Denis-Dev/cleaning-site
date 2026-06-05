import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Notification } from '@/types/api';

function wsBase(): string {
  const api = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  if (api.startsWith('http')) {
    return api.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

export function useNotifications(userId?: number, apartmentId?: number) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastEvent, setLastEvent] = useState<Notification | null>(null);

  useEffect(() => {
    if (!userId) return;

    const params = new URLSearchParams({ user_id: String(userId) });
    if (apartmentId) params.set('apartment_id', String(apartmentId));
    const ws = new WebSocket(`${wsBase()}/api/v1/ws?${params}`);

    ws.onmessage = (event) => {
      try {
        const data: Notification = JSON.parse(event.data);
        setLastEvent(data);
        setNotifications((prev) => [data, ...prev.slice(0, 19)]);
        const kind = data.type;
        if (kind === 'schedule_taken' || kind === 'day_completed' || kind === 'inspection_violation') {
          toast(data.message, { icon: kind === 'inspection_violation' ? '⚠️' : '🔔' });
        } else if (kind === 'swap_request') {
          toast(data.message, { icon: '🔄' });
        } else if (kind === 'admin_bonus_task') {
          toast('Вам назначена доп. задача', { icon: '📋', duration: 6000 });
        }
      } catch {
        /* ignore */
      }
    };

    return () => ws.close();
  }, [userId, apartmentId]);

  return { notifications, notificationCount: notifications.length, lastEvent };
}
