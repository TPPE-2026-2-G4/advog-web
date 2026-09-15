import { useState, useMemo } from 'react';
import {
  calcularResumoFinanceiro,
  getStatusConcluido,
  isStatusConcluido,
  verificarStatusPorVencimento,
} from '@/utils/financas';
import {
  atualizarFinancas,
  criarFinancas,
  excluirFinancas,
  mudarStatusLancamento,
} from '@/services/financas';

export function useFinancas(initialData, options = {}) {
  const [lancamentos, setLancamentos] = useState(initialData || []);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  const resumo = useMemo(
    () => calcularResumoFinanceiro(lancamentos),
    [lancamentos]
  );

  const handleDeleteLancamento = async (item) => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await excluirFinancas(item.id);
      setLancamentos((current = []) =>
        current.filter((entry) => entry.id !== item.id)
      );
      options.onDelete?.(item);
    } catch (err) {
      setDeleteError(err?.message || 'Erro ao excluir lançamento.');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditLancamento = (item) => {
    setSelectedLancamento(item);
    options.onEdit?.(item);
  };

  const handleCreateLancamento = async (item) => {
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await criarFinancas(item);
      const newItem = {
        ...item,
        ...(response || {}),
        id: response?.id || item.id || Date.now(),
      };
      setLancamentos((current = []) => [newItem, ...current]);
      options.onCreate?.(newItem);
      setIsNewModalOpen(false);
      return newItem;
    } catch (err) {
      setSaveError(err?.message || 'Erro ao criar lançamento.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLancamento = async (item) => {
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await atualizarFinancas(item.id, item);
      const updated = {
        ...item,
        ...(response || {}),
      };
      setLancamentos((current = []) =>
        current.map((entry) => (entry.id === item.id ? updated : entry))
      );
      options.onUpdate?.(updated);
      setSelectedLancamento(null);
      return updated;
    } catch (err) {
      setSaveError(err?.message || 'Erro ao atualizar lançamento.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    setIsUpdatingStatus(true);
    setStatusError('');
    try {
      const isConcluido = isStatusConcluido(item.status);
      const novoStatus = isConcluido
        ? verificarStatusPorVencimento(item)
        : getStatusConcluido(item.tipo);

      const response = await mudarStatusLancamento(item.id, novoStatus);
      const updated = {
        ...item,
        ...(response || {}),
        status: response?.status || novoStatus,
      };

      setLancamentos((current = []) =>
        current.map((entry) => (entry.id === item.id ? updated : entry))
      );
      options.onToggleStatus?.(updated);
      return updated;
    } catch (err) {
      setStatusError(err?.message || 'Erro ao atualizar status.');
      throw err;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    lancamentos,
    setLancamentos,
    resumo,
    totalLancamentos: lancamentos.length,
    isNewModalOpen,
    setIsNewModalOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    selectedLancamento,
    setSelectedLancamento,
    isSaving,
    saveError,
    isDeleting,
    deleteError,
    isUpdatingStatus,
    statusError,
    handleDeleteLancamento,
    handleEditLancamento,
    handleCreateLancamento,
    handleUpdateLancamento,
    handleToggleStatus,
  };
}
