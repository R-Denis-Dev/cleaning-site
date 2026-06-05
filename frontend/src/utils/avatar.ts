const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

export function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  if (avatarUrl.startsWith('/')) {
    // В dev Vite проксирует /uploads — относительный путь надёжнее
    if (API_ORIGIN) {
      return `${API_ORIGIN.replace(/\/$/, '')}${avatarUrl}`;
    }
    return avatarUrl;
  }
  return avatarUrl;
}

export function displayName(user: {
  display_name?: string | null;
  username: string;
}): string {
  return user.display_name?.trim() || user.username;
}
