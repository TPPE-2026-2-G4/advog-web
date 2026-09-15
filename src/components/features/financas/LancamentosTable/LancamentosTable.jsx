'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
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
  pageSize = 5,
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categoriasUnicas = useMemo(() => {
    const categorias = new Set(
      lancamentos.map((l) => l.categoria).filter(Boolean)
    );
    return Array.from(categorias).sort();
  }, [lancamentos]);

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFilterCategoria('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((item) => {
      const itemDateStr = item.dataIso || item.data;
      if (dateFrom && itemDateStr) {
        const itemDate = new Date(itemDateStr).getTime();
        const fromDate = new Date(dateFrom).getTime();
        if (!isNaN(itemDate) && !isNaN(fromDate) && itemDate < fromDate) {
          return false;
        }
      }
      if (dateTo && itemDateStr) {
        const itemDate = new Date(itemDateStr).getTime();
        const toDate = new Date(dateTo).getTime();
        if (!isNaN(itemDate) && !isNaN(toDate) && itemDate > toDate) {
          return false;
        }
      }

      // Filtro por categoria
      if (filterCategoria && filterCategoria !== '') {
        if (item.categoria !== filterCategoria) {
          return false;
        }
      }

      // Filtro por status
      if (filterStatus && filterStatus !== '') {
        const lowerFilter = filterStatus.toLowerCase();
        const itemLabel = formatStatusLabel(
          item.status,
          item.tipo
        ).toLowerCase();

        if (itemLabel !== lowerFilter) {
          return false;
        }
      }

      return true;
    });
  }, [lancamentos, dateFrom, dateTo, filterCategoria, filterStatus]);

  const totalResults = filteredLancamentos.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLancamentos = filteredLancamentos.slice(
    startIndex,
    startIndex + pageSize
  );

  const startRecord = totalResults === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(startIndex + pageSize, totalResults);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Lançamentos Recentes</h2>

        <div className={styles.filtersArea}>
          <div className={styles.filterGroup}>
            <label htmlFor="filter-de" className={styles.filterLabel}>
              De:
            </label>
            <div className={styles.dateInputWrap}>
              <input
                id="filter-de"
                type="date"
                className={styles.dateInput}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Data inicial"
              />
              <Calendar size={15} className={styles.calendarIcon} />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="filter-ate" className={styles.filterLabel}>
              Até:
            </label>
            <div className={styles.dateInputWrap}>
              <input
                id="filter-ate"
                type="date"
                className={styles.dateInput}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Data final"
              />
              <Calendar size={15} className={styles.calendarIcon} />
            </div>
          </div>

          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={filterCategoria}
              onChange={(e) => {
                setFilterCategoria(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas as categorias</option>
              {categoriasUnicas.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              <option value="atrasado">Atrasado</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="recebido">Recebido</option>
            </select>
          </div>

          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClearFilters}
            aria-label="Limpar filtros"
          >
            <RotateCcw size={14} />
            Limpar
          </button>
        </div>
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
            {paginatedLancamentos.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              paginatedLancamentos.map((item) => {
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

      <div className={styles.footer}>
        <p className={styles.resultsCount}>
          Exibindo {startRecord}–{endRecord} de {totalResults} resultados
        </p>

        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.paginationBtn}
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span className={styles.paginationText}>
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            className={styles.paginationBtn}
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
