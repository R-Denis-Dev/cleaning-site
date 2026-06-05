import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { AppContainer } from '@/components/layout/AppContainer';
import { UserAvatar } from '@/components/UserAvatar';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminUserDetail, PublicUser } from '@/types/user';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicUser | AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwn = currentUser?.id === Number(userId);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        if (currentUser?.is_admin && !isOwn) {
          const res = await api.get<AdminUserDetail>(`/users/${userId}/admin`);
          setProfile(res.data);
        } else {
          const res = await api.get<PublicUser>(`/users/${userId}`);
          setProfile(res.data);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Профиль не найден'));
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, currentUser?.is_admin, isOwn, navigate]);

  if (loading || !profile) {
    return (
      <div className="page-shell flex items-center justify-center text-muted">
        Загрузка профиля…
      </div>
    );
  }

  const adminProfile = 'email' in profile ? profile : null;
  const name = displayName(profile);

  return (
    <div className="page-shell min-h-screen">
      <AppContainer className="py-6 md:py-8 lg:py-10">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 text-sm text-muted hover:text-slate-900 dark:hover:text-white"
        >
          ← Назад
        </button>

        <div className="card-shell p-6 md:p-8">
          <div className="flex items-start gap-4 mb-6">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              name={name}
              size="lg"
              isAdmin={profile.is_admin}
              adminFrameColor={profile.admin_frame_color}
              frameCode={profile.is_admin ? null : profile.equipped_frame_code}
            />
            <div>
              <h1 className="text-2xl font-semibold text-heading">{name}</h1>
              <p className="text-sm text-muted">@{profile.username}</p>
              {profile.is_admin && (
                <p className="text-xs text-violet-600 dark:text-violet-300 mt-1 font-medium">
                  Администратор Каллисто
                </p>
              )}
              {profile.bio && <p className="text-sm text-body mt-2">{profile.bio}</p>}
            </div>
          </div>

          <div className="grid gap-3 text-sm">
            {!profile.is_admin && (
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-muted">Уборок выполнено</span>
                <span className="font-semibold text-body">{profile.total_cleanings}</span>
              </div>
            )}

            {profile.apartment && !profile.is_admin && (
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-muted">Квартира</span>
                <span className="font-semibold text-body flex items-center gap-2">
                  <ApartmentBadge
                    buildingCode={profile.apartment.building_code}
                    apartmentNumber={profile.apartment.apartment_number}
                    frameCode={profile.apartment.apartment_equipped_frame_code}
                    avatarUrl={profile.apartment.apartment_avatar_url}
                    size="sm"
                  />
                  {profile.apartment.building_code}, кв. {profile.apartment.apartment_number}
                  {profile.apartment.apartment_total_cleanings != null && (
                    <span className="text-xs text-muted font-normal">
                      · {profile.apartment.apartment_total_cleanings} уборок
                    </span>
                  )}
                </span>
              </div>
            )}

            {adminProfile && (
              <>
                <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-muted">Email</span>
                  <span className="text-body">{adminProfile.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-muted">Регистрация</span>
                  <span className="text-body">
                    {new Date(adminProfile.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted">Роль</span>
                  <span className="text-body">
                    {adminProfile.is_admin ? 'Администратор' : 'Студент'}
                  </span>
                </div>
              </>
            )}
          </div>

          {isOwn && (
            <Link to="/profile" className="mt-6 inline-block text-sm link-accent">
              Редактировать свой профиль →
            </Link>
          )}
        </div>
      </div>
      </AppContainer>
    </div>
  );
}
