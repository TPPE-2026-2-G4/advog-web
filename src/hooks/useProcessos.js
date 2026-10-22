import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from '@/services/processos';
import {
  PROCESS_PAGE_SIZE,
  hasInvalidDateRange,
  toProcessPage,
  toResponsavelNames,
} from '@/utils/processo';

const SEARCH_DEBOUNCE_MS = 300;
export const DATE_RANGE_ERROR =
  'A data inicial não pode ser posterior à data final.';

const EMPTY_FILTERS = Object.freeze({
  busca: '',
  status: '',
  responsavelId: '',
  prazoInicio: '',
  prazoFim: '',
});
const EMPTY_PAGE = Object.freeze({
  itens: [],
  total: 0,
  page: 1,
  pageSize: PROCESS_PAGE_SIZE,
  totalPages: 1,
});
const NO_RESPONSAVEIS = Object.freeze([]);

const getErrorMessage = (error, fallbackMessage) =>
  error instanceof Error ? error.message : fallbackMessage;

export function useProcessos({
  initialPage = EMPTY_PAGE,
  initialError = '',
  responsaveis = NO_RESPONSAVEIS,
} = {}) {
  const responsavelNames = useMemo(
    () => toResponsavelNames(responsaveis),
    [responsaveis]
  );
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedBusca, setDebouncedBusca] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [pageData, setPageData] = useState(initialPage);
  const [loadError, setLoadError] = useState(initialError);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [detailProcess, setDetailProcess] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const skipInitialFetch = useRef(true);

  const dateRangeError = hasInvalidDateRange(
    filters.prazoInicio,
    filters.prazoFim
  )
    ? DATE_RANGE_ERROR
    : '';
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const activeFilters = useMemo(
    () => ({ ...filters, busca: debouncedBusca }),
    [filters, debouncedBusca]
  );
  const requestKey = JSON.stringify([activeFilters, currentPage, reloadKey]);
  const [settledKey, setSettledKey] = useState(requestKey);
  const isReloading = !dateRangeError && settledKey !== requestKey;

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedBusca(filters.busca),
      SEARCH_DEBOUNCE_MS
    );

    return () => clearTimeout(timer);
  }, [filters.busca]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    if (dateRangeError) return;

    let ignore = false;

    listarProcessos({
      ...activeFilters,
      page: currentPage,
      pageSize: PROCESS_PAGE_SIZE,
    })
      .then((page) => {
        if (ignore) return;
        setPageData(toProcessPage(page, responsavelNames));
        setLoadError('');
        setSettledKey(requestKey);
      })
      .catch((error) => {
        if (ignore) return;
        setLoadError(
          getErrorMessage(error, 'Não foi possível carregar os processos.')
        );
        setSettledKey(requestKey);
      });

    return () => {
      ignore = true;
    };
  }, [
    activeFilters,
    currentPage,
    reloadKey,
    requestKey,
    dateRangeError,
    responsavelNames,
  ]);

  const setFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  };

  const reloadProcesses = () => setReloadKey((key) => key + 1);

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

      setDetailProcess((current) =>
        current?.processo_id === editingProcess.processo_id
          ? updatedProcess
          : current
      );
      reloadProcesses();
      return updatedProcess;
    }

    const createdProcess = await criarProcesso(dados);
    setCurrentPage(1);
    reloadProcesses();
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
      const remainingPages = Math.max(
        1,
        Math.ceil((pageData.total - 1) / PROCESS_PAGE_SIZE)
      );

      setCurrentPage((page) => Math.min(page, remainingPages));
      setDetailProcess((current) =>
        current?.processo_id === deletingProcess.processo_id ? null : current
      );
      setDeletingProcess(null);
      reloadProcesses();
    } catch (error) {
      setDeleteError(
        getErrorMessage(error, 'Não foi possível excluir o processo.')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    processos: pageData.itens,
    totalItems: pageData.total,
    pageSize: PROCESS_PAGE_SIZE,
    loadError,
    isReloading,
    currentPage,
    totalPages: pageData.totalPages,
    filters,
    dateRangeError,
    hasActiveFilters,
    responsaveis,
    isFormOpen,
    editingProcess,
    detailProcess,
    deletingProcess,
    isDeleting,
    deleteError,
    setFilter,
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
