'use client';

import { getStageTone } from '@/utils/atividade';
import { mensagemAmigavel } from '@/utils/erros';
import styles from './ActivityStageSummary.module.css';

export default function ActivityStageSummary({
  total = 0,
  stages = [],
  isLoading = false,
  error = '',
  onRetry,
}) {
  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        <p>{mensagemAmigavel(error)}</p>
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <ul
      className={styles.list}
      aria-label="Resumo de atividades por etapa"
      aria-busy={isLoading}
    >
      <li className={styles.chip}>
        <span className={styles.label}>Total</span>
        <span className={styles.value}>{isLoading ? '—' : total}</span>
      </li>
      {stages.map((stage) => (
        <li key={stage.etapa_id} className={styles.chip}>
          <span className={styles.label}>{stage.nome}</span>
          <span
            className={`${styles.value} ${styles[getStageTone(stage.nome)]}`}
          >
            {isLoading ? '—' : stage.quantidade}
          </span>
        </li>
      ))}
    </ul>
  );
}
