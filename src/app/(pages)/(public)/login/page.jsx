import LoginForm from '@/components/ui/loginForm/loginForm';
import styles from './login.module.css';

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <section className={styles.brand}>
        <h1 className={styles.titleBrand}>Alexandre Carreiro</h1>
        <p className={styles.subtitleBrand}>
          Gestão Jurídica de Alta Performance
        </p>
      </section>

      <section className={styles.login}>
        <h1 className={styles.titleLogin}>Acesso ao Sistema</h1>
        <p className={styles.subtitle}>
          Insira suas credenciais para continuar
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
