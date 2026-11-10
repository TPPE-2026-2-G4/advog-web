import styles from './SerieScope.module.css';

export default function SerieScope({ value, onChange, disabled = false }) {
  return (
    <div className={styles.container}>
      <label className={styles.checkboxContainer}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={value === 'serie'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked ? 'serie' : 'individual')}
        />
        <span className={styles.checkboxText}>
          Aplicar a este e aos próximos da mesma série
        </span>
      </label>
      <p className={styles.hint}>
        Lançamentos realizados serão preservados nas alterações em grupo.
      </p>
    </div>
  );
}
