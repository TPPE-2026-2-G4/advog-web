import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
  obterProcesso,
  sincronizarProcessos,
} from '@/services/processos';
import {
  PROCESS_PAGE_SIZE,
  hasInvalidDateRange,
  toProcessPage,
  toResponsavelNames,
} from '@/utils/processo';

const SEARCH_DEBOUNCE_MS = 300;
export const PROCESS_REFRESH_MS = 60_000;
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
  initialPage,
  initialError = '',
  responsaveis = NO_RESPONSAVEIS,
  enabled = true,
  canSync = false,
} = {}) {
  const responsavelNames = useMemo(
    () => toResponsavelNames(responsaveis),
    [responsaveis]
  );
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedBusca, setDebouncedBusca] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPage?.page ?? 1);
  const [pageData, setPageData] = useState(initialPage ?? EMPTY_PAGE);
  const [loadError, setLoadError] = useState(initialError);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [detailProcess, setDetailProcess] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const skipInitialFetch = useRef(Boolean(initialPage || initialError));
  const [detailError, setDetailError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const syncInFlight = useRef(false);
  const justSavedId = useRef(null);
  const detailId = detailProcess?.processo_id;

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
  const [settledKey, setSettledKey] = useState(
    initialPage || initialError ? requestKey : ''
  );
  const isReloading = enabled && !dateRangeError && settledKey !== requestKey;

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedBusca(filters.busca),
      SEARCH_DEBOUNCE_MS
    );

    return () => clearTimeout(timer);
  }, [filters.busca]);

  useEffect(() => {
    if (!enabled) return;
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
    enabled,
  ]);
  useEffect(() => {
    if (!enabled || isReloading || isSyncing) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        setReloadKey((key) => key + 1);
      }
    };
    const timer = setInterval(refreshIfVisible, PROCESS_REFRESH_MS);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [enabled, isReloading, isSyncing]);

  useEffect(() => {
    if (!enabled || !detailId) return;
    if (justSavedId.current === detailId) {
      justSavedId.current = null;
      return;
    }
    let ignore = false;
    obterProcesso(detailId)
      .then((process) => {
        if (ignore) return;
        setDetailProcess(process);
        setDetailError('');
      })
      .catch((error) => {
        if (ignore) return;
        setDetailError(
          getErrorMessage(
            error,
            'Não foi possível atualizar os detalhes do processo.'
          )
        );
      });
    return () => {
      ignore = true;
    };
  }, [enabled, detailId, reloadKey]);

  const setFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  };

  const reloadProcesses = () => setReloadKey((key) => key + 1);

  const syncProcesses = async () => {
    if (!enabled || !canSync || syncInFlight.current) return;
    syncInFlight.current = true;
    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const { atualizados } = await sincronizarProcessos();
      setSyncMessage(
        atualizados === 0
          ? 'Sincronização concluída. Nenhum processo foi atualizado.'
          : `Sincronização concluída: ${atualizados} ${atualizados === 1 ? 'processo atualizado' : 'processos atualizados'}.`
      );
      reloadProcesses();
    } catch (error) {
      setSyncError(
        getErrorMessage(
          error,
          'Não foi possível sincronizar com o DataJud. Tente novamente.'
        )
      );
    } finally {
      syncInFlight.current = false;
      setIsSyncing(false);
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

      justSavedId.current = editingProcess.processo_id;
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
    detailError,
    isSyncing,
    syncError,
    syncMessage,
    syncProcesses,
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
