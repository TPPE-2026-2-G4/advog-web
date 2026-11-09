import { useEffect, useState } from 'react';
import { listarProcessos } from '@/services/processos';
import {
  getUpcomingDeadlineWindow,
  getUpcomingProcesses,
} from '@/utils/processo';

export const UPCOMING_DEADLINES_DAYS = 15;
export const UPCOMING_DEADLINES_LIMIT = 5;
export const UPCOMING_DEADLINES_PAGE_SIZE = 100;

export function usePrazosProximos(options = true) {
  const {
    enabled = true,
    diasPrazo = UPCOMING_DEADLINES_DAYS,
    limite = UPCOMING_DEADLINES_LIMIT,
  } = typeof options === 'boolean' ? { enabled: options } : options;

  const [processos, setProcessos] = useState([]);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = JSON.stringify([diasPrazo, limite, reloadKey]);
  const [settledKey, setSettledKey] = useState('');

  const isLoading = enabled && settledKey !== requestKey;

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;
    const { prazoInicio, prazoFim } = getUpcomingDeadlineWindow(diasPrazo);

    Promise.resolve(
      listarProcessos({
        prazoInicio,
        prazoFim,
        page: 1,
        pageSize: UPCOMING_DEADLINES_PAGE_SIZE,
      })
    )
      .then((received) => {
        if (ignore) return;

        const items = Array.isArray(received)
          ? received
          : (received?.itens ?? []);
        setProcessos(
          getUpcomingProcesses(items, { days: diasPrazo, limit: limite })
        );
        setError('');
        setSettledKey(requestKey);
      })
      .catch((receivedError) => {
        if (ignore) return;

        setProcessos([]);
        setError(
          receivedError instanceof Error
            ? receivedError.message
            : 'Não foi possível carregar os prazos próximos.'
        );
        setSettledKey(requestKey);
      });

    return () => {
      ignore = true;
    };
  }, [diasPrazo, enabled, limite, reloadKey, requestKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { processos, isLoading, error, reload };
}
