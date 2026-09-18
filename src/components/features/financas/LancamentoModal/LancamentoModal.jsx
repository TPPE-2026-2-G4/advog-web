'use client';

import { useState } from 'react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import {
  formatDateToBr,
  formatDateToIso,
  getStatusConcluido,
  isStatusConcluido,
  verificarStatusPorVencimento,
} from '@/utils/financas';
import styles from './LancamentoModal.module.css';

const CATEGORIAS = [
  'Honorários',
  'Custas',
  'Despesas Operacionais',
  'Consultoria',
  'Outros',
];

const INITIAL_FORM = {
  tipo: 'entrada',
  titulo: '',
  descricao: '',
  valor: '',
  data: '',
  dataVencimento: '',
  categoria: 'Honorários',
  recorrente: false,
};

function getInitialFormData(initialItem) {
  if (initialItem) {
    return {
      tipo: initialItem.tipo || 'entrada',
      titulo: initialItem.titulo || '',
      descricao: initialItem.descricao || '',
      valor:
        initialItem.valor !== undefined && initialItem.valor !== null
          ? String(initialItem.valor)
          : '',
      data:
        initialItem.dataPagamentoIso ||
        formatDateToIso(initialItem.dataPagamento) ||
        formatDateToIso(initialItem.data_pagamento) ||
        initialItem.dataIso ||
        formatDateToIso(initialItem.data) ||
        '',
      dataVencimento:
        initialItem.dataVencimentoIso ||
        formatDateToIso(initialItem.dataVencimento) ||
        formatDateToIso(initialItem.data_vencimento) ||
        '',
      categoria: initialItem.categoria || 'Honorários',
      recorrente: Boolean(initialItem.recorrente),
    };
  }
  const todayIso = new Date().toISOString().split('T')[0];
  return {
    ...INITIAL_FORM,
    data: todayIso,
  };
}

export default function LancamentoModal({
  isOpen,
  onClose,
  onSave,
  initialItem = null,
}) {
  const [prevInitialItem, setPrevInitialItem] = useState(initialItem);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialItem)
  );
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(initialItem);

  if (initialItem !== prevInitialItem || isOpen !== prevIsOpen) {
    setPrevInitialItem(initialItem);
    setPrevIsOpen(isOpen);
    setFormData(getInitialFormData(initialItem));
    setError('');
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTipoChange = (novoTipo) => {
    setFormData((current) => ({
      ...current,
      tipo: novoTipo,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.titulo.trim()) {
      setError('Por favor, informe o título do lançamento.');
      return;
    }

    const valorLimpo = String(formData.valor)
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');
    const valorNumerico = parseFloat(valorLimpo);

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setError('Por favor, informe um valor válido maior que zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataIso = formData.data ? formatDateToIso(formData.data) : '';
      const dataBr = formData.data ? formatDateToBr(formData.data) : '';
      const dataVencimentoIso = formData.dataVencimento
        ? formatDateToIso(formData.dataVencimento)
        : '';
      const dataVencimentoBr = formData.dataVencimento
        ? formatDateToBr(formData.dataVencimento)
        : '';

      const payload = {
        ...(initialItem || {}),
        tipo: formData.tipo,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        valor: valorNumerico,
        data: dataBr || formData.data,
        dataIso: dataIso || formData.data,
        dataPagamento: dataBr || formData.data || null,
        dataPagamentoIso: dataIso || formData.data || null,
        data_pagamento: dataIso || formData.data || null,
        dataVencimento: dataVencimentoBr || formData.dataVencimento,
        dataVencimentoIso: dataVencimentoIso || formData.dataVencimento,
        data_vencimento:
          dataVencimentoIso ||
          formData.dataVencimento ||
          dataIso ||
          formData.data,
        categoria: formData.categoria,
        recorrente: formData.recorrente,
      };

      // Se for novo lançamento e não tiver status definido:
      if (!payload.status) {
        payload.status = verificarStatusPorVencimento(payload);
      } else if (isStatusConcluido(payload.status)) {
        payload.status = getStatusConcluido(payload.tipo);
      }

      await onSave?.(payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar o lançamento financeiro.');
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
      ariaLabel={
        isEditing
          ? 'Editar Lançamento Financeiro'
          : 'Novo Lançamento Financeiro'
      }
    >
      <div className={styles.header}>
        <h2 className={styles.title}>
          {isEditing
            ? 'Editar Lançamento Financeiro'
            : 'Novo Lançamento Financeiro'}
        </h2>
        <ModalCloseButton
          onClose={onClose}
          disabled={isSubmitting}
          ariaLabel="Fechar"
        />
      </div>

      <div className={styles.body}>
        <div
          className={styles.typeSwitch}
          role="group"
          aria-label="Tipo de lançamento"
        >
          <button
            type="button"
            className={`${styles.typeButton} ${
              formData.tipo === 'entrada' ? styles.typeButtonActive : ''
            }`}
            onClick={() => handleTipoChange('entrada')}
            aria-pressed={formData.tipo === 'entrada'}
          >
            Entrada
          </button>
          <button
            type="button"
            className={`${styles.typeButton} ${
              formData.tipo === 'saida' ? styles.typeButtonActive : ''
            }`}
            onClick={() => handleTipoChange('saida')}
            aria-pressed={formData.tipo === 'saida'}
          >
            Saída
          </button>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="lancamento-titulo">
            Título
          </label>
          <input
            id="lancamento-titulo"
            name="titulo"
            type="text"
            className={styles.input}
            placeholder="Ex: Honorários Martins, Aluguel escritório..."
            value={formData.titulo}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="lancamento-descricao">
            Descrição
          </label>
          <input
            id="lancamento-descricao"
            name="descricao"
            type="text"
            className={styles.input}
            placeholder="Detalhes adicionais..."
            value={formData.descricao}
            onChange={handleChange}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="lancamento-valor">
              Valor
            </label>
            <input
              id="lancamento-valor"
              name="valor"
              type="text"
              inputMode="decimal"
              className={styles.input}
              placeholder="R$ 0,00"
              value={formData.valor}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="lancamento-data">
              Data
            </label>
            <input
              id="lancamento-data"
              name="data"
              type="date"
              className={styles.input}
              value={formData.data}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="lancamento-vencimento">
              Data de Vencimento
            </label>
            <input
              id="lancamento-vencimento"
              name="dataVencimento"
              type="date"
              className={styles.input}
              value={formData.dataVencimento}
              onChange={handleChange}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="lancamento-categoria">
              Categoria
            </label>
            <select
              id="lancamento-categoria"
              name="categoria"
              className={styles.select}
              value={formData.categoria}
              onChange={handleChange}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className={styles.checkboxContainer}>
          <input
            type="checkbox"
            name="recorrente"
            className={styles.checkbox}
            checked={formData.recorrente}
            onChange={handleChange}
          />
          <span className={styles.checkboxText}>
            Este lançamento é recorrente
          </span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          onClick={onClose}
          className={styles.cancelBtn}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.saveBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoadingDots />
          ) : isEditing ? (
            'Salvar Alterações'
          ) : (
            'Salvar Lançamento'
          )}
        </button>
      </div>
    </Modal>
  );
}
