import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { AdminFrameColorPicker } from '@/components/AdminFrameColorPicker';
import { FramePicker } from '@/components/FramePicker';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/app/contexts/AuthContext';
import { UserFramesResponse } from '@/types/frames';
import { User } from '@/types/user';
import { displayName } from '@/utils/avatar';
import { getApiErrorMessage } from '@/utils/apiError';

export function ProfileSettings() {
  const { user, setUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayNameInput, setDisplayNameInput] = useState(user?.display_name ?? '');
  const [bioInput, setBioInput] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userFrames, setUserFrames] = useState<UserFramesResponse | null>(null);
  const [aptFrames, setAptFrames] = useState<UserFramesResponse | null>(null);
  const [frameSaving, setFrameSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await api.get<UserFramesResponse>('/users/me/frames');
        setUserFrames(res.data);
        if (user.apartment) {
          const aptRes = await api.get<UserFramesResponse>('/housing/apartments/me/frames');
          setAptFrames(aptRes.data);
        }
      } catch {
        /* optional */
      }
    };
    load();
  }, [user?.id, user?.apartment]);

  if (!user) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.patch<User>('/users/me', {
        display_name: displayNameInput.trim() || null,
        bio: bioInput.trim() || null,
      });
      setUser(res.data);
      toast.success('Профиль обновлён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<User>('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data);
      toast.success('Аватар обновлён');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить фото'));
    } finally {
      setUploading(false);
    }
  };

  const equipUserFrame = async (code: string | null) => {
    setFrameSaving(true);
    try {
      const res = await api.patch<User>('/users/me/frame', { frame_code: code });
      setUser(res.data);
      const framesRes = await api.get<UserFramesResponse>('/users/me/frames');
      setUserFrames(framesRes.data);
      toast.success(code ? 'Рамка установлена' : 'Рамка снята');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сменить рамку'));
    } finally {
      setFrameSaving(false);
    }
  };

  const equipAptFrame = async (code: string | null) => {
    setFrameSaving(true);
    try {
      await api.patch('/housing/apartments/me/frame', { frame_code: code });
      const aptRes = await api.get<UserFramesResponse>('/housing/apartments/me/frames');
      setAptFrames(aptRes.data);
      toast.success(code ? 'Рамка квартиры установлена' : 'Рамка квартиры снята');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось сменить рамку квартиры'));
    } finally {
      setFrameSaving(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
      <h2 className="section-title mb-4">Настройки профиля</h2>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex flex-col items-center gap-2">
          <UserAvatar
            avatarUrl={user.avatar_url}
            name={displayName(user)}
            size="lg"
            isAdmin={user.is_admin}
            adminFrameColor={user.admin_frame_color}
            frameCode={user.is_admin ? null : user.equipped_frame_code}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAvatar(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="text-xs link-accent disabled:opacity-50"
          >
            {uploading ? 'Загрузка…' : 'Сменить аватар'}
          </button>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <div>
            <label className="text-xs text-muted block mb-1">Отображаемое имя</label>
            <input
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder={user.username}
              maxLength={80}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">О себе</label>
            <textarea
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Коротко о себе…"
              className="input-field resize-none"
            />
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {user.is_admin ? (
        <AdminFrameColorPicker />
      ) : (
        userFrames && (
          <FramePicker
            title="Рамка профиля"
            frames={userFrames.frames}
            equippedCode={userFrames.equipped_frame_code}
            onEquip={equipUserFrame}
            saving={frameSaving}
          />
        )
      )}

      {!user.is_admin && user.apartment && aptFrames && (
        <FramePicker
          title="Рамка квартиры (видна в рейтинге и у соседей)"
          frames={aptFrames.frames}
          equippedCode={aptFrames.equipped_frame_code}
          onEquip={equipAptFrame}
          saving={frameSaving}
        />
      )}

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h3 className="section-title mb-3">Смена пароля</h3>
        <div className="flex max-w-md flex-col gap-2">
          <input
            type="password"
            className="input-field"
            placeholder="Текущий пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Новый пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary w-fit px-4 py-2 text-sm"
            onClick={async () => {
              try {
                await api.patch('/users/me/password', {
                  current_password: currentPassword,
                  new_password: newPassword,
                });
                setCurrentPassword('');
                setNewPassword('');
                toast.success('Пароль изменён');
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Не удалось сменить пароль'));
              }
            }}
          >
            Обновить пароль
          </button>
          <Link to="/forgot-password" className="text-xs link-accent">
            Забыли пароль?
          </Link>
        </div>
      </div>
    </div>
  );
}
