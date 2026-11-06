'use client';

import { Scale } from 'lucide-react';
import styles from './ProcessSummary.module.css';

const SUMMARY_ITEMS = [
  { key: 'em_andamento', label: 'Em andamento', tone: 'success' },
  { key: 'em_analise', label: 'Em análise', tone: 'info' },
  { key: 'finalizados', label: 'Finalizados', tone: 'dark' },
  { key: 'proximos_do_prazo', label: 'Próximos do prazo', tone: 'warning' },
];

export default function ProcessSummary({
  summary,
  isLoading = false,
  error = '',
  onRetry,
}) {
  return (
    <section
      className={styles.card}
      aria-labelledby="process-summary-title"
      aria-busy={isLoading}
    >
      <div className={styles.header}>
        <h2 id="process-summary-title" className={styles.title}>
          <Scale size={20} aria-hidden="true" />
          Resumo de Processos
        </h2>
      </div>

      {error ? (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
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
