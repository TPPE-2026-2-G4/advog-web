'use client';

import { useMemo } from 'react';
import ActivityStageSummary from '@/components/features/atividades/ActivityStageSummary/ActivityStageSummary';
import { useKanbanAtividades } from '@/hooks/useKanbanAtividades';
import { countActivitiesByStage } from '@/utils/atividade';
import styles from './atividades.module.css';

export default function AtividadesClient() {
  const { stages, isLoading, error, reload } = useKanbanAtividades();

  const { total, stages: stageCounts } = useMemo(
    () => countActivitiesByStage(stages),
    [stages]
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quadro de Atividades</h1>
          <p className={styles.subtitle}>
            Gerencie as tarefas do escritório por status
          </p>
        </div>
      </header>

      <ActivityStageSummary
        total={total}
        stages={stageCounts}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
      />
    </div>
  );
}
