'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
} from 'lucide-react';
import { formatProcessDate } from '@/utils/processo';
import { formatActivityResponsibles } from '@/utils/atividade';
import styles from './RecentActivities.module.css';

const getActivityIcon = (activity) => {
  if (activity.atrasada) return AlertTriangle;
  if (activity.finalizada) return CheckCircle2;
  if (activity.etapa === 'Backlog') return ClipboardList;
  return Clock;
};

export default function RecentActivities({
  activities = [],
  isLoading = false,
  error = '',
  onRetry,
}) {
  return (
    <section
      className={styles.card}
      aria-labelledby="recent-activities-title"
      aria-busy={isLoading}
    >
      <h2 id="recent-activities-title" className={styles.title}>
        Atividade Recente
      </h2>

      {error ? (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          {onRetry && (
            <button type="button" className={styles.retry} onClick={onRetry}>
              Tentar novamente
            </button>
          )}
        </div>
      ) : isLoading ? (
        <p className={styles.muted}>Carregando atividades...</p>
      ) : activities.length === 0 ? (
        <p className={styles.muted}>Nenhuma atividade registrada.</p>
      ) : (
        <ul className={styles.list}>
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity);

            return (
              <li key={activity.atividade_id} className={styles.item}>
                <span
                  className={`${styles.icon} ${activity.atrasada ? styles.iconDanger : ''}`}
                >
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div className={styles.content}>
                  <p className={styles.activityTitle}>{activity.titulo}</p>
                  <p className={styles.meta}>
                    {activity.etapa} ·{' '}
                    {formatActivityResponsibles(activity.responsaveis)}
                  </p>
                  <p
                    className={`${styles.meta} ${activity.atrasada ? styles.late : ''}`}
                  >
                    {activity.atrasada ? 'Atrasada · ' : ''}Prazo:{' '}
                    {formatProcessDate(activity.data_prazo)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
