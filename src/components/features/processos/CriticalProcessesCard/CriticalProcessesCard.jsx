'use client';

import { ChevronDown, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { calculateDaysSince, formatProcessDate } from '@/utils/processo';
import styles from './CriticalProcessesCard.module.css';

export default function CriticalProcessesCard({
  processes = [],
  isLoading = false,
  isReloading = false,
  error = '',
  onRetry,
  onAnalyze,
  thresholdDays = 15,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleAccordion = () => {
    setIsExpanded((prev) => !prev);
  };

  const renderMovementBadge = (process) => {
    if (process.data_realizado) {
      const days = calculateDaysSince(process.data_realizado);
      const formattedDate = formatProcessDate(process.data_realizado);

      return (
        <div className={styles.movementContainer}>
          <span className={styles.warningBadge}>{formattedDate}</span>
          {days !== null && (
            <span className={styles.daysText}>
              Há {days} {days === 1 ? 'dia' : 'dias'}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className={styles.movementContainer}>
        <span className={styles.noMovementBadge}>Sem movimentação</span>
        {process.data_inicio && (
          <span className={styles.daysText}>
            Desde o início: {formatProcessDate(process.data_inicio)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.card} role="region" aria-label="Processos Críticos">
      <div className={styles.cardHeader}>
        <div className={styles.titleWrapper}>
          <Clock className={styles.clockIcon} size={20} aria-hidden="true" />
          <h2 className={styles.cardTitle}>
            Processos Críticos (Sem movimentação)
          </h2>
          <span
            className={styles.countBadge}
            aria-label={`${processes.length} processos críticos`}
          >
            {processes.length}
          </span>
          {isReloading && (
            <span
              className={styles.reloadingIndicator}
              title="Atualizando lista..."
            >
              <RefreshCw
                size={14}
                className={styles.spinningIcon}
                aria-hidden="true"
              />
              <span className={styles.srOnly}>
                Atualizando em segundo plano
              </span>
            </span>
          )}
        </div>

        {/* Botão de Accordion para dispositivos móveis (< 768px) */}
        <button
          type="button"
          className={styles.accordionToggle}
          aria-expanded={isExpanded}
          aria-controls="critical-processes-content"
          onClick={toggleAccordion}
        >
          <span className={styles.accordionToggleText}>
            {isExpanded ? 'Ocultar' : 'Ver lista'}
          </span>
          <ChevronDown
            size={18}
            className={`${styles.chevronIcon} ${isExpanded ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {error ? (
        <div role="alert" className={styles.errorState}>
          <AlertTriangle
            size={20}
            className={styles.errorIcon}
            aria-hidden="true"
          />
          <div className={styles.errorContent}>
            <p className={styles.errorMessage}>{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={styles.retryButton}
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      ) : isLoading ? (
        <div
          className={styles.loadingState}
          aria-busy="true"
          aria-label="Carregando processos críticos"
        >
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : processes.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={28} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyTitle}>
            Nenhum processo sem movimentação há {thresholdDays} dias ou mais.
          </p>
          <p className={styles.emptySubtitle}>
            Todos os seus processos em andamento estão com movimentações
            recentes.
          </p>
        </div>
      ) : (
        <div
          id="critical-processes-content"
          className={`${styles.contentWrapper} ${isExpanded ? styles.contentExpanded : ''}`}
        >
          {/* Visualização em Tabela para Desktop */}
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Número / Título</th>
                  <th className={styles.th}>Cliente</th>
                  <th className={styles.th}>Última Movimentação</th>
                  <th className={`${styles.th} ${styles.actionsHeading}`}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {processes.map((proc) => (
                  <tr
                    key={proc.processo_id || proc.id || proc.cnj}
                    className={styles.tr}
                  >
                    <td className={styles.td}>
                      <p className={styles.processNumber}>{proc.cnj}</p>
                      <p className={styles.processTitle}>{proc.titulo}</p>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.clientName}>
                        {proc.cliente || 'Sem cliente'}
                      </span>
                    </td>
                    <td className={styles.td}>{renderMovementBadge(proc)}</td>
                    <td className={`${styles.td} ${styles.actionTd}`}>
                      <button
                        type="button"
                        className={styles.analyzeButton}
                        onClick={() => onAnalyze && onAnalyze(proc)}
                      >
                        Analisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visualização em Cards empilhados para Mobile */}
          <div className={styles.mobileList}>
            {processes.map((proc) => (
              <div
                key={proc.processo_id || proc.id || proc.cnj}
                className={styles.mobileCard}
              >
                <div className={styles.mobileCardHeader}>
                  <p className={styles.processNumber}>{proc.cnj}</p>
                  {renderMovementBadge(proc)}
                </div>
                <h3 className={styles.mobileCardTitle}>{proc.titulo}</h3>
                <p className={styles.mobileClientText}>
                  <strong>Cliente:</strong> {proc.cliente || 'Sem cliente'}
                </p>
                <button
                  type="button"
                  className={styles.mobileAnalyzeButton}
                  onClick={() => onAnalyze && onAnalyze(proc)}
                >
                  Analisar Processo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
