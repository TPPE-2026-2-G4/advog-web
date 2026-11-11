import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientesPaginado,
} from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { isAdministratorAccount } from '@/utils/funcionario';
import { CLIENT_PAGE_SIZE, DEFAULT_CLIENT_PAGE } from '@/utils/cliente';

const SEARCH_DEBOUNCE_MS = 300;

export function useClientes({
  initialPage,
  initialClientes = [],
  initialFuncionarios = [],
} = {}) {
  const startingPage = useMemo(() => {
    if (initialPage) return { ...DEFAULT_CLIENT_PAGE, ...initialPage };
    if (initialClientes.length === 0) return DEFAULT_CLIENT_PAGE;
    return {
      ...DEFAULT_CLIENT_PAGE,
      itens: initialClientes,
      total: initialClientes.length,
    };
    // Apenas o estado inicial importa: depois dele, os dados vêm do servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Uma página inicial vazia também pode ser o resultado de uma falha no
  // servidor; nesse caso o cliente busca os dados ao montar.
  const hasInitialData = initialPage
    ? initialPage.itens?.length > 0
    : initialClientes.length > 0;

  const [pageData, setPageData] = useState(startingPage);
  const [currentPage, setCurrentPage] = useState(startingPage.page);
  const [funcionarios, setFuncionarios] = useState(() =>
    (initialFuncionarios || []).filter((f) => !isAdministratorAccount(f))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [responsavelFilter, setResponsavelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const skipInitialFetch = useRef(hasInitialData);

  const requestKey = JSON.stringify([
    debouncedSearch,
    responsavelFilter,
    statusFilter,
    currentPage,
    reloadKey,
  ]);
  const [settledKey, setSettledKey] = useState(
    hasInitialData ? requestKey : ''
  );
  const isLoading = settledKey !== requestKey;

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchTerm.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let ignore = false;

    listarClientesPaginado({
      busca: debouncedSearch,
      responsavel_id: responsavelFilter,
      etapa_id: statusFilter,
      page: currentPage,
      pageSize: CLIENT_PAGE_SIZE,
    })
      .then((page) => {
        if (ignore) return;
        if (page.itens.length === 0 && page.total > 0 && currentPage > 1) {
          setCurrentPage(Math.max(1, page.totalPages));
          return;
        }
        setPageData(page);
        setSettledKey(requestKey);
      })
      .catch(() => {
        if (ignore) return;
        setSettledKey(requestKey);
      });

    return () => {
      ignore = true;
    };
  }, [
    debouncedSearch,
    responsavelFilter,
    statusFilter,
    currentPage,
    reloadKey,
    requestKey,
  ]);

  useEffect(() => {
    let isMounted = true;
    if (initialFuncionarios.length === 0) {
      listarFuncionarios()
        .then((dados) => {
          if (isMounted && Array.isArray(dados)) {
            setFuncionarios(dados.filter((f) => !isAdministratorAccount(f)));
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [initialFuncionarios.length]);

  const clientes = pageData.itens;
  const setClientes = (updater) =>
    setPageData((current) => ({
      ...current,
      itens: typeof updater === 'function' ? updater(current.itens) : updater,
    }));
  const reloadClientes = () => setReloadKey((key) => key + 1);

  const changeSearchTerm = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const changeResponsavelFilter = (value) => {
    setResponsavelFilter(value);
    setCurrentPage(1);
  };
  const changeStatusFilter = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage('');
    }, 4000);
  };

  const handleCreateClient = async (dados) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      const respFunc = funcionarios.find(
        (f) => Number(f.funcionario_id || f.id) === Number(dados.responsavel_id)
      );
      const cleanDados =
        respFunc && isAdministratorAccount(respFunc)
          ? { ...dados, responsavel_id: null }
          : dados;
      const criado = await criarCliente(cleanDados);
      const clienteComDados = {
        ...cleanDados,
        ...criado,
        cpf: criado?.cpf || cleanDados.cpf || null,
        documento:
          criado?.documento || cleanDados.documento || cleanDados.cpf || null,
      };
      setCurrentPage(1);
      setClientes((prev) =>
        [clienteComDados, ...prev].slice(0, CLIENT_PAGE_SIZE)
      );
      reloadClientes();
      setIsAddOpen(false);
      showFeedback('Cliente cadastrado com sucesso!');
      return clienteComDados;
    } catch (err) {
      const msg =
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Failed to fetch')
          ? 'Erro de conexão com o servidor. Tente novamente em instantes.'
          : err?.message || 'Erro ao cadastrar cliente.';
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateClient = async (id, dados) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      const respFunc = funcionarios.find(
        (f) => Number(f.funcionario_id || f.id) === Number(dados.responsavel_id)
      );
      const cleanDados =
        respFunc && isAdministratorAccount(respFunc)
          ? { ...dados, responsavel_id: null }
          : dados;
      const atualizado = await atualizarCliente(id, cleanDados);
      setClientes((prev) =>
        prev.map((c) =>
          (c.cliente_id || c.id) === id
            ? {
                ...c,
                ...cleanDados,
                ...atualizado,
                cpf: atualizado?.cpf || cleanDados.cpf || c.cpf || null,
                documento:
                  atualizado?.documento ||
                  cleanDados.documento ||
                  cleanDados.cpf ||
                  c.documento ||
                  null,
              }
            : c
        )
      );
      reloadClientes();
      setIsEditOpen(false);
      setEditingClient(null);
      showFeedback('Cliente atualizado com sucesso!');
      return atualizado;
    } catch (err) {
      const msg =
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Failed to fetch')
          ? 'Erro de conexão com o servidor. Tente novamente em instantes.'
          : err?.message || 'Erro ao atualizar cliente.';
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (id) => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await excluirCliente(id);
      setClientes((prev) => prev.filter((c) => (c.cliente_id || c.id) !== id));
      const remainingPages = Math.max(
        1,
        Math.ceil((pageData.total - 1) / CLIENT_PAGE_SIZE)
      );
      setCurrentPage((page) => Math.min(page, remainingPages));
      reloadClientes();
      setIsDeleteOpen(false);
      setDeletingClient(null);
      showFeedback('Cliente excluído com sucesso!');
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao excluir cliente.');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAdd = () => {
    setErrorMessage('');
    setIsAddOpen(true);
  };
  const handleCloseAdd = () => {
    setErrorMessage('');
    setIsAddOpen(false);
  };

  const handleOpenDetails = (client) => {
    setViewingClient(client);
    setIsDetailsOpen(true);
  };
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setViewingClient(null);
  };

  const handleOpenEdit = (client) => {
    setErrorMessage('');
    setEditingClient(client);
    setIsEditOpen(true);
  };
  const handleCloseEdit = () => {
    setErrorMessage('');
    setIsEditOpen(false);
    setEditingClient(null);
  };

  const handleOpenDelete = (client) => {
    setErrorMessage('');
    setDeletingClient(client);
    setIsDeleteOpen(true);
  };
  const handleCloseDelete = () => {
    setErrorMessage('');
    setIsDeleteOpen(false);
    setDeletingClient(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setResponsavelFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  return {
    clientes,
    setClientes,
    funcionarios,
    setFuncionarios,
    searchTerm,
    setSearchTerm: changeSearchTerm,
    responsavelFilter,
    setResponsavelFilter: changeResponsavelFilter,
    statusFilter,
    setStatusFilter: changeStatusFilter,
    filteredClientes: clientes,
    currentPage,
    setCurrentPage,
    totalPages: pageData.totalPages,
    totalItems: pageData.total,
    pageSize: CLIENT_PAGE_SIZE,
    isAddOpen,
    handleOpenAdd,
    handleCloseAdd,
    isDetailsOpen,
    viewingClient,
    handleOpenDetails,
    handleCloseDetails,
    isEditOpen,
    editingClient,
    handleOpenEdit,
    handleCloseEdit,
    isDeleteOpen,
    deletingClient,
    handleOpenDelete,
    handleCloseDelete,
    handleCreateClient,
    handleUpdateClient,
    handleDeleteClient,
    handleClearFilters,
    isLoading,
    isSaving,
    isDeleting,
    feedbackMessage,
    setFeedbackMessage,
    errorMessage,
    setErrorMessage,
  };
}
