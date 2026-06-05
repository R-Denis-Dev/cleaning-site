import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { ApartmentBadge } from '@/components/ApartmentBadge';
import { getApiErrorMessage } from '@/utils/apiError';

type ApartmentInfo = {
  building_code: string;
  number: number;
  avatar_url?: string | null;
  equipped_frame_code?: string | null;
};

type Props = {
  apartment: ApartmentInfo;
  onUpdated: () => void;
};

export function ApartmentAvatarUpload({ apartment, onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post('/housing/apartments/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Аватар квартиры обновлён');
      onUpdated();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить фото'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
      <ApartmentBadge
        buildingCode={apartment.building_code}
        apartmentNumber={apartment.number}
        size="md"
        frameCode={apartment.equipped_frame_code}
        avatarUrl={apartment.avatar_url}
      />
      <div>
        <p className="text-xs text-muted mb-1">Фото квартиры</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="text-xs link-accent disabled:opacity-50"
        >
          {uploading ? 'Загрузка…' : 'Сменить фото квартиры'}
        </button>
      </div>
    </div>
  );
}
