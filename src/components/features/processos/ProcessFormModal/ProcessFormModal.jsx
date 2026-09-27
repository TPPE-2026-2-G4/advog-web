'use client';

import { useId, useState } from 'react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import {
  CNJ_PATTERN,
  CNJ_REGEX,
  PROCESS_STATUS,
  formatCnjInput,
  normalizeProcessDate,
  toProcessFormData,
  toProcessPayload,
} from '@/utils/processo';
import styles from './ProcessFormModal.module.css';

const requiredTextFields = [
  'titulo',
  'cliente',
  'tribunal',
  'area',
  'responsavel',
];

const getErrorMessage = (error) =>
  error instanceof Error
    ? error.message
    : 'Não foi possível salvar o processo.';

export default function ProcessFormModal({ process, isOpen, onClose, onSave }) {
  if (!isOpen) return null;

  return (
    <ProcessFormDialog
      key={process?.id ?? 'new-process'}
      process={process}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ProcessFormDialog({ process, onClose, onSave }) {
  const isEditing = Boolean(process);
  const [formData, setFormData] = useState(() => toProcessFormData(process));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();
  const errorId = useId();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'id' ? formatCnjInput(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!CNJ_REGEX.test(formData.id)) {
      setError('Informe o número do processo no formato CNJ.');
      return;
    }

    if (requiredTextFields.some((field) => !formData[field].trim())) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!normalizeProcessDate(formData.prazo)) {
      setError('Informe um próximo prazo válido.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSave(toProcessPayload(formData, { includeId: !isEditing }));
      onClose();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldId = (field) => `${titleId}-${field}`;

  return (
    <Modal
      isOpen
      onClose={onClose}
      preventClose={isSubmitting}
      as="form"
      onSubmit={handleSubmit}
      className={styles.modal}
      ariaLabelledBy={titleId}
    >
      <div className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            {isEditing ? 'Editar Processo' : 'Novo Processo'}
          </h2>
          <p className={styles.subtitle}>
            {isEditing
              ? 'Atualize os dados do processo selecionado.'
              : 'Preencha os dados para cadastrar um processo.'}
          </p>
          <p className={styles.requiredHint}>
            <span aria-hidden="true">*</span> Campos obrigatórios
          </p>
        </div>
        <ModalCloseButton onClose={onClose} disabled={isSubmitting} />
      </div>

      <div className={styles.body} aria-busy={isSubmitting}>
        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('id')}>
              Número do Processo
            </label>
            <input
              id={fieldId('id')}
              name="id"
              type="text"
              className={styles.input}
              placeholder="0000000-00.0000.0.00.0000"
              value={formData.id}
              onChange={handleChange}
              inputMode="numeric"
              pattern={CNJ_PATTERN}
              minLength={25}
              maxLength={25}
              readOnly={isEditing}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('tribunal')}>
              Tribunal
            </label>
            <input
              id={fieldId('tribunal')}
              name="tribunal"
              type="text"
              className={styles.input}
              value={formData.tribunal}
              onChange={handleChange}
              maxLength={20}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor={fieldId('titulo')}>
            Título do Caso
          </label>
          <input
            id={fieldId('titulo')}
            name="titulo"
            type="text"
            className={styles.input}
            placeholder="Ex.: Ação indenizatória"
            value={formData.titulo}
            onChange={handleChange}
            maxLength={100}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('cliente')}>
              Cliente
            </label>
            <input
              id={fieldId('cliente')}
              name="cliente"
              type="text"
              className={styles.input}
              value={formData.cliente}
              onChange={handleChange}
              maxLength={100}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('area')}>
              Área de Atuação
            </label>
            <input
              id={fieldId('area')}
              name="area"
              type="text"
              className={styles.input}
              value={formData.area}
              onChange={handleChange}
              maxLength={100}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('responsavel')}>
              Responsável
            </label>
            <input
              id={fieldId('responsavel')}
              name="responsavel"
              type="text"
              className={styles.input}
              value={formData.responsavel}
              onChange={handleChange}
              maxLength={100}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('status')}>
              Status
            </label>
            <select
              id={fieldId('status')}
              name="status"
              className={styles.select}
              value={formData.status}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            >
              {PROCESS_STATUS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor={fieldId('prazo')}>
            Próximo Prazo
          </label>
          <input
            id={fieldId('prazo')}
            name="prazo"
            type="date"
            className={styles.input}
            value={formData.prazo}
            onChange={handleChange}
            disabled={isSubmitting}
            required
          />
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
          className={styles.cancelButton}
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoadingDots />
          ) : isEditing ? (
            'Salvar alterações'
          ) : (
            'Salvar processo'
          )}
        </button>
      </div>
    </Modal>
  );
}
