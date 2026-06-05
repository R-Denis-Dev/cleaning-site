export interface UserApartment {
  building_code: string;
  apartment_number: number;
  role: 'resident' | 'manager' | string;
  apartment_total_cleanings?: number;
  apartment_equipped_frame_code?: string | null;
  apartment_avatar_url?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  apartment?: UserApartment | null;
  total_cleanings: number;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_admin?: boolean;
  equipped_frame_code?: string | null;
  admin_frame_color?: string | null;
  admin_frame_style?: string | null;
}

export interface PublicUser {
  id: number;
  username: string;
  total_cleanings: number;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  apartment?: UserApartment | null;
  equipped_frame_code?: string | null;
  is_admin?: boolean;
  admin_frame_color?: string | null;
  admin_frame_style?: string | null;
}

export interface AdminUserDetail extends PublicUser {
  email: string;
  created_at: string;
  is_admin: boolean;
  is_blocked?: boolean;
  admin_frame_color?: string | null;
  admin_frame_style?: string | null;
}
