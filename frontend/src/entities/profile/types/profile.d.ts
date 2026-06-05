export interface Schedule {
  id: number;
  day_of_week: number;
  user_id: number | null;
  username?: string | null;
  is_taken: boolean;
  is_today?: boolean;
}

export interface Task {
  id: number;
  day_of_week: number;
  name: string;
  is_done: boolean;
  is_custom?: boolean;
  can_delete?: boolean;
}

export interface TaskListPayload {
  day_of_week: number;
  tasks: Task[];
  total: number;
  completed: number;
  progress_percent: number;
  can_toggle?: boolean;
  is_my_cleaning_day_today?: boolean;
}
