'use client';

import { LogOut } from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import styles from './LogoutConfirmModal.module.css';

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isLoggingOut}
      className={styles.modal}
      ariaLabel="Confirmar saída"
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <LogOut size={22} />
        </div>
        <ModalCloseButton
          onClose={onClose}
          disabled={isLoggingOut}
          title="Fechar"
        />
      </div>

      <div className={styles.body}>
        <h2 className={styles.title}>Deseja sair da sua conta?</h2>
        <p className={styles.message}>
          Tem certeza que deseja encerrar sua sessão? Você precisará fazer login
          novamente para acessar o sistema.
        </p>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          onClick={onClose}
          className={styles.cancelButton}
          disabled={isLoggingOut}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={styles.confirmButton}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? <LoadingDots /> : 'Confirmar e sair'}
        </button>
      </div>
    </Modal>
  );
}
