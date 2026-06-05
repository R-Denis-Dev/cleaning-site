import { AxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? String(d)).join(', ');
    }
  }
  return fallback;
}
