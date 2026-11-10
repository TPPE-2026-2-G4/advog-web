'use client';

import { useState, useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import FinancialDashboard from '@/components/features/financas/FinancialDashboard/FinancialDashboard';
import ExportMenu from '@/components/ui/ExportMenu/ExportMenu';
import LancamentosTable from '@/components/features/financas/LancamentosTable/LancamentosTable';
import LancamentoModal from '@/components/features/financas/LancamentoModal/LancamentoModal';
import DeleteLancamentoModal from '@/components/features/financas/DeleteLancamentoModal/DeleteLancamentoModal';
import { useFinancas } from '@/hooks/useFinancas';
import { getCurrentUser } from '@/utils/authSession';
import { isAdministratorAccount } from '@/utils/funcionario';
import styles from './financas.module.css';

const emptySubscribe = () => () => {};

export default function FinancasClient({
  initialData,
  onNewEntry,
  onEditLancamento,
  onDeleteLancamento,
  onSaveLancamento,
  onToggleStatus,
}) {
  const userJson = useSyncExternalStore(
    emptySubscribe,
    () => JSON.stringify(getCurrentUser() ?? null),
    () => 'null'
  );
  const currentUser = JSON.parse(userJson);
  const isUserAdmin = isAdministratorAccount(currentUser);
  const perms = currentUser?.cargo?.permissao ?? {};
  const canView =
    !currentUser ||
    isUserAdmin ||
    perms.visualizar_financeiro === true ||
    perms.gerenciar_financeiro === true;
  const canManage =
    !currentUser || isUserAdmin || perms.gerenciar_financeiro === true;

  const {
    lancamentos,
    categorias,
    pagination,
    resumoBackend,
    versaoDados,
    isNewModalOpen,
    setIsNewModalOpen,
    selectedLancamento,
    setSelectedLancamento,
    handleDeleteLancamento,
    handleEditLancamento,
    handleCreateLancamento,
    handleUpdateLancamento,
    handleToggleStatus,
    handleFilterLancamentos,
    isExporting,
    exportError,
    exportReport,
    isDeleting,
    deleteError,
    statusError,
  } = useFinancas(initialData, {
    onDelete: onDeleteLancamento,
    onEdit: onEditLancamento,
  });

  const [lancamentoToDelete, setLancamentoToDelete] = useState(null);

  const isModalOpen = isNewModalOpen || Boolean(selectedLancamento);

  const handleOpenNewEntry = () => {
    setSelectedLancamento(null);
    setIsNewModalOpen(true);
    onNewEntry?.();
  };

  const handleCloseModal = () => {
    setIsNewModalOpen(false);
    setSelectedLancamento(null);
  };

  const handleSaveModal = async (dados) => {
    let saved;
    if (selectedLancamento) {
      saved = await handleUpdateLancamento({ ...selectedLancamento, ...dados });
    } else {
      saved = await handleCreateLancamento(dados);
    }
    onSaveLancamento?.(saved);
    handleCloseModal();
    return saved;
  };

  const handleTableToggleStatus = async (item) => {
    try {
      const updated = await handleToggleStatus(item);
      onToggleStatus?.(updated);
      return updated;
    } catch {}
  };

  const handleTableDelete = (item) => {
    setLancamentoToDelete(item);
  };

  const handleConfirmDelete = async (alcance = 'individual') => {
    try {
      await handleDeleteLancamento(lancamentoToDelete, alcance);
      setLancamentoToDelete(null);
    } catch {}
  };

  const handleCloseDeleteModal = () => {
    setLancamentoToDelete(null);
  };

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage} role="alert">
          <div>
            <h1>Acesso negado</h1>
            <p>Você não possui permissão para visualizar o financeiro.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Controle Financeiro</h1>
          <p className={styles.subtitle}>Gestão de receitas e despesas</p>
        </div>

        <div className={styles.actions}>
          <ExportMenu
            label="Relatório"
            className={styles.reportButton}
            isExporting={isExporting}
            onExport={exportReport}
          />

          {canManage && (
            <button
              type="button"
              className={styles.addButton}
              onClick={handleOpenNewEntry}
            >
              <Plus size={18} />
              Novo Lançamento
            </button>
          )}
        </div>
      </div>

      {(deleteError || statusError || exportError) && (
        <div role="alert" className={styles.errorMessage}>
          {deleteError || statusError || exportError}
        </div>
      )}

      <FinancialDashboard
        lancamentos={lancamentos}
        resumoBackend={resumoBackend}
        refreshTrigger={versaoDados}
      />

      <LancamentosTable
        lancamentos={lancamentos}
        categorias={categorias}
        pagination={pagination}
        canManage={canManage}
        onEdit={handleEditLancamento}
        onDelete={handleTableDelete}
        onToggleStatus={handleTableToggleStatus}
        onFilter={handleFilterLancamentos}
      />

      <LancamentoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
        initialItem={selectedLancamento}
      />

      <DeleteLancamentoModal
        key={lancamentoToDelete?.id || 'fechado'}
        lancamento={lancamentoToDelete}
        isOpen={Boolean(lancamentoToDelete)}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
