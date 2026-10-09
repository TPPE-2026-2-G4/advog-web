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

const normalizeInitialData = (data) => {
  if (Array.isArray(data)) {
    return {
      itens: data.slice(0, PROCESS_PAGE_SIZE),
      total: data.length,
      page: 1,
      total_pages: Math.max(1, Math.ceil(data.length / PROCESS_PAGE_SIZE)),
    };
  }

  return {
    itens: Array.isArray(data?.itens) ? data.itens : [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    total_pages: data?.total_pages ?? 1,
  };
};

export function useProcessos(initialData = [], initialError = '') {
  const initialPage = normalizeInitialData(initialData);
  const [processos, setProcessos] = useState(initialPage.itens);
  const [totalItems, setTotalItems] = useState(initialPage.total);
  const [loadError, setLoadError] = useState(initialError);
  const [isReloading, setIsReloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [totalPages, setTotalPages] = useState(initialPage.total_pages);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [detailProcess, setDetailProcess] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const visibleProcesses = processos;

  const reloadProcesses = async (page = 1) => {
    setIsReloading(true);

    try {
      const response = await listarProcessos({
        page,
        pageSize: PROCESS_PAGE_SIZE,
      });
      setProcessos(response.itens);
      setTotalItems(response.total);
      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
      setLoadError('');
    } catch (error) {
      setLoadError(
        getErrorMessage(error, 'Não foi possível carregar os processos.')
      );
    } finally {
      setIsReloading(false);
    }
  };

  const changePage = (page) => reloadProcesses(page);

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
    await reloadProcesses(1);
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
      const targetPage =
        processos.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;
      setDetailProcess((current) =>
        current?.processo_id === deletingProcess.processo_id ? null : current
      );
      setDeletingProcess(null);
      await reloadProcesses(targetPage);
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
    totalItems,
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
    changePage,
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
