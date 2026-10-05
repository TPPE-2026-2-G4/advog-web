import { Search } from 'lucide-react';
import { PROCESS_STATUS } from '@/utils/processo';
import styles from './ProcessFilters.module.css';

export default function ProcessFilters({
  filters,
  responsaveis = [],
  dateRangeError = '',
  onFilterChange,
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onFilterChange(name, value);
  };

  return (
    <section className={styles.container} aria-label="Filtrar processos">
      <div className={styles.searchRow}>
        <label className={styles.searchField}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <span className={styles.srOnly}>Buscar processo</span>
          <input
            type="search"
            name="busca"
            className={styles.input}
            placeholder="Buscar por número, cliente ou título..."
            value={filters.busca}
            onChange={handleChange}
          />
        </label>

        <label className={styles.selectField}>
          <span className={styles.srOnly}>Filtrar por status</span>
          <select
            name="status"
            className={styles.select}
            value={filters.status}
            onChange={handleChange}
          >
            <option value="">Todos os Status</option>
            {PROCESS_STATUS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectField}>
          <span className={styles.srOnly}>Filtrar por responsável</span>
          <select
            name="responsavelId"
            className={styles.select}
            value={filters.responsavelId}
            onChange={handleChange}
          >
            <option value="">Todos os Responsáveis</option>
            {responsaveis.map((responsavel) => (
              <option key={responsavel.value} value={responsavel.value}>
                {responsavel.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className={styles.dateRow}>
        <legend className={styles.legend}>Próximo prazo</legend>
        <label className={styles.dateField}>
          <span>De</span>
          <input
            type="date"
            name="prazoInicio"
            className={styles.input}
            value={filters.prazoInicio}
            max={filters.prazoFim || undefined}
            aria-invalid={dateRangeError ? 'true' : undefined}
            onChange={handleChange}
          />
        </label>
        <label className={styles.dateField}>
          <span>Até</span>
          <input
            type="date"
            name="prazoFim"
            className={styles.input}
            value={filters.prazoFim}
            min={filters.prazoInicio || undefined}
            aria-invalid={dateRangeError ? 'true' : undefined}
            onChange={handleChange}
          />
        </label>
        {dateRangeError && (
          <p className={styles.dateError} role="alert">
            {dateRangeError}
          </p>
        )}
      </fieldset>
    </section>
  );
}
