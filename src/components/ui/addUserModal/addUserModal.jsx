import { X } from 'lucide-react';
import { useState } from 'react';
import styles from './addUserModal.module.css';

export default function AddUserModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({ nome: '', email: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const funcionario = await onCreated(formData);
      setFormData({ nome: '', email: '' });
      onClose();
      return funcionario;
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2 className={styles.title}>Adicionar Novo Usuário</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
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

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.addBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  );
}
