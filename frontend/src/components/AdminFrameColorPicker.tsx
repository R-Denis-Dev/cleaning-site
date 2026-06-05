import toast from 'react-hot-toast';

import api from '@/api/client';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/app/contexts/AuthContext';
import { User } from '@/types/user';
import {
  ADMIN_FRAME_COLORS,
  ADMIN_FRAME_OFF,
  adminSwatchStyle,
  resolveAdminRingColor,
} from '@/utils/adminFrames';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

export function AdminFrameColorPicker() {
  const { user, setUser } = useAuth();
  if (!user?.is_admin) return null;

  const stored = user.admin_frame_color ?? 'white';
  const current = stored === ADMIN_FRAME_OFF ? ADMIN_FRAME_OFF : resolveAdminRingColor(stored) ?? 'white';

  const pick = async (colorId: string) => {
    try {
      const res = await api.patch<User>('/users/me/admin-frame-color', { color: colorId });
      setUser(res.data);
      toast.success(colorId === ADMIN_FRAME_OFF ? 'Обводка отключена' : 'Цвет обводки обновлён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить'));
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-heading mb-2">Обводка аватара</h3>
      <p className="text-xs text-muted mb-4">
        Светящееся кольцо вокруг фото. Можно сменить цвет или полностью отключить.
      </p>
      <div className="flex items-center gap-4 mb-4">
        <UserAvatar
          key={`preview-${user.admin_frame_color}`}
          avatarUrl={user.avatar_url}
          name={displayName(user)}
          size="lg"
          isAdmin
          adminFrameColor={user.admin_frame_color}
        />
      </div>
      <button
        type="button"
        onClick={() => pick(ADMIN_FRAME_OFF)}
        className={`mb-3 w-full rounded-xl border px-3 py-2 text-sm transition-colors ${
          current === ADMIN_FRAME_OFF
            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 font-medium'
            : 'border-slate-300 dark:border-slate-600 hover:border-sky-400'
        }`}
      >
        Без обводки
      </button>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
        {ADMIN_FRAME_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pick(c.id)}
            title={c.label}
            className={`rounded-xl border-2 p-2 transition-all ${
              current === c.id
                ? 'border-sky-500 scale-105 shadow-md'
                : 'border-transparent hover:border-slate-400'
            }`}
          >
            <div className="mx-auto h-8 w-8 rounded-full" style={adminSwatchStyle(c.id)}>
              <div className="h-full w-full rounded-full bg-slate-500/80" />
            </div>
            <span className="block text-[9px] text-muted mt-1 truncate">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
