import { FrameInfo } from '@/types/frames';

const FRAME_RING_MAP: Record<string, string> = {
  'avatar-ring-gold': 'avatar-ring-gold',
  'avatar-ring-silver': 'avatar-ring-silver',
  'avatar-ring-bronze': 'avatar-ring-bronze',
  'avatar-ring-teal': 'avatar-ring-teal',
  'avatar-ring-violet': 'avatar-ring-violet',
  'avatar-ring-legend': 'avatar-ring-legend',
};

export function ringClassForFrame(frameCode?: string | null, frames?: FrameInfo[]): string {
  if (!frameCode) return '';
  const fromCatalog = frames?.find((f) => f.code === frameCode)?.ring_class;
  if (fromCatalog) return fromCatalog;
  if (frameCode.startsWith('user_rank_') || frameCode.startsWith('apt_rank_')) {
    const n = frameCode.split('_').pop();
    if (n === '1') return 'avatar-ring-gold';
    if (n === '2') return 'avatar-ring-silver';
    if (n === '3') return 'avatar-ring-bronze';
  }
  if (frameCode.includes('100')) return 'avatar-ring-legend';
  if (frameCode.includes('50') || frameCode.includes('25')) return 'avatar-ring-violet';
  return FRAME_RING_MAP[frameCode] ?? 'avatar-ring-teal';
}
