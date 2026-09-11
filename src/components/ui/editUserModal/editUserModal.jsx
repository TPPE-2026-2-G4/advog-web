'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import LoadingDots from '@/components/ui/loadingDots/loadingDots';
import styles from './editUserModal.module.css';

const emptyForm = {
  nome: '',
  email: '',
  cargo: '',
};

const findMemberRoleId = (member, roles) => {
  if (member?.cargo_id !== undefined && member?.cargo_id !== null) {
    return String(member.cargo_id);
  }

  const memberRoleName = member?.cargo;
  if (!memberRoleName) return '';

  const matchingRole = roles.find(
    (role) =>
      role.nome_cargo?.toLocaleLowerCase('pt-BR') ===
      String(memberRoleName).toLocaleLowerCase('pt-BR')
  );

  return matchingRole ? String(matchingRole.cargo_id) : '';
};

const toFormData = (member, roles) => ({
  nome: member?.nome_func ?? member?.nome ?? '',
  email: member?.email_func ?? member?.email ?? '',
  cargo: findMemberRoleId(member, roles),
});

const getErrorMessage = (error) => {
  if (typeof error === 'string' && error) return error;
  if (error?.message) return error.message;
  return 'Não foi possível atualizar o usuário.';
};

export default function EditUserModal({
  member,
  isOpen,
  roles = [],
  isRoleLocked = false,
  onClose,
  onSave,
}) {
  if (!isOpen || !member) return null;

  const memberKey =
    member.funcionario_id ??
    member.id ??
    member.email_func ??
    member.email ??
    'selected-member';

  return (
    <EditUserDialog
      key={memberKey}
      member={member}
      roles={roles}
      isRoleLocked={isRoleLocked}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditUserDialog({ member, roles, isRoleLocked, onClose, onSave }) {
  const [formData, setFormData] = useState(() =>
    member ? toFormData(member, roles) : emptyForm
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();
  const errorId = useId();
  const roleHintId = useId();
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    const selectedRole = roles.find(
      (role) => String(role.cargo_id) === formData.cargo
    );

    try {
      await onSave({
        nome: formData.nome,
        email: formData.email,
        cargo: selectedRole?.cargo_id ?? formData.cargo,
      });
      onClose();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <form
        className={styles.modal}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        aria-busy={isSubmitting}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Editar Usuário
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Fechar"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="edit-user-name">
              Nome Completo
            </label>
            <input
              ref={nameInputRef}
              id="edit-user-name"
              name="nome"
              type="text"
              className={styles.input}
              value={formData.nome}
              onChange={handleChange}
              autoComplete="name"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="edit-user-email">
              E-mail
            </label>
            <input
              id="edit-user-email"
              name="email"
              type="email"
              className={styles.input}
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="edit-user-role">
              Nível de Acesso
            </label>
            <select
              id="edit-user-role"
              name="cargo"
              className={styles.select}
              value={formData.cargo}
              onChange={handleChange}
              aria-describedby={isRoleLocked ? roleHintId : undefined}
              disabled={isSubmitting || isRoleLocked}
              required
            >
              <option value="" disabled>
                Selecione o perfil
              </option>
              {roles.map((role) => (
                <option key={role.cargo_id} value={role.cargo_id}>
                  {role.nome_cargo}
                </option>
              ))}
            </select>
            {isRoleLocked && (
              <p id={roleHintId} className={styles.roleHint}>
                Único administrador do sistema — cargo não pode ser alterado.
              </p>
            )}
          </div>

          {error && (
            <p id={errorId} className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={handleClose}
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
