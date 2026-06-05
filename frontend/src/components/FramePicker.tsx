import { FrameInfo } from '@/types/frames';
import { ringClassForFrame } from '@/utils/frames';

type Props = {
  title: string;
  frames: FrameInfo[];
  equippedCode: string | null;
  onEquip: (code: string | null) => void;
  saving?: boolean;
};

export function FramePicker({ title, frames, equippedCode, onEquip, saving }: Props) {
  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
      <h3 className="section-title mb-1">{title}</h3>
      <p className="text-xs text-muted mb-4">
        Рамки открываются за место в рейтинге или число уборок. Видны другим в профиле.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onEquip(null)}
          className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
            !equippedCode
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
              : 'list-item-shell hover:border-sky-400'
          }`}
        >
          <span className="text-body">Без рамки</span>
        </button>
        {frames.map((frame) => {
          const ring = ringClassForFrame(frame.code, frames);
          const selected = equippedCode === frame.code;
          return (
            <button
              key={frame.code}
              type="button"
              disabled={!frame.unlocked || saving}
              onClick={() => onEquip(frame.code)}
              className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                !frame.unlocked
                  ? 'opacity-45 cursor-not-allowed list-item-shell'
                  : selected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                    : 'list-item-shell hover:border-sky-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full shrink-0 ${ring}`} />
                <div className="min-w-0">
                  <p className="font-medium text-body truncate">{frame.name}</p>
                  <p className="text-xs text-muted truncate">{frame.description}</p>
                </div>
              </div>
              {!frame.unlocked && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Заблокировано</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
