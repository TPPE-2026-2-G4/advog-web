'use client';

import { Lock, Unlock, X } from 'lucide-react';
import { useEffect } from 'react';
import LoadingDots from '@/components/ui/loadingDots/loadingDots';
import styles from './accessStatusModal.module.css';

export default function AccessStatusModal({
  member,
  isOpen,
  isUpdating,
  error,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isUpdating) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUpdating, onClose]);

  if (!isOpen || !member) return null;

  const isRevoking = member.status === 'Ativo';
  const actionLabel = isRevoking ? 'Revogar acesso' : 'Permitir acesso';

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isUpdating) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            {isRevoking ? <Lock size={22} /> : <Unlock size={22} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            title="Fechar"
            disabled={isUpdating}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <h2 className={styles.title}>{actionLabel}?</h2>
          <p className={styles.message}>
            Tem certeza que deseja {isRevoking ? 'revogar' : 'permitir'} o
            acesso de <strong>{member.nome_func}</strong>?
          </p>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isUpdating}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmButton}
            disabled={isUpdating}
          >
            {isUpdating ? <LoadingDots /> : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
