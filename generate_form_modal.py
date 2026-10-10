content = """'use client';

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
  toProcessUpdatePayload,
} from '@/utils/processo';
import styles from './ProcessFormModal.module.css';

const requiredTextFields = ['titulo', 'tribunal', 'area'];

const getErrorMessage = (error) =>
  error instanceof Error
    ? error.message
    : 'Não foi possível salvar o processo.';

export default function ProcessFormModal({
  process,
  isOpen,
  clientes,
  funcionarios,
  onClose,
  onSave,
}) {
  if (!isOpen) return null;

  return (
    <ProcessFormDialog
      key={process?.processo_id ?? 'new-process'}
      process={process}
      clientes={clientes}
      funcionarios={funcionarios}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ProcessFormDialog({
  process,
  clientes,
  funcionarios,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(process);
  const [formData, setFormData] = useState(() => toProcessFormData(process));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const titleId = useId();
  const errorId = useId();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'cnj' ? formatCnjInput(value) : value,
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!CNJ_REGEX.test(formData.cnj)) {
      setError('Informe o número do processo no formato CNJ.');
      return;
    }

    if (
      !formData.cliente_id ||
      requiredTextFields.some((field) => !formData[field].trim())
    ) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const dateFields = ['data_inicio', 'data_realizado', 'data_prazo'];
    if (
      dateFields.some(
        (field) => formData[field] && !normalizeProcessDate(formData[field])
      )
    ) {
      setError('Verifique o formato das datas preenchidas.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const payload = isEditing
        ? toProcessUpdatePayload(formData, process)
        : toProcessPayload(formData);

      if (Object.keys(payload).length > 0) {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const fieldId = (field) => `${titleId}-${field}`;

  return (
    <Modal
      isOpen
      id="process-form-dialog"
      onClose={onClose}
      preventClose={isSubmitting}
      as="form"
      onSubmit={handleSubmit}
      className={styles.modal}
      overlayClassName={styles.overlay}
      ariaLabelledBy={titleId}
    >
      <div className={styles.header}>
        <h2 id={titleId} className={styles.modalTitle}>
          {isEditing ? 'Editar processo' : 'Novo processo'}
        </h2>
        <ModalCloseButton onClose={onClose} disabled={isSubmitting} />
      </div>

      <div className={styles.body} aria-busy={isSubmitting}>
        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('cnj')}>
              Número do Processo
            </label>
            <input
              id={fieldId('cnj')}
              name="cnj"
              type="text"
              className={styles.input}
              placeholder="0000000-00.0000.0.00.0000"
              value={formData.cnj}
              onChange={handleChange}
              pattern={CNJ_PATTERN}
              maxLength={25}
              disabled={isSubmitting || isEditing}
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
              maxLength={100}
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

        <div className={styles.inputGroup}>
          <label
            className={styles.optionalLabel}
            htmlFor={fieldId('descricao')}
          >
            Descrição
          </label>
          <textarea
            id={fieldId('descricao')}
            name="descricao"
            className={styles.textarea}
            value={formData.descricao}
            onChange={handleChange}
            maxLength={255}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('cliente_id')}>
              Cliente
            </label>
            <select
              id={fieldId('cliente_id')}
              name="cliente_id"
              className={styles.select}
              value={formData.cliente_id}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.cliente_id} value={cliente.cliente_id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
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
            <label
              className={styles.optionalLabel}
              htmlFor={fieldId('funcionario_id')}
            >
              Responsável
            </label>
            <select
              id={fieldId('funcionario_id')}
              name="funcionario_id"
              className={styles.select}
              value={formData.funcionario_id}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Sem responsável</option>
              {funcionarios.map((funcionario) => (
                <option
                  key={funcionario.funcionario_id}
                  value={funcionario.funcionario_id}
                >
                  {funcionario.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor={fieldId('status')}>
              {isEditing ? 'Status' : 'Status Inicial'}
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

        <div className={styles.grid}>
          <div className={styles.inputGroup}>
            <label
              className={styles.optionalLabel}
              htmlFor={fieldId('data_inicio')}
            >
              Data de Início
            </label>
            <input
              id={fieldId('data_inicio')}
              name="data_inicio"
              type="date"
              className={styles.input}
              value={formData.data_inicio}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          <div className={styles.inputGroup}>
            <label
              className={styles.optionalLabel}
              htmlFor={fieldId('data_realizado')}
            >
              Data de Realização
            </label>
            <input
              id={fieldId('data_realizado')}
              name="data_realizado"
              type="date"
              className={styles.input}
              value={formData.data_realizado}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label
            className={styles.optionalLabel}
            htmlFor={fieldId('data_prazo')}
          >
            Próximo Prazo
          </label>
          <input
            id={fieldId('data_prazo')}
            name="data_prazo"
            type="date"
            className={styles.input}
            value={formData.data_prazo}
            onChange={handleChange}
            disabled={isSubmitting}
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
            'Salvar Processo'
          )}
        </button>
      </div>
    </Modal>
  );
}
"""
with open('src/components/features/processos/ProcessFormModal/ProcessFormModal.jsx', 'w') as f:
    f.write(content)
