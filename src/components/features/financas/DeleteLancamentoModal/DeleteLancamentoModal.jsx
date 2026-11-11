'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import Toast from '@/components/ui/Toast/Toast';
import styles from './DeleteLancamentoModal.module.css';
import SerieScope from '../LancamentoModal/SerieScope';

export default function DeleteLancamentoModal({
  lancamento,
  isOpen,
  isDeleting,
  error,
  onClose,
  onConfirm,
}) {
  const [alcance, setAlcance] = useState('individual');
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
        {lancamento.serie_id && (
          <SerieScope
            value={alcance}
            onChange={setAlcance}
            disabled={isDeleting}
          />
        )}
        <Toast message={error} />
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
          onClick={() =>
            lancamento.serie_id ? onConfirm(alcance) : onConfirm()
          }
          className={styles.deleteButton}
          disabled={isDeleting}
        >
          {isDeleting ? <LoadingDots /> : 'Excluir lançamento'}
        </button>
      </div>
    </Modal>
  );
}
