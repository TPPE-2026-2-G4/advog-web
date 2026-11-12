import { useMemo } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import AutocompleteResponsible from '@/components/features/clientes/AutocompleteResponsible/AutocompleteResponsible';
import { normalizeResponsavelItems } from '@/utils/funcionario';
import { PROCESS_STATUS } from '@/utils/processo';
import styles from './ProcessFilters.module.css';

export default function ProcessFilters({
  filters,
  responsaveis = [],
  funcionarios = [],
  dateRangeError = '',
  onFilterChange,
}) {
  const funcionariosList = useMemo(
    () => normalizeResponsavelItems(funcionarios, responsaveis),
    [funcionarios, responsaveis]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    onFilterChange(name, value);
  };

  const handleClear = () => {
    ['busca', 'status', 'responsavelId', 'prazoInicio', 'prazoFim'].forEach(
      (field) => {
        onFilterChange(field, '');
      }
    );
  };

  return (
    <section className={styles.container} aria-label="Filtrar processos">
      <div className={styles.searchContainer}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          name="busca"
          className={styles.searchInput}
          placeholder="Buscar por número, cliente ou título..."
          value={filters.busca}
          onChange={handleChange}
        />
      </div>

      <div className={styles.filtersContainer}>
        <div className={styles.dateGroup}>
          <label className={styles.inlineLabel}>
            <span className={styles.labelText}>De:</span>
            <input
              type="date"
              name="prazoInicio"
              className={styles.pillInput}
              value={filters.prazoInicio}
              max={filters.prazoFim || undefined}
              aria-invalid={dateRangeError ? 'true' : undefined}
              onChange={handleChange}
            />
          </label>
          <label className={styles.inlineLabel}>
            <span className={styles.labelText}>Até:</span>
            <input
              type="date"
              name="prazoFim"
              className={styles.pillInput}
              value={filters.prazoFim}
              min={filters.prazoInicio || undefined}
              aria-invalid={dateRangeError ? 'true' : undefined}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className={styles.autocompleteFilterWrapper}>
          <AutocompleteResponsible
            id="processos-filtro-responsavel"
            name="responsavelId"
            responsavelId={filters.responsavelId ?? ''}
            onChange={(id) =>
              onFilterChange('responsavelId', id ? String(id) : '')
            }
            funcionarios={funcionariosList}
            placeholder="Todos os responsáveis"
            ariaLabel="Filtrar por responsável"
          />
        </div>

        <select
          name="status"
          aria-label="Filtrar por status"
          className={styles.pillSelect}
          value={filters.status}
          onChange={handleChange}
        >
          <option value="">Todos os status</option>
          {PROCESS_STATUS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleClear}
          className={styles.clearButton}
          aria-label="Limpar filtros"
        >
          <RotateCcw size={14} />
          Limpar
        </button>
      </div>

      {dateRangeError && (
        <p className={styles.dateError} role="alert">
          {dateRangeError}
        </p>
      )}
    </section>
  );
}
