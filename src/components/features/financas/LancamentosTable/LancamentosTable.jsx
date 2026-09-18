'use client';

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  formatStatusLabel,
  isStatusConcluido,
} from '@/utils/financas';
import styles from './LancamentosTable.module.css';

export default function LancamentosTable({
  lancamentos = [],
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Lançamentos Recentes</h2>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Data</th>
              <th className={styles.th}>Título / Descrição</th>
              <th className={styles.th}>Categoria</th>
              <th className={styles.th}>Tipo</th>
              <th className={styles.th}>Valor</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              lancamentos.map((item) => {
                const isEntrada = item.tipo?.toLowerCase() === 'entrada';
                const statusLower = item.status?.toLowerCase();
                const isPago = isStatusConcluido(item.status);
                const isAtrasado = statusLower === 'atrasado';
                const statusLabel = formatStatusLabel(item.status, item.tipo);

                return (
                  <tr key={item.id} className={styles.tr}>
                    <td className={styles.td} data-label="Data">
                      <span className={styles.dateCell}>{item.data}</span>
                    </td>

                    <td className={styles.td} data-label="Título / Descrição">
                      <div className={styles.titleCell}>
                        <p className={styles.mainTitle}>{item.titulo}</p>
                        {item.descricao && (
                          <p className={styles.subDescription}>
                            {item.descricao}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className={styles.td} data-label="Categoria">
                      <span className={`${styles.badge} ${styles.badgeBlue}`}>
                        {item.categoria}
                      </span>
                    </td>

                    <td className={styles.td} data-label="Tipo">
                      <span
                        className={`${styles.typeIndicator} ${
                          isEntrada ? styles.typeEntrada : styles.typeSaida
                        }`}
                      >
                        {isEntrada ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}
                        {isEntrada ? 'Entrada' : 'Saída'}
                      </span>
                    </td>

                    <td className={styles.td} data-label="Valor">
                      <span className={styles.valueCell}>
                        {formatCurrency(item.valor)}
                      </span>
                    </td>

                    <td className={styles.td} data-label="Status">
                      <span
                        className={`${styles.badge} ${
                          isPago
                            ? styles.badgeGreen
                            : isAtrasado
                              ? styles.badgeRed
                              : styles.badgeYellow
                        }`}
                      >
                        {isPago && <CheckCircle2 size={13} />}
                        {isAtrasado && <AlertCircle size={13} />}
                        {statusLabel}
                      </span>
                    </td>

                    <td className={styles.td} data-label="Ações">
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${
                            isPago
                              ? styles.statusBtnPago
                              : styles.statusBtnPendente
                          }`}
                          title={
                            isPago
                              ? 'Marcar como pendente/atrasado'
                              : isEntrada
                                ? 'Marcar como recebido'
                                : 'Marcar como pago'
                          }
                          aria-label={
                            isPago
                              ? 'Marcar como pendente'
                              : isEntrada
                                ? 'Marcar como recebido'
                                : 'Marcar como pago'
                          }
                          onClick={() => onToggleStatus?.(item)}
                        >
                          {isPago ? <X size={18} /> : <Check size={18} />}
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          title="Editar lançamento"
                          aria-label="Editar lançamento"
                          onClick={() => onEdit?.(item)}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          title="Excluir lançamento"
                          aria-label="Excluir lançamento"
                          onClick={() => onDelete?.(item)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
