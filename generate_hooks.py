content = """import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from '@/services/processos';
import {
  PROCESS_PAGE_SIZE,
  hasInvalidDateRange,
} from '@/utils/processo';

const DATE_RANGE_ERROR = 'A data final deve ser posterior ou igual à inicial.';
const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_FILTERS = {
  busca: '',
  status: '',
  responsavelId: '',
  prazoInicio: '',
  prazoFim: '',
};

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

const getErrorMessage = (error, fallbackMessage) => {
  return error instanceof Error ? error.message : fallbackMessage;
};

export function useProcessos(initialData = [], initialError = '') {
  const initialPage = normalizeInitialData(initialData);
  const [processos, setProcessos] = useState(initialPage.itens);
  const [totalItems, setTotalItems] = useState(initialPage.total);
  const [loadError, setLoadError] = useState(initialError);
  const [currentPage, setCurrentPage] = useState(initialPage.page);
  const [totalPages, setTotalPages] = useState(initialPage.total_pages);
  
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedBusca, setDebouncedBusca] = useState('');
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

  const visibleProcesses = processos;

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
        setProcessos(page.itens ?? []);
        setTotalItems(page.total ?? 0);
        setCurrentPage(page.page ?? 1);
        setTotalPages(page.total_pages ?? 1);
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
  }, [activeFilters, currentPage, reloadKey, requestKey, dateRangeError]);

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
        Math.ceil((totalItems - 1) / PROCESS_PAGE_SIZE)
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
    processos,
    visibleProcesses,
    totalItems,
    pageSize: PROCESS_PAGE_SIZE,
    loadError,
    isReloading,
    currentPage,
    totalPages,
    filters,
    dateRangeError,
    hasActiveFilters,
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
"""
with open('src/hooks/useProcessos.js', 'w') as f:
    f.write(content)
