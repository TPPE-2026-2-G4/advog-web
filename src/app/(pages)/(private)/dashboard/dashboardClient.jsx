'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';
import ActivitySummary from '@/components/features/atividades/ActivitySummary/ActivitySummary';
import RecentActivities from '@/components/features/atividades/RecentActivities/RecentActivities';
import StatCard from '@/components/ui/StatCard/StatCard';
import CriticalProcessesCard from '@/components/features/processos/CriticalProcessesCard/CriticalProcessesCard';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import ProcessSummary from '@/components/features/processos/ProcessSummary/ProcessSummary';
import UpcomingDeadlines from '@/components/features/processos/UpcomingDeadlines/UpcomingDeadlines';
import { useKanbanAtividades } from '@/hooks/useKanbanAtividades';
import { subscribeAlertasConfig } from '@/constants/preferencias';
import { getSavedDashboardPrefs } from '@/hooks/useAjustes';
import { usePrazosProximos } from '@/hooks/usePrazosProximos';
import { useProcessosCriticos } from '@/hooks/useProcessosCriticos';
import { useResumoAtividades } from '@/hooks/useResumoAtividades';
import { useResumoProcessos } from '@/hooks/useResumoProcessos';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { getRecentActivities } from '@/utils/atividade';
import { getCurrentUser } from '@/utils/authSession';
import { isAdministratorAccount } from '@/utils/funcionario';
import { enrichProcess } from '@/utils/processo';
import styles from './dashboard.module.css';

const emptySubscribe = () => () => {};

export default function DashboardClient() {
  const userJson = useSyncExternalStore(
    emptySubscribe,
    () => JSON.stringify(getCurrentUser() ?? null),
    () => 'null'
  );
  const currentUser = JSON.parse(userJson);
  const permissions = currentUser?.cargo?.permissao ?? {};
  const isUserAdmin = isAdministratorAccount(currentUser);
  const canView =
    isUserAdmin ||
    permissions.visualizar_processos === true ||
    permissions.gerenciar_processos === true;
  const canEdit = isUserAdmin || permissions.gerenciar_processos === true;

  const dashboardPrefsJson = useSyncExternalStore(
    subscribeAlertasConfig,
    () => {
      const prefs = getSavedDashboardPrefs();
      const user = getCurrentUser();
      const funcionarioId =
        prefs.escopoProcessos === 'meus_processos'
          ? (user?.funcionario_id ?? user?.id)
          : undefined;
      return JSON.stringify({ ...prefs, funcionarioId });
    },
    () =>
      JSON.stringify({
        escopoProcessos: 'escritorio',
        diasPrazo: 15,
        diasCritico: 15,
      })
  );
  const {
    diasPrazo,
    diasCritico,
    funcionarioId: filterFuncionarioId,
  } = JSON.parse(dashboardPrefsJson);

  const {
    summary: processSummary,
    isLoading: isProcessSummaryLoading,
    error: processSummaryError,
    reload: reloadProcessSummary,
  } = useResumoProcessos({
    enabled: canView,
    funcionarioId: filterFuncionarioId,
  });

  const {
    processos: upcomingProcesses,
    isLoading: isUpcomingLoading,
    error: upcomingError,
    reload: reloadUpcoming,
  } = usePrazosProximos({ enabled: canView, diasPrazo });

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
    diasSemMovimentacao: diasCritico,
    funcionarioId: filterFuncionarioId,
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

  const enrichedUpcomingProcesses = useMemo(
    () =>
      upcomingProcesses.map((proc) =>
        enrichProcess(proc, clientNames, employeeNames)
      ),
    [upcomingProcesses, clientNames, employeeNames]
  );

  const enrichedDetail = useMemo(
    () => enrichProcess(detailProcess, clientNames, employeeNames),
    [detailProcess, clientNames, employeeNames]
  );

  const canShowProcessStats =
    canView && !isProcessSummaryLoading && !processSummaryError;

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
            title="Processos Ativos"
            value={canShowProcessStats ? processSummary.em_andamento : '—'}
            icon={ArrowUpRight}
            iconColor="#34785f"
          />
          <StatCard
            title="Atividades Pendentes"
            value={
              isSummaryLoading || summaryError ? '—' : activitySummary.pendentes
            }
            icon={Clock}
            iconColor="#C1A077"
          />
          <StatCard
            title="Prazos Urgentes"
            value={canShowProcessStats ? processSummary.proximos_do_prazo : '—'}
            icon={ArrowDownRight}
            iconColor="#A8283A"
          />
        </div>

        {canView ? (
          <>
            <div className={styles.summariesGrid}>
              <ProcessSummary
                summary={processSummary}
                isLoading={isProcessSummaryLoading}
                error={processSummaryError}
                onRetry={reloadProcessSummary}
              />
              <ActivitySummary
                summary={activitySummary}
                isLoading={isSummaryLoading}
                error={summaryError}
                onRetry={reloadSummary}
              />
            </div>

            <div className={styles.activitiesGrid}>
              <UpcomingDeadlines
                processes={enrichedUpcomingProcesses}
                isLoading={isUpcomingLoading}
                error={upcomingError}
                onRetry={reloadUpcoming}
                onView={openDetail}
                windowDays={diasPrazo}
              />
              <RecentActivities
                activities={recentActivities}
                isLoading={isActivitiesLoading}
                error={activitiesError}
                onRetry={reloadActivities}
              />
            </div>

            <CriticalProcessesCard
              processes={enrichedProcesses}
              isLoading={isLoading}
              isReloading={isReloading}
              error={error}
              onRetry={reload}
              onAnalyze={openDetail}
              thresholdDays={diasCritico}
            />
          </>
        ) : (
          <>
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

            <div className={styles.errorState} role="alert">
              <div>
                <h2>Acesso negado</h2>
                <p>Você não possui permissão para visualizar processos.</p>
              </div>
            </div>
          </>
        )}
      </main>

      {enrichedDetail && (
        <ProcessDetailsModal
          key={enrichedDetail.processo_id || enrichedDetail.id}
          process={enrichedDetail}
          error={detailError}
          onRetry={retryDetail}
          onClose={closeDetail}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
