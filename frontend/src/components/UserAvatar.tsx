import { resolveAvatarUrl } from '@/utils/avatar';
import { adminRingStyle, isAdminRingEnabled } from '@/utils/adminFrames';
import { ringClassForFrame } from '@/utils/frames';

type Props = {
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  frameCode?: string | null;
  isAdmin?: boolean;
  adminFrameColor?: string | null;
};

const BOX_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
} as const;

export function UserAvatar({
  avatarUrl,
  name,
  size = 'md',
  className = '',
  frameCode,
  isAdmin = false,
  adminFrameColor,
}: Props) {
  const src = resolveAvatarUrl(avatarUrl);
  const initial = (name[0] || '?').toUpperCase();
  const ring = ringClassForFrame(frameCode);
  const box = BOX_CLASS[size];

  const face = src ? (
    <img
      src={src}
      alt={name}
      className="h-full w-full rounded-full object-cover bg-transparent"
      draggable={false}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-violet-600 text-sm font-semibold text-white">
      {initial}
    </div>
  );

  if (isAdmin) {
    const ringStyle = adminRingStyle(adminFrameColor);
    if (!isAdminRingEnabled(adminFrameColor) || !ringStyle) {
      return (
        <div className={`shrink-0 overflow-hidden rounded-full ${box} ${className}`}>{face}</div>
      );
    }
    return (
      <div
        key={adminFrameColor ?? 'ring'}
        className={`shrink-0 rounded-full ${box} ${className}`}
        style={ringStyle}
        title="Обводка администратора"
      >
        <div className="h-full w-full overflow-hidden rounded-full bg-slate-900">{face}</div>
      </div>
    );
  }

  if (!ring) {
    return (
      <div className={`shrink-0 overflow-hidden rounded-full ${box} ${className}`}>{face}</div>
    );
  }

  return (
    <div
      className={`shrink-0 rounded-full ${ring} p-[2px] ${box} ${className}`}
      title="Рамка достижения"
    >
      <div className="h-full w-full overflow-hidden rounded-full">{face}</div>
    </div>
  );
}
