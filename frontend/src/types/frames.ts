export type FrameInfo = {
  code: string;
  name: string;
  description: string;
  target: 'user' | 'apartment';
  kind: 'rank' | 'cleanings';
  threshold: number;
  ring_class: string;
  unlocked: boolean;
};

export type UserFramesResponse = {
  equipped_frame_code: string | null;
  frames: FrameInfo[];
};

export type LeaderboardUserEntry = {
  id: number;
  username: string;
  total_cleanings: number;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  equipped_frame_code?: string | null;
  is_admin?: boolean;
  admin_frame_color?: string | null;
  admin_frame_style?: string | null;
  rank: number;
};

export type LeaderboardApartmentEntry = {
  id: number;
  building_code: string;
  apartment_number: number;
  total_cleanings: number;
  equipped_frame_code?: string | null;
  avatar_url?: string | null;
  current_residents: number;
  rank: number;
};
