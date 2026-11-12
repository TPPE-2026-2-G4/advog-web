'use client';

import { useState } from 'react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import { isAdministratorRole } from '@/utils/funcionario';
import Toast from '@/components/ui/Toast/Toast';
import styles from './AddUserModal.module.css';

const emptyFormData = { nome: '', email: '', cargo_id: '' };

export default function AddUserModal({
  isOpen,
  roles = [],
  onClose,
  onCreated,
}) {
  const availableRoles = roles.filter((role) => !isAdministratorRole(role));
  const [formData, setFormData] = useState(emptyFormData);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'cargo_id' && value ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const funcionario = await onCreated(formData);
      setFormData(emptyFormData);
      onClose();
      return funcionario;
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      as="form"
      onSubmit={handleSubmit}
      className={styles.modal}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Adicionar Novo Usuário</h2>
        <ModalCloseButton
          onClose={onClose}
          disabled={isSubmitting}
          ariaLabel="Fechar"
        />
      </div>

      <div className={styles.body}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="nome">
            Nome completo
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            className={styles.input}
            placeholder="Dr(a). Nome Sobrenome"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="email">
            Email empresarial
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            placeholder="nome@carreiro.adv.br"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="cargo_id">
            Cargo
          </label>
          <select
            id="cargo_id"
            name="cargo_id"
            className={styles.select}
            value={formData.cargo_id}
            onChange={handleChange}
            required
            disabled={isSubmitting || availableRoles.length === 0}
          >
            <option value="" disabled>
              {availableRoles.length === 0
                ? 'Nenhum cargo disponível'
                : 'Selecione um cargo'}
            </option>
            {availableRoles.map((role) => (
              <option key={role.cargo_id} value={role.cargo_id}>
                {role.nome_cargo}
              </option>
            ))}
          </select>
          {availableRoles.length === 0 && (
            <p className={styles.helperText}>
              Crie um cargo antes de adicionar um usuário.
            </p>
          )}
        </div>

        <Toast message={error} onClose={() => setError('')} />
      </div>

      <div className={styles.footer}>
        <button type="button" onClick={onClose} className={styles.cancelBtn}>
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.addBtn}
          disabled={isSubmitting || availableRoles.length === 0}
        >
          {isSubmitting ? <LoadingDots /> : 'Adicionar'}
        </button>
      </div>
    </Modal>
  );
}
