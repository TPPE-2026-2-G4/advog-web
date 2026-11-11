'use client';

import { AlertTriangle } from 'lucide-react';
import {
  calculateRemainingDays,
  formatDeadlineCountdown,
  formatProcessDate,
  getDeadlineTone,
} from '@/utils/processo';
import { mensagemAmigavel } from '@/utils/erros';
import styles from './UpcomingDeadlines.module.css';

const formatDeadlineHeading = (process) => {
  const title = process.titulo || 'Processo sem título';
  const client = process.cliente;

  if (!client || client === 'Sem cliente' || title.includes(client)) {
    return title;
  }

  return `${title} - ${client}`;
};

const formatDeadlineSubtitle = (process) => {
  const description = process.descricao?.trim();
  if (description) return description;

  const meta = [process.area, process.tribunal].filter(Boolean).join(' · ');
  if (meta) return meta;

  return `Prazo: ${formatProcessDate(process.data_prazo)}`;
};

export default function UpcomingDeadlines({
  processes = [],
  isLoading = false,
  error = '',
  onRetry,
  onView,
  windowDays = 15,
}) {
  return (
    <section
      className={styles.card}
      aria-labelledby="upcoming-deadlines-title"
      aria-busy={isLoading}
    >
      <div className={styles.header}>
        <h2 id="upcoming-deadlines-title" className={styles.title}>
          <AlertTriangle size={18} aria-hidden="true" />
          Prazos Próximos
        </h2>
      </div>

      {error ? (
        <div className={styles.errorState} role="alert">
          <p>{mensagemAmigavel(error)}</p>
          {onRetry && (
            <button type="button" className={styles.retry} onClick={onRetry}>
              Tentar novamente
            </button>
          )}
        </div>
      ) : isLoading ? (
        <p className={styles.muted}>Carregando prazos próximos...</p>
      ) : processes.length === 0 ? (
        <p className={styles.muted}>
          Nenhum prazo próximo nos próximos {windowDays} dias.
        </p>
      ) : (
        <ul className={styles.list}>
          {processes.map((process) => {
            const remainingDays =
              process.dias_restantes ??
              calculateRemainingDays(process.data_prazo) ??
              0;
            const tone = getDeadlineTone(remainingDays);

            return (
              <li
                key={process.processo_id || process.id || process.cnj}
                className={styles.item}
              >
                <div className={styles.itemInfo}>
                  {process.cnj && <p className={styles.cnj}>{process.cnj}</p>}
                  <p className={styles.processTitle}>
                    {formatDeadlineHeading(process)}
                  </p>
                  <p className={styles.subtitle}>
                    {formatDeadlineSubtitle(process)}
                  </p>
                </div>

                <div className={styles.itemActions}>
                  <span className={`${styles.badge} ${styles[tone]}`}>
                    {formatDeadlineCountdown(remainingDays)}
                  </span>
                  <button
                    type="button"
                    className={styles.viewButton}
                    onClick={() => onView?.(process)}
                  >
                    Ver
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
