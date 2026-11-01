import { useEffect, useState } from 'react';
import { listarProcessosCriticos, obterProcesso } from '@/services/processos';
import { sortCriticalProcesses } from '@/utils/processo';

export const PROCESS_REFRESH_MS = 60_000;

const getErrorMessage = (error, fallbackMessage) =>
  error instanceof Error ? error.message : fallbackMessage;

export function useProcessosCriticos({
  diasSemMovimentacao = 15,
  funcionarioId,
  enabled = true,
} = {}) {
  const [processos, setProcessos] = useState([]);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = JSON.stringify([
    diasSemMovimentacao,
    funcionarioId,
    reloadKey,
  ]);
  const [settledKey, setSettledKey] = useState('');

  const isLoading = enabled && settledKey === '';
  const isReloading = enabled && settledKey !== '' && settledKey !== requestKey;

  const [detailProcess, setDetailProcess] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const detailId = detailProcess?.processo_id;

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;

    listarProcessosCriticos({ diasSemMovimentacao, funcionarioId })
      .then((data) => {
        if (ignore) return;
        setProcessos(sortCriticalProcesses(data));
        setError('');
        setSettledKey(requestKey);
      })
      .catch((err) => {
        if (ignore) return;
        const msg = getErrorMessage(
          err,
          'Não foi possível carregar os processos críticos.'
        );
        setError(msg);
        setSettledKey(requestKey);
      });

    return () => {
      ignore = true;
    };
  }, [diasSemMovimentacao, funcionarioId, enabled, reloadKey, requestKey]);

  useEffect(() => {
    if (!enabled) return;

    const refreshIfVisible = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        setReloadKey((k) => k + 1);
      }
    };

    const timer = setInterval(refreshIfVisible, PROCESS_REFRESH_MS);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refreshIfVisible);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshIfVisible);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', refreshIfVisible);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshIfVisible);
      }
    };
  }, [enabled]);

  const fetchDetail = (procId) => {
    if (!procId) return;
    setIsDetailLoading(true);
    setDetailError('');

    obterProcesso(procId)
      .then((proc) => {
        if (proc) {
          setDetailProcess(proc);
        } else {
          setDetailError('Processo não encontrado ou removido.');
        }
      })
      .catch((err) => {
        setDetailError(
          getErrorMessage(
            err,
            'Não foi possível carregar os detalhes do processo.'
          )
        );
      })
      .finally(() => {
        setIsDetailLoading(false);
      });
  };

  const openDetail = (proc) => {
    if (!proc) return;
    setDetailProcess(proc);
    setDetailError('');
    const id = proc.processo_id || proc.id;
    if (id) {
      fetchDetail(id);
    }
  };

  const closeDetail = () => {
    setDetailProcess(null);
    setDetailError('');
    setIsDetailLoading(false);
  };

  const retryDetail = () => {
    if (detailId) {
      fetchDetail(detailId);
    }
  };

  const reload = () => {
    setReloadKey((k) => k + 1);
  };

  return {
    processos,
    isLoading,
    isReloading,
    error,
    reload,
    detailProcess,
    setDetailProcess,
    isDetailLoading,
    detailError,
    openDetail,
    closeDetail,
    retryDetail,
  };
}
