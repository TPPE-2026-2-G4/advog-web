'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import LoadingDots from '@/components/ui/loadingDots/loadingDots';
import styles from './deleteUserModal.module.css';

export default function DeleteUserModal({
  member,
  isOpen,
  isDeleting,
  error,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !member) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            title="Fechar"
            disabled={isDeleting}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <h2 className={styles.title}>Excluir funcionário?</h2>
          <p className={styles.message}>
            Tem certeza que deseja excluir <strong>{member.nome_func}</strong>?
            Esta ação não poderá ser desfeita.
          </p>
          {error && <p className={styles.error}>{error}</p>}
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
            {isDeleting ? <LoadingDots /> : 'Excluir funcionário'}
          </button>
        </div>
      </div>
    </div>
  );
}
