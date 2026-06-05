import { useEffect } from 'react';

import { useTheme } from '@/app/contexts/ThemeContext';

export function GlobalThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.add('theme-transition');
    const t = window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 500);
    return () => window.clearTimeout(t);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="global-theme-toggle"
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      aria-label="Переключить тему"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
