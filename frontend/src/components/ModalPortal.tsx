import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  children: ReactNode;
  open: boolean;
};

export function ModalPortal({ children, open }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(children, document.body);
}
