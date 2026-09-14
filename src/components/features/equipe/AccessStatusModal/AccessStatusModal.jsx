'use client';

import { Lock, Unlock } from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import styles from './AccessStatusModal.module.css';

export default function AccessStatusModal({
  member,
  isOpen,
  isUpdating,
  error,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !member) return null;

  const isRevoking = member.status === 'Ativo';
  const actionLabel = isRevoking ? 'Revogar acesso' : 'Permitir acesso';

  return (
    <Modal
      isOpen={isOpen && Boolean(member)}
      onClose={onClose}
      preventClose={isUpdating}
      className={styles.modal}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          {isRevoking ? <Lock size={22} /> : <Unlock size={22} />}
        </div>
        <ModalCloseButton
          onClose={onClose}
          disabled={isUpdating}
          title="Fechar"
        />
      </div>

      <div className={styles.body}>
        <h2 className={styles.title}>{actionLabel}?</h2>
        <p className={styles.message}>
          Tem certeza que deseja {isRevoking ? 'revogar' : 'permitir'} o acesso
          de <strong>{member.nome_func}</strong>?
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
    </Modal>
  );
}
