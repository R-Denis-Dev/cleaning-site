import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatar } from '@/components/UserAvatar';
import { AppContainer } from '@/components/layout/AppContainer';
import { useAuth } from '@/app/contexts/AuthContext';
import { displayName } from '@/utils/avatar';

const navBtn =
  'text-xs sm:text-sm text-body border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 hover:border-sky-400 transition-colors';

export function AdminHeader() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user) refreshUser();
  }, []);

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
      <AppContainer className="py-3 sm:py-4 lg:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {user && (
              <UserAvatar
                avatarUrl={user.avatar_url}
                name={displayName(user)}
                size="md"
                isAdmin
                adminFrameColor={user.admin_frame_color}
              />
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-heading truncate">
                {user ? displayName(user) : 'Администрация'}
              </h1>
              <p className="text-xs sm:text-sm text-violet-600 dark:text-violet-300 truncate mt-0.5">
                Каллисто · Администратор
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap md:justify-end">
            <NotificationBell />
            <Link
              to="/admin"
              className={`${navBtn} ${
                location.pathname === '/admin'
                  ? 'border-violet-500/60 bg-violet-500/15 text-violet-800 dark:text-violet-200 font-medium'
                  : ''
              }`}
            >
              Админ-панель
            </Link>
            <Link
              to="/profile"
              className={`${navBtn} ${
                location.pathname === '/profile'
                  ? 'border-sky-500/50 bg-sky-500/10 font-medium'
                  : ''
              }`}
            >
              Профиль
            </Link>
            {user && (
              <button type="button" onClick={logout} className={navBtn}>
                Выйти
              </button>
            )}
          </div>
        </div>
      </AppContainer>
    </header>
  );
}
