'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import LoadingDots from '@/components/ui/loadingDots/loadingDots';
import PermissionChecklist from '@/components/ui/permissionChecklist/permissionChecklist';
import { createEmptyPermission } from '@/constants/permissions';
import styles from './newRoleModal.module.css';

const normalizeRoleName = (roleName) =>
  roleName.trim().toLocaleLowerCase('pt-BR');

export default function NewRoleModal({
  isOpen,
  roles = [],
  onClose,
  onCreate,
}) {
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permission, setPermission] = useState(createEmptyPermission);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

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

    const trimmedRoleName = roleName.trim();
    if (!trimmedRoleName) {
      setError('Informe o nome do cargo.');
      return;
    }

    const normalizedRoleName = normalizeRoleName(trimmedRoleName);
    const roleAlreadyExists = roles.some(
      (role) => normalizeRoleName(role.nome_cargo ?? '') === normalizedRoleName
    );

    if (roleAlreadyExists) {
      setError('Já existe um cargo com esse nome.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onCreate({
        nome_cargo: trimmedRoleName,
        descricao: roleDescription.trim(),
        permissao: { ...permission },
      });
      setRoleName('');
      setRoleDescription('');
      setPermission(createEmptyPermission());
      onClose();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Não foi possível criar o cargo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleId = 'new-role-modal-title';
  const roleNameErrorId = error ? 'new-role-modal-error' : undefined;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={isSubmitting}
        noValidate
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            Criar Novo Cargo
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
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="new-role-name">
              Nome do Cargo
            </label>
            <input
              id="new-role-name"
              name="nome_cargo"
              type="text"
              className={styles.input}
              placeholder="Ex: Paralegal, Sócio, Gerente..."
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              aria-describedby={roleNameErrorId}
              aria-invalid={Boolean(error)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="new-role-description">
              Descrição (opcional)
            </label>
            <textarea
              id="new-role-description"
              name="descricao"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Descreva as responsabilidades deste cargo"
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              maxLength={255}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <PermissionChecklist
            legend="Permissões do cargo"
            permission={permission}
            onToggle={handleToggle}
            disabled={isSubmitting}
          />

          <p className={styles.counter} aria-live="polite">
            {Object.values(permission).filter(Boolean).length} de{' '}
            {Object.keys(permission).length} permissões selecionadas
          </p>

          {error && (
            <p className={styles.error} id="new-role-modal-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.footer}>
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
            className={styles.createButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoadingDots /> : 'Criar Cargo'}
          </button>
        </div>
      </form>
    </div>
  );
}
