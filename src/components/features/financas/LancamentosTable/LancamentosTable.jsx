'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Search,
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
  categorias = [],
  pagination,
  onEdit,
  onDelete,
  onToggleStatus,
  onFilter,
  pageSize = 5,
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categoriasUnicas = useMemo(() => {
    const names = new Set();

    if (categorias && categorias.length > 0) {
      categorias.forEach((c) => {
        if (c.nome_categoria) names.add(c.nome_categoria);
      });
    }

    lancamentos.forEach((l) => {
      if (l.categoria) names.add(l.categoria);
    });

    return Array.from(names).sort();
  }, [lancamentos, categorias]);

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFilterCategoria('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (onFilter) {
      let situacao = '';
      const st = filterStatus.toLowerCase();
      if (st === 'pendente') situacao = 'Pendente';
      else if (st === 'realizado') situacao = 'Realizado';
      else if (st === 'atrasado') situacao = 'Atrasado';

      onFilter({
        inicio: dateFrom || undefined,
        fim: dateTo || undefined,
        categoria: filterCategoria || undefined,
        situacao: situacao || undefined,
        page: currentPage,
        page_size: pageSize,
      });
    }
  }, [
    dateFrom,
    dateTo,
    filterCategoria,
    filterStatus,
    currentPage,
    pageSize,
    onFilter,
  ]);

  const isBackendPaginated =
    Boolean(pagination) && lancamentos.length <= pageSize;

  const totalResults =
    isBackendPaginated && pagination.total > 0
      ? pagination.total
      : lancamentos.length;
  const totalPages =
    isBackendPaginated && pagination.totalPages > 0
      ? pagination.totalPages
      : Math.ceil(totalResults / pageSize) || 1;
  const actualCurrentPage = isBackendPaginated ? pagination.page : currentPage;

  const globalStartIndex = (actualCurrentPage - 1) * pageSize;
  const arrayStartIndex = isBackendPaginated ? 0 : globalStartIndex;
  const paginatedLancamentos = lancamentos.slice(
    arrayStartIndex,
    arrayStartIndex + pageSize
  );

  const startRecord = totalResults === 0 ? 0 : globalStartIndex + 1;
  const endRecord = Math.min(
    globalStartIndex + paginatedLancamentos.length,
    totalResults
  );

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
              <option value="realizado">Realizado</option>
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
                              : 'Marcar como realizado'
                          }
                          aria-label={
                            isPago
                              ? 'Marcar como pendente'
                              : 'Marcar como realizado'
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
            disabled={actualCurrentPage <= 1 ? true : undefined}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span className={styles.paginationText}>
            Página {actualCurrentPage} de {totalPages}
          </span>

          <button
            type="button"
            className={styles.paginationBtn}
            onClick={handleNextPage}
            disabled={actualCurrentPage >= totalPages ? true : undefined}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
