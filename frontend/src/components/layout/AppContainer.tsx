import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'main' | 'section';
};

/** Единая ширина контента: телефон → планшет → ноутбук → монитор */
export function AppContainer({ children, className = '', as: Tag = 'div' }: Props) {
  return <Tag className={`app-container ${className}`.trim()}>{children}</Tag>;
}
