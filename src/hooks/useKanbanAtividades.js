import { useEffect, useState } from 'react';
import { obterKanbanAtividades } from '@/services/atividades';
import { toKanbanStages } from '@/utils/atividade';

export function useKanbanAtividades(enabled = true) {
  const [stages, setStages] = useState([]);
  const [scope, setScope] = useState('usuario');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [settledKey, setSettledKey] = useState(-1);

  const isLoading = enabled && settledKey !== reloadKey;

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;

    obterKanbanAtividades()
      .then((received) => {
        if (ignore) return;

        setStages(toKanbanStages(received));
        setScope(received?.escopo === 'escritorio' ? 'escritorio' : 'usuario');
        setError('');
        setSettledKey(reloadKey);
      })
      .catch((receivedError) => {
        if (ignore) return;

        setStages([]);
        setError(
          receivedError instanceof Error
            ? receivedError.message
            : 'Não foi possível carregar as atividades.'
        );
        setSettledKey(reloadKey);
      });

    return () => {
      ignore = true;
    };
  }, [enabled, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { stages, scope, isLoading, error, reload };
}
