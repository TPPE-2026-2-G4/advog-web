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
            aria-haspopup="dialog"
            aria-controls="process-form-dialog"
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            Novo Processo
          </button>
        )}
      </div>

      {referenceError && (
        <p className={styles.referenceError} role="alert">
          {referenceError}
        </p>
      )}

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
