'use client';

import { Plus, RefreshCw } from 'lucide-react';
import DeleteProcessModal from '@/components/features/processos/DeleteProcessModal/DeleteProcessModal';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import ProcessFormModal from '@/components/features/processos/ProcessFormModal/ProcessFormModal';
import ProcessTable from '@/components/features/processos/ProcessTable/ProcessTable';
import { useProcessos } from '@/hooks/useProcessos';
import styles from './processos.module.css';

export default function ProcessosClient({
  initialData = [],
  initialError = '',
}) {
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

        <button
          type="button"
          className={styles.addButton}
          onClick={openCreateForm}
        >
          <Plus size={18} aria-hidden="true" />
          Novo Processo
        </button>
      </div>

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
          processes={visibleProcesses}
          totalItems={processos.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onView={setDetailProcess}
          onEdit={openEditForm}
          onDelete={openDeleteModal}
        />
      )}

      <ProcessFormModal
        process={editingProcess}
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={saveProcess}
      />

      <ProcessDetailsModal
        process={detailProcess}
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
