'use client';

import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { getCurrentUser } from '@/utils/authSession';
const emptySubscribe = () => () => {};
import DeleteProcessModal from '@/components/features/processos/DeleteProcessModal/DeleteProcessModal';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import ProcessFilters from '@/components/features/processos/ProcessFilters/ProcessFilters';
import ProcessFormModal from '@/components/features/processos/ProcessFormModal/ProcessFormModal';
import ProcessTable from '@/components/features/processos/ProcessTable/ProcessTable';
import { useProcessos } from '@/hooks/useProcessos';
import { toResponsavelOptions } from '@/utils/processo';
import styles from './processos.module.css';

export default function ProcessosClient({
  initialPage,
  initialError = '',
  responsaveis = [],
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

  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [referenceError, setReferenceError] = useState('');

  const {
    processos,
    totalItems,
    pageSize,
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
  } = useProcessos({ initialPage, initialError, responsaveis });

  useEffect(() => {
    if (!canView) return;

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
  }, [canView]);

  const clientNames = useMemo(
    () =>
      new Map(clientes.map((item) => [item.cliente_id || item.id, item.nome])),
    [clientes]
  );
  const employeeNames = useMemo(
    () =>
      new Map(
        funcionarios.map((item) => [item.funcionario_id || item.id, item.nome])
      ),
    [funcionarios]
  );

  const responsaveisOptions = useMemo(
    () => toResponsavelOptions(funcionarios),
    [funcionarios]
  );

  const enrichProcess = (process) => {
    if (!process) return null;

    // Normalize IDs and fields that might have different names in the API
    const procId = process.processo_id || process.id || process.cnj;
    const respId = process.responsavel_id || process.funcionario_id;
    const clienteId = process.cliente_id;
    const title = process.titulo_proc || process.titulo;
    const desc = process.descricao_proc || process.descricao;

    return {
      ...process,
      processo_id: procId,
      id: procId,
      titulo: title,
      descricao: desc,
      funcionario_id: respId,
      responsavel_id: respId,
      cliente:
        clientNames.get(clienteId) ??
        (clienteId ? `Cliente #${clienteId}` : 'Sem cliente'),
      responsavel: respId
        ? (employeeNames.get(respId) ?? `Responsável #${respId}`)
        : 'Sem responsável',
    };
  };

  const enrichedProcesses = processos.map(enrichProcess);
  const enrichedDetails = enrichProcess(detailProcess);

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
            {totalItems}{' '}
            {totalItems === 1 ? 'processo encontrado' : 'processos encontrados'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className={styles.addButton}
            onClick={openCreateForm}
          >
            <Plus size={18} aria-hidden="true" />
            Novo Processo
          </button>
        )}
      </div>

      <ProcessFilters
        filters={filters}
        responsaveis={responsaveisOptions}
        dateRangeError={dateRangeError}
        onFilterChange={setFilter}
      />

      {loadError ? (
        <div className={styles.errorState} role="alert">
          <div>
            <h2>Não foi possível exibir os processos</h2>
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            className={styles.retryButton}
            onClick={reloadProcesses}
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
          canEdit={canEdit}
          canDelete={canDelete}
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          hasActiveFilters={hasActiveFilters}
          onPageChange={setCurrentPage}
          onView={setDetailProcess}
          onEdit={openEditForm}
          onDelete={openDeleteModal}
        />
      )}

      <ProcessFormModal
        process={editingProcess ? enrichProcess(editingProcess) : null}
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
        process={deletingProcess ? enrichProcess(deletingProcess) : null}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={deleteSelectedProcess}
      />
    </div>
  );
}
