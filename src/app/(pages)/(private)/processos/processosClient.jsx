'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import DeleteProcessModal from '@/components/features/processos/DeleteProcessModal/DeleteProcessModal';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import ProcessFormModal from '@/components/features/processos/ProcessFormModal/ProcessFormModal';
import ProcessTable from '@/components/features/processos/ProcessTable/ProcessTable';
import { useProcessos } from '@/hooks/useProcessos';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { getCurrentUser } from '@/utils/authSession';
import styles from './processos.module.css';

const emptySubscribe = () => () => {};
const EMPTY_FILTERS = {
  busca: '',
  status: '',
  tribunal: '',
  area: '',
  cliente_id: '',
  funcionario_id: '',
};

export default function ProcessosClient({
  initialData = [],
  initialError = '',
  initialClientes = [],
  initialFuncionarios = [],
}) {
  const permissionsJson = useSyncExternalStore(
    emptySubscribe,
    () => JSON.stringify(getCurrentUser()?.cargo?.permissao ?? {}),
    () => '{}'
  );
  const permissions = JSON.parse(permissionsJson);
  const canView = permissions.visualizar_processos === true;
  const canCreate = permissions.criar_processos === true;
  const canEdit = permissions.editar_processos === true;
  const canDelete = permissions.excluir_processos === true;
  const [clientes, setClientes] = useState(initialClientes);
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios);
  const [referenceError, setReferenceError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const {
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
  } = useProcessos(initialData, initialError);

  useEffect(() => {
    if (!canView) return;

    reloadProcesses();
    Promise.all([listarClientes(), listarFuncionarios()])
      .then(([receivedClients, receivedEmployees]) => {
        setClientes(receivedClients);
        setFuncionarios(receivedEmployees);
        setReferenceError('');
      })
      .catch((error) => {
        setReferenceError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar clientes e responsáveis.'
        );
      });
    // A permissão é lida uma vez ao hidratar a sessão do navegador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const clientNames = useMemo(
    () => new Map(clientes.map((item) => [item.cliente_id, item.nome])),
    [clientes]
  );
  const employeeNames = useMemo(
    () => new Map(funcionarios.map((item) => [item.funcionario_id, item.nome])),
    [funcionarios]
  );
  const enrichProcess = (process) =>
    process && {
      ...process,
      cliente:
        clientNames.get(process.cliente_id) ?? `Cliente #${process.cliente_id}`,
      responsavel: process.funcionario_id
        ? (employeeNames.get(process.funcionario_id) ??
          `Responsável #${process.funcionario_id}`)
        : 'Sem responsável',
    };
  const enrichedProcesses = visibleProcesses.map(enrichProcess);
  const enrichedDetails = enrichProcess(detailProcess);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    const { busca, ...selectedFilters } = filters;
    const normalizedSearch = busca.trim();
    if (normalizedSearch) {
      const field = /^[\d.\-/]+$/.test(normalizedSearch) ? 'cnj' : 'titulo';
      selectedFilters[field] = normalizedSearch;
    }
    reloadProcesses(selectedFilters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    reloadProcesses();
  };

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState} role="alert">
          <div>
            <h1>Acesso negado</h1>
            <p>Você não possui permissão para visualizar processos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Gestão de Processos</h1>
          <p className={styles.subtitle} aria-live="polite">
            {processos.length}{' '}
            {processos.length === 1
              ? 'processo encontrado'
              : 'processos encontrados'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className={styles.addButton}
            onClick={openCreateForm}
            disabled={clientes.length === 0}
          >
            <Plus size={18} aria-hidden="true" />
            Novo Processo
          </button>
        )}
      </div>

      {referenceError && (
        <p className={styles.referenceError} role="alert">
          {referenceError}
        </p>
      )}

      <form className={styles.filters} onSubmit={handleFilterSubmit}>
        <label className={styles.filterGroup}>
          <span>Buscar por CNJ ou título</span>
          <input
            name="busca"
            value={filters.busca}
            onChange={handleFilterChange}
            placeholder="Digite o CNJ ou título"
          />
        </label>
        <label className={styles.filterGroup}>
          <span>Status</span>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Todos</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Ativo">Ativo</option>
            <option value="Concluído">Concluído</option>
            <option value="Arquivado">Arquivado</option>
          </select>
        </label>
        <label className={styles.filterGroup}>
          <span>Cliente</span>
          <select
            name="cliente_id"
            value={filters.cliente_id}
            onChange={handleFilterChange}
          >
            <option value="">Todos</option>
            {clientes.map((cliente) => (
              <option key={cliente.cliente_id} value={cliente.cliente_id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterGroup}>
          <span>Responsável</span>
          <select
            name="funcionario_id"
            value={filters.funcionario_id}
            onChange={handleFilterChange}
          >
            <option value="">Todos</option>
            {funcionarios.map((funcionario) => (
              <option
                key={funcionario.funcionario_id}
                value={funcionario.funcionario_id}
              >
                {funcionario.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterGroup}>
          <span>Tribunal</span>
          <input
            name="tribunal"
            value={filters.tribunal}
            onChange={handleFilterChange}
          />
        </label>
        <label className={styles.filterGroup}>
          <span>Área</span>
          <input
            name="area"
            value={filters.area}
            onChange={handleFilterChange}
          />
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className={styles.applyFilterButton}>
            Aplicar filtros
          </button>
          <button
            type="button"
            className={styles.clearFilterButton}
            onClick={clearFilters}
          >
            Limpar
          </button>
        </div>
      </form>

      {loadError ? (
        <div className={styles.errorState} role="alert">
          <div>
            <h2>Não foi possível exibir os processos</h2>
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => reloadProcesses()}
            disabled={isReloading}
          >
            <RefreshCw
              size={17}
              className={isReloading ? styles.spinning : ''}
              aria-hidden="true"
            />
            {isReloading ? 'Tentando novamente' : 'Tentar novamente'}
          </button>
        </div>
      ) : (
        <ProcessTable
          processes={enrichedProcesses}
          totalItems={processos.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onView={setDetailProcess}
          onEdit={openEditForm}
          onDelete={openDeleteModal}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      <ProcessFormModal
        process={editingProcess}
        isOpen={isFormOpen}
        clientes={clientes}
        funcionarios={funcionarios}
        onClose={closeForm}
        onSave={saveProcess}
      />

      <ProcessDetailsModal
        process={enrichedDetails}
        onClose={() => setDetailProcess(null)}
      />

      <DeleteProcessModal
        process={deletingProcess}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={deleteSelectedProcess}
      />
    </div>
  );
}
