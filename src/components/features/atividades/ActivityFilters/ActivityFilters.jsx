import { RotateCcw, Search } from 'lucide-react';
import styles from './ActivityFilters.module.css';

export default function ActivityFilters({
  filters = {},
  responsaveis = [],
  onFilterChange,
  onClear,
}) {
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
        <select
          name="funcionarioId"
          aria-label="Filtrar por responsável"
          className={styles.pillSelect}
          value={filters.funcionarioId ?? ''}
          onChange={handleChange}
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((resp) => (
            <option key={resp.value} value={resp.value}>
              {resp.label}
            </option>
          ))}
        </select>

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
