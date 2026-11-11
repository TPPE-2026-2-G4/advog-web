'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { useClientes } from '@/hooks/useClientes';
import { obterCliente } from '@/services/clientes';
import ClientTable from '@/components/features/clientes/ClientTable/ClientTable';
import AddClientModal from '@/components/features/clientes/AddClientModal/AddClientModal';
import EditClientModal from '@/components/features/clientes/EditClientModal/EditClientModal';
import ClientDetailsModal from '@/components/features/clientes/ClientDetailsModal/ClientDetailsModal';
import DeleteClientModal from '@/components/features/clientes/DeleteClientModal/DeleteClientModal';
import AutocompleteResponsible from '@/components/features/clientes/AutocompleteResponsible/AutocompleteResponsible';
import { ETAPAS } from '@/utils/cliente';
import { getCurrentUser } from '@/utils/authSession';
import {
  isAdministratorAccount,
  isAdministratorRole,
} from '@/utils/funcionario';
import Toast from '@/components/ui/Toast/Toast';
import styles from './clientesClient.module.css';

const emptySubscribe = () => () => {};

export default function ClientesClient({
  initialPage,
  initialClientes = [],
  initialFuncionarios = [],
}) {
  const userJson = useSyncExternalStore(
    emptySubscribe,
    () => JSON.stringify(getCurrentUser() ?? null),
    () => 'null'
  );
  const currentUser = JSON.parse(userJson);
  const isUserAdmin =
    isAdministratorAccount(currentUser) ||
    isAdministratorRole(currentUser?.cargo);
  const cargoPerms = currentUser?.cargo?.permissao ?? {};
  const arrayPerms = Array.isArray(currentUser?.permissoes)
    ? Object.fromEntries(currentUser.permissoes.map((p) => [p, true]))
    : {};
  const perms = { ...arrayPerms, ...cargoPerms };

  const hasPermissionsDefined =
    currentUser &&
    (currentUser?.cargo?.permissao != null ||
      Array.isArray(currentUser?.permissoes));

  const canView =
    !hasPermissionsDefined ||
    isUserAdmin ||
    perms.visualizar_clientes === true ||
    perms.gerenciar_clientes === true;

  const canManage =
    !hasPermissionsDefined || isUserAdmin || perms.gerenciar_clientes === true;
  const {
    funcionarios,
    searchTerm,
    setSearchTerm,
    responsavelFilter,
    setResponsavelFilter,
    statusFilter,
    setStatusFilter,
    filteredClientes,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
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
    errorMessage,
    setErrorMessage,
  } = useClientes({ initialPage, initialClientes, initialFuncionarios });

  const searchParams = useSearchParams();
  const clienteIdParam =
    searchParams?.get('clienteId') || searchParams?.get('cliente_id');
  const handledParamRef = useRef(null);

  useEffect(() => {
    if (!clienteIdParam || !canView) return;
    if (handledParamRef.current === clienteIdParam) return;

    const targetId = Number(clienteIdParam);
    const foundInList = filteredClientes.find(
      (c) => Number(c.cliente_id || c.id) === targetId
    );

    if (foundInList) {
      handledParamRef.current = clienteIdParam;
      handleOpenDetails(foundInList);
      return;
    }

    let isSubscribed = true;
    obterCliente(targetId)
      .then((cliente) => {
        if (isSubscribed && cliente) {
          handledParamRef.current = clienteIdParam;
          handleOpenDetails(cliente);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [clienteIdParam, canView, filteredClientes, handleOpenDetails]);

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div className={styles.titleArea} role="alert">
            <h1 className={styles.title}>Acesso negado</h1>
            <p className={styles.subtitle}>
              Você não possui permissão para visualizar clientes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Clientes</h1>
          <p className={styles.subtitle}>
            {totalItems}{' '}
            {totalItems === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className={styles.newClientBtn}
            onClick={handleOpenAdd}
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        )}
      </div>

      {feedbackMessage && (
        <div className={styles.alertSuccess} role="status">
          <CheckCircle2 size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <Toast
        message={isAddOpen || isEditOpen || isDeleteOpen ? '' : errorMessage}
        onClose={() => setErrorMessage('')}
      />

      <div className={styles.filtersBar} role="search">
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nome do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar clientes"
          />
        </div>

        <div className={styles.autocompleteFilterWrapper}>
          <AutocompleteResponsible
            id="filtro-responsavel"
            responsavelId={responsavelFilter}
            onChange={(id) => setResponsavelFilter(id ? String(id) : '')}
            funcionarios={funcionarios}
            placeholder="Todos os responsáveis"
            ariaLabel="Filtrar por responsável"
          />
        </div>

        <div className={styles.selectWrapper}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {ETAPAS.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className={styles.selectIcon} />
        </div>

        {(Boolean(searchTerm) ||
          Boolean(responsavelFilter) ||
          Boolean(statusFilter)) && (
          <button
            type="button"
            className={styles.clearFiltersBtn}
            onClick={handleClearFilters}
            aria-label="Limpar filtros"
          >
            <RotateCcw size={16} />
            <span>Limpar filtros</span>
          </button>
        )}
      </div>

      <ClientTable
        clientes={filteredClientes}
        funcionarios={funcionarios}
        onView={handleOpenDetails}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        canManage={canManage}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <AddClientModal
        isOpen={isAddOpen}
        onClose={handleCloseAdd}
        onSubmit={handleCreateClient}
        funcionarios={funcionarios}
        isSaving={isSaving}
      />

      <EditClientModal
        isOpen={isEditOpen}
        onClose={handleCloseEdit}
        onSubmit={handleUpdateClient}
        cliente={editingClient}
        funcionarios={funcionarios}
        isSaving={isSaving}
      />

      <ClientDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onEdit={handleOpenEdit}
        cliente={viewingClient}
        funcionarios={funcionarios}
        canManage={canManage}
      />

      <DeleteClientModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleDeleteClient}
        cliente={deletingClient}
        isDeleting={isDeleting}
      />
    </div>
  );
}
