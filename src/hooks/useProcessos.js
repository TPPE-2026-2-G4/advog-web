import { useState } from 'react';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from '@/services/processos';

export const PROCESS_PAGE_SIZE = 5;

const getErrorMessage = (error, fallbackMessage) =>
  error instanceof Error ? error.message : fallbackMessage;

export function useProcessos(initialData = [], initialError = '') {
  const [processos, setProcessos] = useState(initialData);
  const [loadError, setLoadError] = useState(initialError);
  const [isReloading, setIsReloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [detailProcess, setDetailProcess] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const totalPages = Math.max(
    1,
    Math.ceil(processos.length / PROCESS_PAGE_SIZE)
  );
  const pageStart = (currentPage - 1) * PROCESS_PAGE_SIZE;
  const visibleProcesses = processos.slice(
    pageStart,
    pageStart + PROCESS_PAGE_SIZE
  );

  const reloadProcesses = async () => {
    setIsReloading(true);

    try {
      const receivedProcesses = await listarProcessos();
      setProcessos(receivedProcesses);
      setLoadError('');
      setCurrentPage(1);
    } catch (error) {
      setLoadError(
        getErrorMessage(error, 'Não foi possível carregar os processos.')
      );
    } finally {
      setIsReloading(false);
    }
  };

  const openCreateForm = () => {
    setEditingProcess(null);
    setIsFormOpen(true);
  };

  const openEditForm = (processo) => {
    setEditingProcess(processo);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProcess(null);
  };

  const saveProcess = async (dados) => {
    if (editingProcess) {
      const updatedProcess = await atualizarProcesso(
        editingProcess.processo_id,
        dados
      );

      setProcessos((current) =>
        current.map((processo) =>
          processo.processo_id === updatedProcess.processo_id
            ? updatedProcess
            : processo
        )
      );
      setDetailProcess((current) =>
        current?.processo_id === updatedProcess.processo_id
          ? updatedProcess
          : current
      );
      return updatedProcess;
    }

    const createdProcess = await criarProcesso(dados);
    setProcessos((current) => [createdProcess, ...current]);
    setLoadError('');
    setCurrentPage(1);
    return createdProcess;
  };

  const openDeleteModal = (processo) => {
    setDeletingProcess(processo);
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    if (!isDeleting) setDeletingProcess(null);
  };

  const deleteSelectedProcess = async () => {
    if (!deletingProcess) return;

    setDeleteError('');
    setIsDeleting(true);

    try {
      await excluirProcesso(deletingProcess.processo_id);
      const remainingCount = Math.max(0, processos.length - 1);
      const remainingPages = Math.max(
        1,
        Math.ceil(remainingCount / PROCESS_PAGE_SIZE)
      );

      setProcessos((current) =>
        current.filter(
          (processo) => processo.processo_id !== deletingProcess.processo_id
        )
      );
      setCurrentPage((page) => Math.min(page, remainingPages));
      setDetailProcess((current) =>
        current?.processo_id === deletingProcess.processo_id ? null : current
      );
      setDeletingProcess(null);
    } catch (error) {
      setDeleteError(
        getErrorMessage(error, 'Não foi possível excluir o processo.')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    processos,
    visibleProcesses,
    loadError,
    isReloading,
    currentPage,
    totalPages,
    isFormOpen,
    editingProcess,
    detailProcess,
    deletingProcess,
    isDeleting,
    deleteError,
    setCurrentPage,
    setDetailProcess,
    reloadProcesses,
    openCreateForm,
    openEditForm,
    closeForm,
    saveProcess,
    openDeleteModal,
    closeDeleteModal,
    deleteSelectedProcess,
  };
}
