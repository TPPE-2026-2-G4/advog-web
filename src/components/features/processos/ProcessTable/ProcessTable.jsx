import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatProcessDate, isOverdueDeadline } from '@/utils/processo';
import styles from './ProcessTable.module.css';

const getStatusStyle = (status) => {
  if (status === 'Ativo') return styles.statusActive;
  if (status === 'Concluído') return styles.statusCompleted;
  return styles.statusPending;
};

export default function ProcessTable({
  processes = [],
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onView,
  onEdit,
  onDelete,
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * 5 + 1;
  const lastItem = Math.min(currentPage * 5, totalItems);

  return (
    <section className={styles.container} aria-label="Lista de processos">
      {processes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FileText size={28} aria-hidden="true" />
          </div>
          <h2>Nenhum processo cadastrado</h2>
          <p>Cadastre o primeiro processo para começar a gerenciá-lo.</p>
        </div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Nº do Processo</th>
                <th className={styles.th}>Caso / Cliente</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Tribunal / Área</th>
                <th className={styles.th}>Responsável</th>
                <th className={styles.th}>Próximo Prazo</th>
                <th className={`${styles.th} ${styles.actionsHeading}`}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {processes.map((processo) => (
                <tr key={processo.id} className={styles.tr}>
                  <td className={styles.td} data-label="Nº do Processo">
                    <span className={styles.processNumber}>{processo.id}</span>
                  </td>
                  <td className={styles.td} data-label="Caso / Cliente">
                    <button
                      type="button"
                      className={styles.caseButton}
                      onClick={() => onView(processo)}
                    >
                      {processo.titulo}
                    </button>
                    <span className={styles.secondaryText}>
                      {processo.cliente}
                    </span>
                  </td>
                  <td className={styles.td} data-label="Status">
                    <span
                      className={`${styles.statusBadge} ${getStatusStyle(
                        processo.status
                      )}`}
                    >
                      {processo.status}
                    </span>
                  </td>
                  <td className={styles.td} data-label="Tribunal / Área">
                    <span className={styles.primaryText}>
                      {processo.tribunal}
                    </span>
                    <span className={styles.secondaryText}>
                      {processo.area}
                    </span>
                  </td>
                  <td className={styles.td} data-label="Responsável">
                    <span className={styles.primaryText}>
                      {processo.responsavel}
                    </span>
                  </td>
                  <td className={styles.td} data-label="Próximo Prazo">
                    <span
                      className={
                        isOverdueDeadline(processo.prazo)
                          ? styles.criticalDeadline
                          : styles.primaryText
                      }
                    >
                      {formatProcessDate(processo.prazo)}
                    </span>
                  </td>
                  <td className={styles.td} data-label="Ações">
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => onView(processo)}
                        aria-label={`Visualizar processo ${processo.id}`}
                        title="Visualizar processo"
                      >
                        <Eye size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => onEdit(processo)}
                        aria-label={`Editar processo ${processo.id}`}
                        title="Editar processo"
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => onDelete(processo)}
                        aria-label={`Excluir processo ${processo.id}`}
                        title="Excluir processo"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalItems > 0 && (
        <div className={styles.pagination}>
          <p className={styles.paginationSummary} aria-live="polite">
            Mostrando {firstItem}–{lastItem} de {totalItems} processos
          </p>
          <nav className={styles.paginationControls} aria-label="Paginação">
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className={styles.pageIndicator}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </section>
  );
}
