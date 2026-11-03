'use client';

import { TrendingUp } from 'lucide-react';
import { useTeamProductivity } from '@/hooks/useTeamProductivity';
import { EMPTY_TEAM_SUMMARY, getTeamProgress } from '@/utils/teamProductivity';
import styles from './TeamProductivity.module.css';

export default function TeamProductivity({ canView = false }) {
  const { productivity, isLoading, error } = useTeamProductivity(canView);

  if (!canView) return null;

  return (
    <section
      className={styles.container}
      aria-labelledby="team-productivity-title"
    >
      <div className={styles.heading}>
        <h2 id="team-productivity-title" className={styles.title}>
          <TrendingUp size={21} aria-hidden="true" />
          Produtividade da Equipe
        </h2>
      </div>

      <div className={styles.tableScroll}>
        {error && <p className={styles.muted}>{error}</p>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Responsável</th>
              <th>Finalizadas</th>
              <th>Em andamento</th>
              <th>A fazer</th>
              <th>Atrasadas</th>
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {productivity.map((summary) => {
              const currentSummary = summary || EMPTY_TEAM_SUMMARY;
              const progress = getTeamProgress(currentSummary);

              return (
                <tr key={currentSummary.funcionario_id}>
                  <th scope="row">{currentSummary.nome}</th>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                      {isLoading ? '—' : currentSummary.finalizadas}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                      {isLoading ? '—' : currentSummary.em_andamento}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeWarning}`}>
                      {isLoading ? '—' : currentSummary.a_fazer}
                    </span>
                  </td>
                  <td>
                    {isLoading ? (
                      <span className={styles.muted}>—</span>
                    ) : currentSummary.atrasadas > 0 ? (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>
                        {currentSummary.atrasadas}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.progressCell}>
                      <span className={styles.progressTrack}>
                        <span
                          className={styles.progressFill}
                          style={{ width: `${isLoading ? 0 : progress}%` }}
                        />
                      </span>
                      <span className={styles.progressValue}>
                        {isLoading ? '—' : `${Math.round(progress)}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
