'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import LoadingDots from '@/components/ui/loadingDots/loadingDots';
import PermissionChecklist from '@/components/ui/permissionChecklist/permissionChecklist';
import { createEmptyPermission } from '@/constants/permissions';
import styles from './rolePermissionsModal.module.css';

export default function RolePermissionsModal({
  role,
  isOpen,
  onClose,
  onSave,
}) {
  if (!isOpen || !role) return null;

  return (
    <RolePermissionsForm
      key={role.cargo_id ?? role.nome_cargo}
      role={role}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function RolePermissionsForm({ role, onClose, onSave }) {
  const [permission, setPermission] = useState(() => ({
    ...(role.permissao ?? createEmptyPermission()),
  }));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleToggle = (permissionName) => {
    setPermission((current) => ({
      ...current,
      [permissionName]: !current[permissionName],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSave({
        cargo_id: role.cargo_id,
        permissao: { ...permission },
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível salvar as permissões.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleId = 'role-permissions-modal-title';
  const descriptionId = 'role-permissions-modal-description';

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isSubmitting}
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            Permissões — Perfil &quot;{role.nome_cargo}&quot;
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fechar"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.description} id={descriptionId}>
            Marque as permissões que o perfil <strong>{role.nome_cargo}</strong>{' '}
            deve ter.
          </p>

          <PermissionChecklist
            legend={`Permissões do perfil ${role.nome_cargo}`}
            permission={permission}
            onToggle={handleToggle}
            disabled={isSubmitting}
          />

          <p className={styles.counter} aria-live="polite">
            {Object.values(permission).filter(Boolean).length} de{' '}
            {Object.keys(permission).length} permissões selecionadas
          </p>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.impactMessage}>
            Alterações se aplicam a todos os usuários com este cargo.
          </p>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingDots /> : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
