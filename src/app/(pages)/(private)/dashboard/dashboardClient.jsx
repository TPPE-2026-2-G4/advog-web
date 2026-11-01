'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import CriticalProcessesCard from '@/components/features/processos/CriticalProcessesCard/CriticalProcessesCard';
import ProcessDetailsModal from '@/components/features/processos/ProcessDetailsModal/ProcessDetailsModal';
import { useProcessosCriticos } from '@/hooks/useProcessosCriticos';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
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

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState} role="alert">
          <div>
            <h1>Acesso negado</h1>
            <p>Você não possui permissão para visualizar processos.</p>
          </div>
        </div>
      </div>
    );
  }

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
        <CriticalProcessesCard
          processes={enrichedProcesses}
          isLoading={isLoading}
          isReloading={isReloading}
          error={error}
          onRetry={reload}
          onAnalyze={openDetail}
          thresholdDays={15}
        />
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
