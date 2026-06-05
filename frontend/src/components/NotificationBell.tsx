import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/api/client';
import {
  AnnouncementDetail,
  AnnouncementDetailModal,
} from '@/components/AnnouncementDetailModal';
import { BonusTaskDetail, BonusTaskDetailModal } from '@/components/BonusTaskDetailModal';
import { ModalPortal } from '@/components/ModalPortal';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationBell() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [items, setItems] = useState<AnnouncementDetail[]>([]);
  const [bonusItems, setBonusItems] = useState<BonusTaskDetail[]>([]);
  const [unread, setUnread] = useState(0);
  const [selectedAnn, setSelectedAnn] = useState<AnnouncementDetail | null>(null);
  const [selectedBonus, setSelectedBonus] = useState<BonusTaskDetail | null>(null);
  const { user } = useAuth();
  const { lastEvent } = useNotifications(user?.id);

  const load = useCallback(async () => {
    try {
      const [listRes, countRes, bonusRes] = await Promise.all([
        api.get<AnnouncementDetail[]>('/announcements', { params: { limit: 20 } }),
        api.get<{ count: number }>('/announcements/unread-count'),
        user?.is_admin ? Promise.resolve({ data: [] }) : api.get<BonusTaskDetail[]>('/users/me/bonus-tasks'),
      ]);
      setItems(listRes.data);
      setUnread(countRes.data.count);
      if (!user?.is_admin) setBonusItems(bonusRes.data);
    } catch {
      /* ignore */
    }
  }, [user?.is_admin]);

  useEffect(() => {
    load();
  }, [load]);

  const openBonusFromEvent = useCallback((data: Record<string, unknown> | undefined) => {
    if (!data) return;
    setPanelOpen(false);
    setSelectedBonus({
      id: Number(data.bonus_task_id) || 0,
      title: String(data.title || 'Доп. задание'),
      description: data.description ? String(data.description) : null,
      assigned_by_username: String(data.assigned_by_username || 'admin'),
      assigned_by_display_name: data.assigned_by_display_name
        ? String(data.assigned_by_display_name)
        : null,
    });
  }, []);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'campus_announcement') {
      load();
      toast(lastEvent.message, { icon: '🔔' });
    }
    if (lastEvent.type === 'admin_bonus_task') {
      load();
      toast(
        (t) => (
          <button
            type="button"
            className="text-left w-full"
            onClick={() => {
              openBonusFromEvent(lastEvent.data as Record<string, unknown>);
              toast.dismiss(t.id);
            }}
          >
            Вам назначена доп. задача — нажмите, чтобы открыть
          </button>
        ),
        { icon: '📋', duration: 8000 },
      );
    }
  }, [lastEvent, load, openBonusFromEvent]);

  const openAnnouncement = async (item: AnnouncementDetail) => {
    setPanelOpen(false);
    setSelectedAnn(item);
    if (!item.is_read) {
      try {
        await api.post(`/announcements/${item.id}/read`);
        setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a)));
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
  };

  const openBonus = async (item: BonusTaskDetail) => {
    setPanelOpen(false);
    try {
      const res = await api.get<BonusTaskDetail>(`/users/me/bonus-tasks/${item.id}`);
      setSelectedBonus(res.data);
    } catch {
      setSelectedBonus(item);
    }
  };

  const totalBadge = unread + (user?.is_admin ? 0 : bonusItems.length);
  const hasContent = bonusItems.length > 0 || items.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPanelOpen(true);
          load();
        }}
        className="relative text-xs sm:text-sm text-body border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 hover:border-sky-400 transition-colors"
        aria-label="Уведомления"
        aria-expanded={panelOpen}
      >
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </span>
        {totalBadge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {/* Список уведомлений — по центру с затемнением */}
      <ModalPortal open={panelOpen}>
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Уведомления"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={() => setPanelOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <h2 className="text-lg font-semibold text-heading">Уведомления</h2>
              <p className="text-xs text-muted mt-0.5">Нажмите на пункт, чтобы открыть подробности</p>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {!user?.is_admin && bonusItems.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300 mb-2">
                    Доп. задания
                  </p>
                  <ul className="space-y-1">
                    {bonusItems.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => openBonus(b)}
                          className="w-full text-left rounded-xl px-3 py-3 text-sm font-medium text-body border border-violet-200/60 dark:border-violet-800/60 bg-violet-50/80 dark:bg-violet-950/30 hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
                        >
                          <span className="mr-2" aria-hidden>
                            📋
                          </span>
                          {b.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Мероприятия Каллисто
                </p>
                {items.length === 0 ? (
                  <p className="text-sm text-muted py-2">Пока нет объявлений</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => openAnnouncement(a)}
                          className={`w-full text-left rounded-xl px-3 py-3 text-sm border transition-colors ${
                            !a.is_read
                              ? 'font-semibold text-heading border-sky-300/60 dark:border-sky-600/60 bg-sky-50/80 dark:bg-sky-950/30'
                              : 'text-body border-slate-200 dark:border-slate-700 hover:border-sky-400'
                          }`}
                        >
                          {!a.is_read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-sky-500 mr-2 align-middle" />
                          )}
                          {a.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {!hasContent && user?.is_admin && (
                <p className="text-sm text-muted text-center py-6">Нет новых уведомлений</p>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="btn-secondary w-full py-2 text-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Детали — поверх списка, z выше */}
      <AnnouncementDetailModal item={selectedAnn} onClose={() => setSelectedAnn(null)} />
      <BonusTaskDetailModal
        item={selectedBonus}
        onClose={() => setSelectedBonus(null)}
        onCompleted={load}
      />
    </>
  );
}
