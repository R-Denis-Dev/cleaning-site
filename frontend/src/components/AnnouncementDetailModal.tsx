import { ModalPortal } from '@/components/ModalPortal';
import { resolveAvatarUrl } from '@/utils/avatar';

export type AnnouncementDetail = {
  id: number;
  title: string;
  body: string;
  image_url?: string | null;
  event_at?: string | null;
  created_by_username?: string | null;
  created_at: string;
  is_read?: boolean;
};

type Props = {
  item: AnnouncementDetail | null;
  onClose: () => void;
};

function formatEventDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnnouncementDetailModal({ item, onClose }: Props) {
  const imageSrc = item?.image_url ? resolveAvatarUrl(item.image_url) : null;

  return (
    <ModalPortal open={!!item}>
      {item && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={onClose}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:bg-slate-900 shadow-2xl">
            {imageSrc ? (
              <div className="w-full aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden rounded-t-2xl">
                <img src={imageSrc} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-2 rounded-t-2xl bg-gradient-to-r from-sky-600 via-violet-600 to-sky-500" />
            )}

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Мероприятие</p>
                <h2
                  id="announcement-modal-title"
                  className="text-xl sm:text-2xl font-semibold text-heading leading-tight"
                >
                  {item.title}
                </h2>
              </div>

              {item.event_at && (
                <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
                  {formatEventDate(item.event_at)}
                </p>
              )}

              <p className="text-sm sm:text-base text-body whitespace-pre-wrap leading-relaxed">
                {item.body}
              </p>

              {item.created_by_username && (
                <p className="text-xs text-muted pt-1 border-t border-slate-200 dark:border-slate-700">
                  Администрация · {item.created_by_username}
                </p>
              )}

              <button type="button" onClick={onClose} className="btn-primary w-full py-2.5">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}
