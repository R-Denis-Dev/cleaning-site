import { resolveAvatarUrl } from '@/utils/avatar';
import { ringClassForFrame } from '@/utils/frames';

type Props = {
  buildingCode: string;
  apartmentNumber: number;
  size?: 'sm' | 'md';
  frameCode?: string | null;
  avatarUrl?: string | null;
};

const sizes = {
  sm: { outer: 'p-0.5', inner: 'h-8 w-8 text-[10px]' },
  md: { outer: 'p-1', inner: 'h-12 w-12 text-xs' },
};

export function ApartmentBadge({
  buildingCode,
  apartmentNumber,
  size = 'sm',
  frameCode,
  avatarUrl,
}: Props) {
  const ring = ringClassForFrame(frameCode);
  const sz = sizes[size];
  const label = `${buildingCode}-${apartmentNumber}`;
  const src = resolveAvatarUrl(avatarUrl);

  const inner = src ? (
    <img
      src={src}
      alt={label}
      className={`rounded-xl object-cover ${sz.inner}`}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        const fallback = e.currentTarget.nextElementSibling;
        if (fallback instanceof HTMLElement) fallback.style.display = 'flex';
      }}
    />
  ) : null;

  const fallback = (
    <div
      className={`rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-white ${sz.inner}`}
      title={label}
      style={src ? { display: 'none' } : undefined}
    >
      {buildingCode}
    </div>
  );

  const content = (
    <>
      {inner}
      {fallback}
    </>
  );

  if (!ring) {
    return <div className="shrink-0">{content}</div>;
  }

  return (
    <div className={`shrink-0 rounded-xl ${ring} ${sz.outer}`} title="Рамка квартиры">
      {content}
    </div>
  );
}
