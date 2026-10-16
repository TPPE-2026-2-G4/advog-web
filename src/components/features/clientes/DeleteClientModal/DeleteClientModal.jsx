'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import styles from './DeleteClientModal.module.css';

export default function DeleteClientModal({
  isOpen,
  onClose,
  onConfirm,
  cliente = null,
  isDeleting = false,
}) {
  const [error, setError] = useState('');

  if (!cliente) return null;

  const handleClose = () => {
    if (isDeleting) return;
    setError('');
    onClose?.();
  };

  const handleConfirm = async () => {
    setError('');
    try {
      const clienteId = cliente.cliente_id || cliente.id;
      await onConfirm?.(clienteId);
    } catch (err) {
      setError(err.message || 'Erro ao excluir cliente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} preventClose={isDeleting}>
      <div className={styles.header}>
        <h2 className={styles.title}>Excluir cliente</h2>
        <ModalCloseButton onClose={handleClose} disabled={isDeleting} />
      </div>

      <div className={styles.body}>
        <p className={styles.message}>
          Tem certeza que deseja excluir <strong>{cliente.nome}</strong>? Esta
          ação é permanente.
        </p>

        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={handleClose}
          disabled={isDeleting}
        >
          Cancelar
        </button>

        <button
          type="button"
          className={styles.deleteBtn}
          onClick={handleConfirm}
          disabled={isDeleting}
        >
          <Trash2 size={16} />
          {isDeleting ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  );
}
