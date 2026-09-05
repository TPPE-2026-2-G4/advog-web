import styles from './loadingDots.module.css';

export default function LoadingDots() {
  return (
    <span className={styles.dots} role="status" aria-label="Carregando">
      <span className={styles.dot} />
      <span className={`${styles.dot} ${styles.delayOne}`} />
      <span className={`${styles.dot} ${styles.delayTwo}`} />
    </span>
  );
}
