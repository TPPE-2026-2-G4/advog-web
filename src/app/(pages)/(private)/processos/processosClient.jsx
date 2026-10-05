'use client';

import { Plus, RefreshCw } from 'lucide-react';
import DeleteProcessModal from '@/components/features/processos/DeleteProcessModal/DeleteProcessModal';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import ProcessFilters from '@/components/features/processos/ProcessFilters/ProcessFilters';
import ProcessFormModal from '@/components/features/processos/ProcessFormModal/ProcessFormModal';
import ProcessTable from '@/components/features/processos/ProcessTable/ProcessTable';
import { useProcessos } from '@/hooks/useProcessos';
import styles from './processos.module.css';

export default function ProcessosClient({
  initialPage,
  initialError = '',
  responsaveis = [],
}) {
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

        <button
          type="button"
          className={styles.addButton}
          onClick={openCreateForm}
        >
          <Plus size={18} aria-hidden="true" />
          Novo Processo
        </button>
      </div>

      <ProcessFilters
        filters={filters}
        responsaveis={responsaveis}
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
          processes={processos}
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
