export interface User {
  id: number;
  username: string;
  email: string | null;
  created_at: string;
}

export interface CleaningSchedule {
  id: number;
  user_id: number | null;
  day_of_week: number;        // 0=Пн...6=Вс
  scheduled_time: string;     // "18:00"
  is_completed: boolean;
  completed_at: string | null;
  week_start: string;
  is_taken: boolean;
}

export interface Notification {
  type: string;
  message: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}
