import { useMemo } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import AutocompleteResponsible from '@/components/features/clientes/AutocompleteResponsible/AutocompleteResponsible';
import { normalizeResponsavelItems } from '@/utils/funcionario';
import styles from './ActivityFilters.module.css';

export default function ActivityFilters({
  filters = {},
  responsaveis = [],
  funcionarios = [],
  onFilterChange,
  onClear,
}) {
  const funcionariosList = useMemo(
    () => normalizeResponsavelItems(funcionarios, responsaveis),
    [funcionarios, responsaveis]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange?.(name, value);
  };

  const hasActiveFilters = Boolean(
    filters.busca || filters.funcionarioId || filters.prazoFim
  );

  return (
    <section className={styles.container} aria-label="Filtrar atividades">
      <div className={styles.searchContainer}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          name="busca"
          aria-label="buscar atividades"
          className={styles.searchInput}
          placeholder="Buscar por título, descrição ou responsável..."
          value={filters.busca ?? ''}
          onChange={handleChange}
        />
      </div>

      <div className={styles.filtersGroup}>
        <div className={styles.autocompleteFilterWrapper}>
          <AutocompleteResponsible
            id="atividades-filtro-responsavel"
            name="funcionarioId"
            responsavelId={filters.funcionarioId ?? ''}
            onChange={(id) =>
              onFilterChange?.('funcionarioId', id ? String(id) : '')
            }
            funcionarios={funcionariosList}
            placeholder="Todos os responsáveis"
            ariaLabel="Filtrar por responsável"
          />
        </div>

        <label className={styles.dateGroup}>
          <span className={styles.dateLabel}>Prazo até:</span>
          <input
            type="date"
            name="prazoFim"
            aria-label="Prazo até"
            className={styles.pillDate}
            value={filters.prazoFim ?? ''}
            onChange={handleChange}
          />
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClear}
            aria-label="Limpar filtros"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>
    </section>
  );
}
