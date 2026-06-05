import type { CSSProperties } from 'react';

export const ADMIN_FRAME_OFF = 'off';

export const ADMIN_FRAME_COLORS = [
  { id: 'white', label: 'Белый' },
  { id: 'blue', label: 'Синий' },
  { id: 'sky', label: 'Голубой' },
  { id: 'green', label: 'Зелёный' },
  { id: 'red', label: 'Красный' },
  { id: 'orange', label: 'Оранжевый' },
  { id: 'purple', label: 'Фиолетовый' },
  { id: 'teal', label: 'Бирюзовый' },
  { id: 'gold', label: 'Золотой' },
  { id: 'rose', label: 'Розовый' },
] as const;

export type AdminFrameColorId = (typeof ADMIN_FRAME_COLORS)[number]['id'];

const RING_STYLE: Record<
  AdminFrameColorId,
  { gradient: string; glow: string; swatch: string }
> = {
  white: {
    gradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #ffffff)',
    glow: '0 0 12px rgba(248, 250, 252, 0.85), 0 0 20px rgba(226, 232, 240, 0.4)',
    swatch: '#e2e8f0',
  },
  blue: {
    gradient: 'linear-gradient(135deg, #60a5fa, #2563eb, #1d4ed8)',
    glow: '0 0 12px rgba(37, 99, 235, 0.8), 0 0 20px rgba(96, 165, 250, 0.45)',
    swatch: '#2563eb',
  },
  sky: {
    gradient: 'linear-gradient(135deg, #7dd3fc, #0ea5e9, #0284c7)',
    glow: '0 0 12px rgba(14, 165, 233, 0.8), 0 0 20px rgba(125, 211, 252, 0.45)',
    swatch: '#0ea5e9',
  },
  green: {
    gradient: 'linear-gradient(135deg, #4ade80, #16a34a, #15803d)',
    glow: '0 0 12px rgba(34, 197, 94, 0.75), 0 0 20px rgba(74, 222, 128, 0.4)',
    swatch: '#16a34a',
  },
  red: {
    gradient: 'linear-gradient(135deg, #f87171, #dc2626, #b91c1c)',
    glow: '0 0 12px rgba(239, 68, 68, 0.75), 0 0 20px rgba(248, 113, 113, 0.4)',
    swatch: '#dc2626',
  },
  orange: {
    gradient: 'linear-gradient(135deg, #fdba74, #ea580c, #c2410c)',
    glow: '0 0 12px rgba(249, 115, 22, 0.75), 0 0 20px rgba(253, 186, 116, 0.4)',
    swatch: '#ea580c',
  },
  purple: {
    gradient: 'linear-gradient(135deg, #c4b5fd, #7c3aed, #6d28d9)',
    glow: '0 0 12px rgba(124, 58, 237, 0.75), 0 0 20px rgba(196, 181, 253, 0.4)',
    swatch: '#7c3aed',
  },
  teal: {
    gradient: 'linear-gradient(135deg, #5eead4, #0d9488, #0f766e)',
    glow: '0 0 12px rgba(20, 184, 166, 0.8), 0 0 20px rgba(94, 234, 212, 0.45)',
    swatch: '#0d9488',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #fde68a, #f59e0b, #d97706)',
    glow: '0 0 12px rgba(245, 158, 11, 0.8), 0 0 20px rgba(253, 230, 138, 0.45)',
    swatch: '#f59e0b',
  },
  rose: {
    gradient: 'linear-gradient(135deg, #fda4af, #e11d48, #be123c)',
    glow: '0 0 12px rgba(244, 63, 94, 0.75), 0 0 20px rgba(253, 164, 175, 0.4)',
    swatch: '#e11d48',
  },
};

export function resolveAdminRingColor(color?: string | null): AdminFrameColorId | null {
  if (!color || color === ADMIN_FRAME_OFF) return null;
  const found = ADMIN_FRAME_COLORS.find((c) => c.id === color);
  return found?.id ?? 'white';
}

export function isAdminRingEnabled(color?: string | null): boolean {
  return resolveAdminRingColor(color) !== null;
}

/** Стили светящейся обводки (padding + gradient + glow). */
export function adminRingStyle(color?: string | null): CSSProperties | undefined {
  const id = resolveAdminRingColor(color);
  if (!id) return undefined;
  const s = RING_STYLE[id];
  return {
    padding: 3,
    borderRadius: '9999px',
    background: s.gradient,
    boxShadow: s.glow,
  };
}

export function adminSwatchStyle(colorId: AdminFrameColorId): CSSProperties {
  const s = RING_STYLE[colorId];
  return {
    padding: 2,
    borderRadius: '9999px',
    background: s.gradient,
    boxShadow: s.glow,
  };
}
