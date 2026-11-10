import { useEffect, useMemo, useState } from 'react';
import {
  filtrarAtividades,
  obterKanbanAtividades,
} from '@/services/atividades';
import {
  distributeActivitiesIntoStages,
  toKanbanStages,
} from '@/utils/atividade';

const SEARCH_DEBOUNCE_MS = 300;

export const EMPTY_ACTIVITY_FILTERS = Object.freeze({
  busca: '',
  funcionarioId: '',
  prazoFim: '',
});

export function useKanbanAtividades(enabled = true) {
  const [baseStages, setBaseStages] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState(null);
  const [scope, setScope] = useState('usuario');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [settledKey, setSettledKey] = useState(-1);

  const [filters, setFilters] = useState(EMPTY_ACTIVITY_FILTERS);
  const [debouncedBusca, setDebouncedBusca] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusca(filters.busca);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [filters.busca]);

  const hasActiveFilters = Boolean(
    debouncedBusca.trim() || filters.funcionarioId || filters.prazoFim
  );

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;

    obterKanbanAtividades()
      .then((received) => {
        if (ignore) return;

        setBaseStages(toKanbanStages(received));
        setScope(received?.escopo === 'escritorio' ? 'escritorio' : 'usuario');
        setError('');
        setSettledKey(reloadKey);
      })
      .catch((receivedError) => {
        if (ignore) return;

        setBaseStages([]);
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

  useEffect(() => {
    if (!enabled || !hasActiveFilters) {
      return;
    }

    let ignore = false;

    filtrarAtividades({
      busca_textual: debouncedBusca,
      funcionario_id: filters.funcionarioId || undefined,
      prazo_fim: filters.prazoFim || undefined,
    })
      .then((atividades) => {
        if (ignore) return;

        setFilteredActivities(atividades);
        setError('');
      })
      .catch((receivedError) => {
        if (ignore) return;

        setFilteredActivities([]);
        setError(
          receivedError instanceof Error
            ? receivedError.message
            : 'Não foi possível filtrar as atividades.'
        );
      });

    return () => {
      ignore = true;
    };
  }, [
    enabled,
    debouncedBusca,
    filters.funcionarioId,
    filters.prazoFim,
    hasActiveFilters,
    reloadKey,
  ]);

  const stages = useMemo(() => {
    if (!hasActiveFilters || filteredActivities === null) {
      return baseStages;
    }

    return distributeActivitiesIntoStages(baseStages, filteredActivities);
  }, [baseStages, filteredActivities, hasActiveFilters]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_ACTIVITY_FILTERS);
    setDebouncedBusca('');
    setFilteredActivities(null);
  };

  const reload = () => setReloadKey((key) => key + 1);

  return {
    stages,
    scope,
    isLoading: enabled && settledKey !== reloadKey,
    error,
    filters,
    hasActiveFilters,
    setFilter,
    clearFilters,
    reload,
  };
}
