'use client';

import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import LancamentosTable from '@/components/features/financas/LancamentosTable/LancamentosTable';
import LancamentoModal from '@/components/features/financas/LancamentoModal/LancamentoModal';
import DeleteLancamentoModal from '@/components/features/financas/DeleteLancamentoModal/DeleteLancamentoModal';
import { useFinancas } from '@/hooks/useFinancas';
import styles from './financas.module.css';

export default function FinancasClient({
  initialData,
  onExportReport,
  onNewEntry,
  onEditLancamento,
  onDeleteLancamento,
  onSaveLancamento,
  onToggleStatus,
}) {
  const {
    lancamentos,
    isNewModalOpen,
    setIsNewModalOpen,
    selectedLancamento,
    setSelectedLancamento,
    handleDeleteLancamento,
    handleEditLancamento,
    handleCreateLancamento,
    handleUpdateLancamento,
    handleToggleStatus,
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
    } catch {
      // O erro é exposto através de statusError
    }
  };

  const handleTableDelete = (item) => {
    setLancamentoToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!lancamentoToDelete) return;
    try {
      await handleDeleteLancamento(lancamentoToDelete);
      setLancamentoToDelete(null);
    } catch {
      // O erro é exposto através de deleteError
    }
  };

  const handleCloseDeleteModal = () => {
    setLancamentoToDelete(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Controle Financeiro</h1>
          <p className={styles.subtitle}>Gestão de receitas e despesas</p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.reportButton}
            onClick={onExportReport}
          >
            <Download size={18} />
            Relatório
          </button>

          <button
            type="button"
            className={styles.addButton}
            onClick={handleOpenNewEntry}
          >
            <Plus size={18} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {(deleteError || statusError) && (
        <div role="alert" className={styles.errorMessage}>
          {deleteError || statusError}
        </div>
      )}

      <LancamentosTable
        lancamentos={lancamentos}
        onEdit={handleEditLancamento}
        onDelete={handleTableDelete}
        onToggleStatus={handleTableToggleStatus}
      />

      <LancamentoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
        initialItem={selectedLancamento}
      />

      <DeleteLancamentoModal
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
