'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import ClientTable from '@/components/features/clientes/ClientTable/ClientTable';
import AddClientModal from '@/components/features/clientes/AddClientModal/AddClientModal';
import EditClientModal from '@/components/features/clientes/EditClientModal/EditClientModal';
import ClientDetailsModal from '@/components/features/clientes/ClientDetailsModal/ClientDetailsModal';
import DeleteClientModal from '@/components/features/clientes/DeleteClientModal/DeleteClientModal';
import AutocompleteResponsible from '@/components/features/clientes/AutocompleteResponsible/AutocompleteResponsible';
import { ETAPAS } from '@/utils/cliente';
import styles from './clientesClient.module.css';

export default function ClientesClient({
  initialClientes = [],
  initialFuncionarios = [],
}) {
  const {
    funcionarios,
    searchTerm,
    setSearchTerm,
    responsavelFilter,
    setResponsavelFilter,
    statusFilter,
    setStatusFilter,
    filteredClientes,
    // Modals
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
    // CRUD
    handleCreateClient,
    handleUpdateClient,
    handleDeleteClient,
    handleClearFilters,
    isLoading,
    isSaving,
    isDeleting,
    feedbackMessage,
    errorMessage,
  } = useClientes({ initialClientes, initialFuncionarios });

  return (
    <div className={styles.container}>
      {/* Topo / Cabeçalho */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Clientes</h1>
          <p className={styles.subtitle}>
            {filteredClientes.length}{' '}
            {filteredClientes.length === 1
              ? 'cliente cadastrado'
              : 'clientes cadastrados'}
          </p>
        </div>

        <button
          type="button"
          className={styles.newClientBtn}
          onClick={handleOpenAdd}
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Alertas */}
      {feedbackMessage && (
        <div className={styles.alertSuccess} role="status">
          <CheckCircle2 size={18} />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barra de Filtros */}
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

      {/* Tabela de Clientes */}
      <ClientTable
        clientes={filteredClientes}
        funcionarios={funcionarios}
        onView={handleOpenDetails}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {/* Modais */}
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
