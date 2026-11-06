'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Clock } from 'lucide-react';
import ActivitySummary from '@/components/features/atividades/ActivitySummary/ActivitySummary';
import RecentActivities from '@/components/features/atividades/RecentActivities/RecentActivities';
import StatCard from '@/components/ui/StatCard/StatCard';
import CriticalProcessesCard from '@/components/features/processos/CriticalProcessesCard/CriticalProcessesCard';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import { useKanbanAtividades } from '@/hooks/useKanbanAtividades';
import { useProcessosCriticos } from '@/hooks/useProcessosCriticos';
import { useResumoAtividades } from '@/hooks/useResumoAtividades';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { getRecentActivities } from '@/utils/atividade';
import { getCurrentUser } from '@/utils/authSession';
import { enrichProcess } from '@/utils/processo';
import styles from './dashboard.module.css';

const emptySubscribe = () => () => {};

export default function DashboardClient() {
  const permissionsJson = useSyncExternalStore(
    emptySubscribe,
    () => JSON.stringify(getCurrentUser()?.cargo?.permissao ?? {}),
    () => '{}'
  );
  const permissions = JSON.parse(permissionsJson);
  const canView = permissions.visualizar_processos === true;

  const {
    summary: activitySummary,
    isLoading: isSummaryLoading,
    error: summaryError,
    reload: reloadSummary,
  } = useResumoAtividades();

  const {
    stages: activityStages,
    isLoading: isActivitiesLoading,
    error: activitiesError,
    reload: reloadActivities,
  } = useKanbanAtividades();

  const recentActivities = useMemo(
    () => getRecentActivities(activityStages),
    [activityStages]
  );

  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [referenceError, setReferenceError] = useState('');

  const {
    processos,
    isLoading,
    isReloading,
    error,
    reload,
    detailProcess,
    detailError,
    openDetail,
    closeDetail,
    retryDetail,
  } = useProcessosCriticos({
    enabled: canView,
    diasSemMovimentacao: 15,
  });

  useEffect(() => {
    if (!canView) return;

    Promise.all([listarClientes(), listarFuncionarios()])
      .then(([receivedClients, receivedEmployees]) => {
        setClientes(receivedClients);
        setFuncionarios(receivedEmployees);
        setReferenceError('');
      })
      .catch((err) => {
        setReferenceError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar clientes e responsáveis.'
        );
      });
  }, [canView]);

  const clientNames = useMemo(
    () =>
      new Map(clientes.map((item) => [item.cliente_id || item.id, item.nome])),
    [clientes]
  );

  const employeeNames = useMemo(
    () =>
      new Map(
        funcionarios.map((item) => [item.funcionario_id || item.id, item.nome])
      ),
    [funcionarios]
  );

  const enrichedProcesses = useMemo(
    () =>
      processos.map((proc) => enrichProcess(proc, clientNames, employeeNames)),
    [processos, clientNames, employeeNames]
  );

  const enrichedDetail = useMemo(
    () => enrichProcess(detailProcess, clientNames, employeeNames),
    [detailProcess, clientNames, employeeNames]
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Visão Geral</h1>
          <p className={styles.subtitle}>
            Acompanhe o resumo do escritório e os casos que exigem atenção.
          </p>
        </div>
      </header>

      {referenceError && (
        <div className={styles.warningBanner} role="status">
          <span>{referenceError}</span>
        </div>
      )}

      <main className={styles.main}>
        <div className={styles.statsGrid}>
          <StatCard
            title="Atividades Pendentes"
            value={
              isSummaryLoading || summaryError ? '—' : activitySummary.pendentes
            }
            icon={Clock}
            iconColor="#C1A077"
          />
        </div>

        <div className={styles.activitiesGrid}>
          <ActivitySummary
            summary={activitySummary}
            isLoading={isSummaryLoading}
            error={summaryError}
            onRetry={reloadSummary}
          />
          <RecentActivities
            activities={recentActivities}
            isLoading={isActivitiesLoading}
            error={activitiesError}
            onRetry={reloadActivities}
          />
        </div>

        {canView ? (
          <CriticalProcessesCard
            processes={enrichedProcesses}
            isLoading={isLoading}
            isReloading={isReloading}
            error={error}
            onRetry={reload}
            onAnalyze={openDetail}
            thresholdDays={15}
          />
        ) : (
          <div className={styles.errorState} role="alert">
            <div>
              <h2>Acesso negado</h2>
              <p>Você não possui permissão para visualizar processos.</p>
            </div>
          </div>
        )}
      </main>

      {enrichedDetail && (
        <ProcessDetailsModal
          key={enrichedDetail.processo_id || enrichedDetail.id}
          process={enrichedDetail}
          error={detailError}
          onRetry={retryDetail}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
