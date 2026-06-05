import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { UserAvatar } from '@/components/UserAvatar';
import { PublicUser } from '@/types/user';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

export function CallistoAdminsTab() {
  const [admins, setAdmins] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<PublicUser[]>('/users/callisto-admins');
        setAdmins(res.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не удалось загрузить администраторов'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted py-8 text-center">Загрузка…</p>;
  }

  if (admins.length === 0) {
    return (
      <p className="text-sm text-muted py-8 text-center">
        Администраторы Каллисто пока не назначены.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {admins.map((a) => (
        <li
          key={a.id}
          className="flex items-center gap-3 p-4 rounded-xl list-item-shell"
        >
          <UserAvatar
            avatarUrl={a.avatar_url}
            name={displayName(a)}
            size="md"
            isAdmin
            adminFrameColor={a.admin_frame_color}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-heading truncate">{displayName(a)}</p>
            <p className="text-xs text-muted truncate">
              @{a.username}
              {a.apartment &&
                ` · ${a.apartment.building_code}-${a.apartment.apartment_number}`}
            </p>
            {a.bio && (
              <p className="text-sm text-body mt-1 line-clamp-2">{a.bio}</p>
            )}
          </div>
          <Link to={`/profile/${a.id}`} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
            Профиль
          </Link>
        </li>
      ))}
    </ul>
  );
}
