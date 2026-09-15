'use client';

import { AlertTriangle } from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import styles from './DeleteUserModal.module.css';

export default function DeleteUserModal({
  member,
  isOpen,
  isDeleting,
  error,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !member) return null;

  return (
    <Modal
      isOpen={isOpen && Boolean(member)}
      onClose={onClose}
      preventClose={isDeleting}
      className={styles.modal}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={22} />
        </div>
        <ModalCloseButton
          onClose={onClose}
          disabled={isDeleting}
          title="Fechar"
        />
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
    </Modal>
  );
}
