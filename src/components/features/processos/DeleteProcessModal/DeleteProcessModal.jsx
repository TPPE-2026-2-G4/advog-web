'use client';

import { AlertTriangle } from 'lucide-react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import styles from './DeleteProcessModal.module.css';

export default function DeleteProcessModal({
  process,
  isDeleting,
  error,
  onClose,
  onConfirm,
}) {
  if (!process) return null;

  const titleId = 'delete-process-title';

  return (
    <Modal
      isOpen={Boolean(process)}
      onClose={onClose}
      preventClose={isDeleting}
      className={styles.modal}
      ariaLabelledBy={titleId}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <ModalCloseButton onClose={onClose} disabled={isDeleting} />
      </div>

      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          Excluir processo?
        </h2>
        <p className={styles.message}>
          Tem certeza que deseja excluir <strong>{process.titulo}</strong> (
          {process.cnj})? Esta ação não poderá ser desfeita.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? <LoadingDots /> : 'Excluir processo'}
        </button>
      </div>
    </Modal>
  );
}
