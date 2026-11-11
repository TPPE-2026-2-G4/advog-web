'use client';

import { useId, useMemo, useState } from 'react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import Toast from '@/components/ui/Toast/Toast';
import AutocompleteClient from '@/components/features/clientes/AutocompleteClient/AutocompleteClient';
import AutocompleteResponsible from '@/components/features/clientes/AutocompleteResponsible/AutocompleteResponsible';
import { isAdministratorAccount } from '@/utils/funcionario';
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

const requiredFieldLabels = {
  titulo: 'Título do Caso',
  tribunal: 'Tribunal',
  cliente_id: 'Cliente',
  area: 'Área de Atuação',
  data_inicio: 'Data de Início',
  data_prazo: 'Próximo Prazo',
};
const dateFields = ['data_inicio', 'data_realizado', 'data_prazo'];

const getErrorMessage = (error) =>
  error instanceof Error
    ? error.message
    : 'Não foi possível salvar o processo.';

export default function ProcessFormModal({
  process,
  isOpen,
  clientes = [],
  funcionarios = [],
  onClose,
  onSave,
}) {
  const availableFuncionarios = useMemo(
    () => (funcionarios || []).filter((f) => !isAdministratorAccount(f)),
    [funcionarios]
  );

  if (!isOpen) return null;

  return (
    <ProcessFormDialog
      key={process?.processo_id ?? 'new-process'}
      process={process}
      clientes={clientes}
      funcionarios={availableFuncionarios}
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
  const [formData, setFormData] = useState(() => {
    const initial = toProcessFormData(process);
    if (!process && !initial.data_inicio) {
      initial.data_inicio = new Date().toISOString().split('T')[0];
    }
    return initial;
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();

  const availableFuncionarios = useMemo(
    () => (funcionarios || []).filter((f) => !isAdministratorAccount(f)),
    [funcionarios]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'cnj' ? formatCnjInput(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!CNJ_REGEX.test(formData.cnj)) {
      setError(
        'O número do processo deve seguir o formato CNJ: 0000000-00.0000.0.00.0000.'
      );
      return;
    }

    const missingFields = Object.keys(requiredFieldLabels).filter(
      (field) => !String(formData[field] ?? '').trim()
    );
    if (missingFields.length > 0) {
      setError(
        `Preencha os campos obrigatórios: ${missingFields
          .map((field) => requiredFieldLabels[field])
          .join(', ')}.`
      );
      return;
    }

    if (
      dateFields.some(
        (field) => formData[field] && !normalizeProcessDate(formData[field])
      )
    ) {
      setError('Há uma data inválida. Confira as datas informadas.');
      return;
    }

    const selectedFunc = availableFuncionarios.find(
      (f) =>
        String(f.funcionario_id || f.id) === String(formData.funcionario_id)
    );
    if (
      formData.funcionario_id &&
      (!selectedFunc || isAdministratorAccount(selectedFunc))
    ) {
      setError(
        'A conta de administrador não pode ser responsável por processos. Escolha outro responsável.'
      );
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const payload = isEditing
        ? toProcessUpdatePayload(formData, process)
        : toProcessPayload(formData);
      await onSave(payload);
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
            <AutocompleteClient
              id={fieldId('cliente_id')}
              name="cliente_id"
              clienteId={formData.cliente_id}
              onChange={(id) =>
                setFormData((current) => ({
                  ...current,
                  cliente_id: id ? String(id) : '',
                }))
              }
              clientes={clientes}
              disabled={isSubmitting}
              required
              placeholder="Selecione um cliente"
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
            <label
              className={styles.optionalLabel}
              htmlFor={fieldId('funcionario_id')}
            >
              Responsável
            </label>
            <AutocompleteResponsible
              id={fieldId('funcionario_id')}
              name="funcionario_id"
              responsavelId={formData.funcionario_id}
              onChange={(id) =>
                setFormData((current) => ({
                  ...current,
                  funcionario_id: id ? String(id) : '',
                }))
              }
              funcionarios={availableFuncionarios}
              disabled={isSubmitting}
              placeholder="Sem responsável"
            />
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
            <label className={styles.label} htmlFor={fieldId('data_inicio')}>
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
              required
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
          <label className={styles.label} htmlFor={fieldId('data_prazo')}>
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
            required
          />
        </div>

        <Toast
          message={error}
          onClose={() => setError('')}
          fallback="Não foi possível salvar o processo."
        />
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
