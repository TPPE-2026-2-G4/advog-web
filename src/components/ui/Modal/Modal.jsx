'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

export function ModalCloseButton({
  onClose,
  disabled = false,
  className = '',
  title = 'Fechar',
  ariaLabel = 'Fechar',
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={`${styles.closeButton} ${className}`.trim()}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
    >
      <X size={20} />
    </button>
  );
}

export default function Modal({
  isOpen,
  onClose,
  preventClose = false,
  as: Component = 'div',
  onSubmit,
  children,
  className = '',
  overlayClassName = '',
  role = 'dialog',
  ariaModal = true,
  ariaLabel,
  ariaLabelledBy,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !preventClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, preventClose, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !preventClose) {
      onClose();
    }
  };

  return (
    <div
      className={`${styles.overlay} ${overlayClassName}`.trim()}
      onClick={handleOverlayClick}
    >
      <Component
        className={`${styles.modal} ${className}`.trim()}
        role={role}
        aria-modal={ariaModal ? 'true' : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onSubmit={onSubmit}
      >
        {children}
      </Component>
    </div>
  );
}
