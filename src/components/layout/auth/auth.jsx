import styles from './auth.module.css';

export default function Auth({ title, subtitle, children }) {
  return (
    <main className={styles.container}>
      <section className={styles.brand}>
        <h1 className={styles.titleBrand}>Alexandre Carreiro</h1>
        <p className={styles.subtitleBrand}>
          Gestão Jurídica de Alta Performance
        </p>
      </section>

      <section className={styles.auth}>
        <h1 className={styles.titleAuth}>{title}</h1>
        <p className={styles.subtitleAuth}>{subtitle}</p>

        {children}
      </section>
    </main>
  );
}
