import { useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ModalPortal } from '@/components/ModalPortal';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

export type BonusTaskDetail = {
  id: number;
  title: string;
  description?: string | null;
  assigned_by_username: string;
  assigned_by_display_name?: string | null;
  created_at?: string;
};

type Props = {
  item: BonusTaskDetail | null;
  onClose: () => void;
  onCompleted?: () => void;
};

export function BonusTaskDetailModal({ item, onClose, onCompleted }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const adminLabel = item
    ? displayName({
        username: item.assigned_by_username,
        display_name: item.assigned_by_display_name,
      } as { username: string; display_name?: string | null })
    : '';

  const complete = async () => {
    if (!item?.id) return;
    setSubmitting(true);
    try {
      await api.post(`/users/me/bonus-tasks/${item.id}/complete`);
      toast.success('Задание отмечено выполненным');
      onCompleted?.();
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось отметить задание'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal open={!!item}>
      {item && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-default"
            aria-label="Закрыть"
            onClick={onClose}
          />
          <div className="relative z-10 w-full max-w-md card-shell p-6 space-y-4 shadow-2xl">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-600 to-sky-500" />
            <p className="text-xs uppercase tracking-wide text-violet-600 dark:text-violet-300 font-medium">
              Дополнительное задание
            </p>
            <h2 className="text-xl font-semibold text-heading leading-snug">{item.title}</h2>
            {item.description ? (
              <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">{item.description}</p>
            ) : (
              <p className="text-sm text-muted italic">Без дополнительного описания</p>
            )}
            <div className="text-sm space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-body">
                <span className="text-muted">Назначил: </span>
                <strong>{adminLabel}</strong>
                <span className="text-muted text-xs ml-1">@{item.assigned_by_username}</span>
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={complete}
                disabled={submitting}
                className="btn-primary w-full py-2.5 disabled:opacity-60"
              >
                {submitting ? 'Сохранение…' : 'Отметить выполненным'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary w-full py-2">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}
