export const WEEKDAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
] as const;

/** Короткие подписи для сетки расписания */
export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export const WEEKDAY_NAMES = [...WEEKDAYS] as const;

/** @deprecated используйте WEEKDAYS */
export const DAYS = [...WEEKDAYS];
