'use client';

import { Layers } from 'lucide-react';
import { getActivityScopeLabel } from '@/utils/atividade';
import { mensagemAmigavel } from '@/utils/erros';
import styles from './ActivitySummary.module.css';

const SUMMARY_ITEMS = [
  { key: 'pendentes', label: 'Pendentes', tone: 'neutral' },
  { key: 'em_execucao', label: 'Em execução', tone: 'info' },
  { key: 'concluidas', label: 'Concluídas', tone: 'success' },
  { key: 'atrasadas', label: 'Atrasadas', tone: 'danger' },
];

export default function ActivitySummary({
  summary,
  isLoading = false,
  error = '',
  onRetry,
}) {
  return (
    <section
      className={styles.card}
      aria-labelledby="activity-summary-title"
      aria-busy={isLoading}
    >
      <div className={styles.header}>
        <h2 id="activity-summary-title" className={styles.title}>
          <Layers size={20} aria-hidden="true" />
          Resumo de Atividades
        </h2>
        {!error && summary && (
          <span className={styles.scope}>
            {getActivityScopeLabel(summary.escopo)}
          </span>
        )}
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
      ) : (
        <ul className={styles.grid}>
          {SUMMARY_ITEMS.map((item) => (
            <li key={item.key} className={styles.item}>
              <span className={`${styles.value} ${styles[item.tone]}`}>
                {isLoading ? '—' : (summary?.[item.key] ?? 0)}
              </span>
              <span className={styles.label}>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
