import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SupportMenu } from '@/components/SupportMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatar } from '@/components/UserAvatar';
import { AppContainer } from '@/components/layout/AppContainer';
import { useAuth } from '@/app/contexts/AuthContext';
import { displayName } from '@/utils/avatar';

const navBtn =
  'text-xs sm:text-sm text-body border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 hover:border-sky-400 transition-colors';

export const HeaderDashBoard = () => {
  const { user, logout, refreshUser } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (user) refreshUser();
  }, []);

  return (
    <>
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
        <AppContainer className="py-3 sm:py-4 lg:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {user && (
                <UserAvatar
                  avatarUrl={user.avatar_url}
                  name={displayName(user)}
                  size="md"
                  isAdmin={user.is_admin}
                  adminFrameColor={user.admin_frame_color}
                  frameCode={user.is_admin ? null : user.equipped_frame_code}
                />
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-heading truncate">
                  {user ? displayName(user) : 'Панель'}
                </h1>
                {user && (
                  <p className="text-xs sm:text-sm text-muted truncate mt-0.5">
                    {user.apartment
                      ? `${user.apartment.building_code}, кв. ${user.apartment.apartment_number}`
                      : 'Квартира не выбрана'}
                    {user.is_admin ? ' · Администратор Каллисто' : ` · ${user.total_cleanings} уборок`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap md:justify-end">
              <NotificationBell />
              <button type="button" onClick={() => setSupportOpen(true)} className={navBtn}>
                Поддержка
              </button>
              {user?.is_admin && (
                <Link
                  to="/admin"
                  className={`${navBtn} border-violet-500/60 bg-violet-500/10 text-violet-800 dark:text-violet-200 font-medium`}
                >
                  Админ-панель
                </Link>
              )}
              {user && (
                <Link to="/profile" className={navBtn}>
                  Профиль
                </Link>
              )}
              {user && (
                <button type="button" onClick={logout} className={navBtn}>
                  Выйти
                </button>
              )}
            </div>
          </div>
        </AppContainer>
      </header>

      <SupportMenu open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
};
