'use client';

import { AlertTriangle } from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import styles from './DeleteLancamentoModal.module.css';

export default function DeleteLancamentoModal({
  lancamento,
  isOpen,
  isDeleting,
  error,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !lancamento) return null;

  return (
    <Modal
      isOpen={isOpen && Boolean(lancamento)}
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
        <h2 className={styles.title}>Excluir lançamento?</h2>
        <p className={styles.message}>
          Tem certeza que deseja excluir o lançamento{' '}
          <strong>{lancamento.titulo}</strong>? Esta ação não poderá ser
          desfeita.
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
          {isDeleting ? <LoadingDots /> : 'Excluir lançamento'}
        </button>
      </div>
    </Modal>
  );
}
