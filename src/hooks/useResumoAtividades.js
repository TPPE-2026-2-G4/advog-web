import { useEffect, useState } from 'react';
import { obterResumoAtividades } from '@/services/dashboard';
import {
  EMPTY_ACTIVITY_SUMMARY,
  formatarResumoAtividades,
} from '@/utils/atividade';

export function useResumoAtividades(enabled = true) {
  const [summary, setSummary] = useState(EMPTY_ACTIVITY_SUMMARY);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [settledKey, setSettledKey] = useState(-1);

  const isLoading = enabled && settledKey !== reloadKey;

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;

    obterResumoAtividades()
      .then((received) => {
        if (ignore) return;

        setSummary(formatarResumoAtividades(received));
        setError('');
        setSettledKey(reloadKey);
      })
      .catch((receivedError) => {
        if (ignore) return;

        setSummary(EMPTY_ACTIVITY_SUMMARY);
        setError(
          receivedError instanceof Error
            ? receivedError.message
            : 'Não foi possível carregar o resumo de atividades.'
        );
        setSettledKey(reloadKey);
      });

    return () => {
      ignore = true;
    };
  }, [enabled, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { summary, isLoading, error, reload };
}
