import { UserAvatar } from '@/components/UserAvatar';
import { User } from '@/types/user';
import { displayName } from '@/utils/avatar';
import { Task } from '../../types/profile';

interface Props {
  user: User;
  myDayIndex: number | null;
  tasks: Task[];
  days: string[];
}

export const HeaderProfile = ({ user, myDayIndex, days }: Props) => {
  const name = displayName(user);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-start gap-4">
        <UserAvatar
          avatarUrl={user.avatar_url}
          name={name}
          size="lg"
          isAdmin={user.is_admin}
          adminFrameColor={user.admin_frame_color}
          frameCode={user.is_admin ? null : user.equipped_frame_code}
        />
        <div>
          <h1 className="text-2xl font-semibold text-heading mb-1">{name}</h1>
          <p className="text-sm text-muted">@{user.username}</p>
          {user.bio && <p className="text-sm text-body mt-1">{user.bio}</p>}
          <p className="text-sm text-body mt-1">{user.email}</p>
          {!user.is_admin && (
            <p className="text-xs text-muted mt-1">
              Всего уборок: <span className="font-semibold text-body">{user.total_cleanings}</span>
            </p>
          )}
          {user.is_admin && (
            <p className="text-xs text-violet-600 dark:text-violet-300 mt-1 font-medium">
              Администратор Каллисто
            </p>
          )}
          {user.apartment && (
            <p className="text-xs text-muted">
              {user.apartment.building_code}, кв. {user.apartment.apartment_number}
            </p>
          )}
        </div>
      </div>
      <div className="text-sm text-body">
        {myDayIndex !== null ? (
          <p>
            Твой день:{' '}
            <span className="font-semibold text-heading">{days[myDayIndex]}</span>
          </p>
        ) : (
          <p className="text-muted">У тебя пока нет закреплённого дня уборки</p>
        )}
      </div>
    </div>
  );
};
