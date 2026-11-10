'use client';

import { TrendingUp } from 'lucide-react';
import { useProdutividadeEquipe } from '@/hooks/useProdutividadeEquipe';
import { isAdministratorAccount } from '@/utils/funcionario';
import {
  EMPTY_TEAM_SUMMARY,
  obterProgressoEquipe,
} from '@/utils/produtividadeEquipe';
import styles from './TeamProductivity.module.css';

export default function ProdutividadeEquipe({ canView = false }) {
  const { productivity, isLoading, error } = useProdutividadeEquipe(canView);

  if (!canView) return null;

  const visibleProductivity = (productivity || []).filter(
    (summary) => !isAdministratorAccount(summary)
  );

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
              <th className={styles.numericColumn}>Finalizadas</th>
              <th className={styles.numericColumn}>Em andamento</th>
              <th className={styles.numericColumn}>A fazer</th>
              <th className={styles.numericColumn}>Atrasadas</th>
              <th className={styles.numericColumn}>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {visibleProductivity.map((summary) => {
              const currentSummary = summary || EMPTY_TEAM_SUMMARY;
              const progress = obterProgressoEquipe(currentSummary);

              return (
                <tr key={currentSummary.funcionario_id}>
                  <th scope="row">{currentSummary.nome}</th>
                  <td className={styles.numericColumn}>
                    {!isLoading && currentSummary.finalizadas > 0 ? (
                      <span
                        className={`${styles.badge} ${styles.badgeSuccess}`}
                      >
                        {currentSummary.finalizadas}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.numericColumn}>
                    {!isLoading && currentSummary.em_andamento > 0 ? (
                      <span className={`${styles.badge} ${styles.badgeInfo}`}>
                        {currentSummary.em_andamento}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.numericColumn}>
                    {!isLoading && currentSummary.a_fazer > 0 ? (
                      <span
                        className={`${styles.badge} ${styles.badgeWarning}`}
                      >
                        {currentSummary.a_fazer}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.numericColumn}>
                    {!isLoading && currentSummary.atrasadas > 0 ? (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>
                        {currentSummary.atrasadas}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.numericColumn}>
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
