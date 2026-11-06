import { useEffect, useState } from 'react';
import { obterResumoProcessos } from '@/services/processos';
import {
  EMPTY_PROCESS_SUMMARY,
  formatarResumoProcessos,
} from '@/utils/processo';

export function useResumoProcessos(options = true) {
  const {
    enabled = true,
    diasProximoPrazo = 7,
    funcionarioId,
  } = typeof options === 'boolean' ? { enabled: options } : options;

  const [summary, setSummary] = useState(EMPTY_PROCESS_SUMMARY);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = JSON.stringify([
    diasProximoPrazo,
    funcionarioId,
    reloadKey,
  ]);
  const [settledKey, setSettledKey] = useState('');

  const isLoading = enabled && settledKey !== requestKey;

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;

    Promise.resolve(obterResumoProcessos({ diasProximoPrazo, funcionarioId }))
      .then((received) => {
        if (ignore) return;

        setSummary(formatarResumoProcessos(received));
        setError('');
        setSettledKey(requestKey);
      })
      .catch((receivedError) => {
        if (ignore) return;

        setSummary(EMPTY_PROCESS_SUMMARY);
        setError(
          receivedError instanceof Error
            ? receivedError.message
            : 'Não foi possível carregar o resumo de processos.'
        );
        setSettledKey(requestKey);
      });

    return () => {
      ignore = true;
    };
  }, [diasProximoPrazo, enabled, funcionarioId, reloadKey, requestKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { summary, isLoading, error, reload };
}
