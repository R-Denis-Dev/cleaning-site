import { ThemeToggle } from '@/components/ThemeToggle';

export function ThemeBar() {
  return (
    <div className="fixed top-4 right-4 z-40">
      <ThemeToggle />
    </div>
  );
}
