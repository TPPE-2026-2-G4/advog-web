'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useId } from 'react';
import LoadingDots from '@/components/ui/loadingDots/loadingDots';
import styles from './deleteRoleModal.module.css';

export default function DeleteRoleModal({
  role,
  isOpen,
  isDeleting = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !role) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        aria-busy={isDeleting}
      >
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fechar"
            disabled={isDeleting}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <h2 className={styles.title} id={titleId}>
            Excluir cargo?
          </h2>
          <p className={styles.message}>
            Tem certeza que deseja excluir o cargo{' '}
            <strong>{role.nome_cargo}</strong>? Esta ação não poderá ser
            desfeita.
          </p>
          <p className={styles.hint}>
            Cargos associados a funcionários não podem ser excluídos.
          </p>
          {error && (
            <p className={styles.error} id={errorId} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles.deleteButton}
            disabled={isDeleting}
          >
            {isDeleting ? <LoadingDots /> : 'Excluir cargo'}
          </button>
        </div>
      </div>
    </div>
  );
}
