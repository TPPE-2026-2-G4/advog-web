'use client';

import Auth from '@/components/layout/auth/auth';
import styles from './login.module.css';
import { useLogin } from '@/hooks/useLogin';

export default function LoginPage() {
  const { email, setEmail, senha, setSenha, erro, handleSubmit } = useLogin();

  return (
    <Auth
      title="Acesso ao Sistema"
      subtitle="Insira suas credenciais para continuar"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="email">
          Email empresarial
        </label>
        <input
          id="email"
          className={styles.input}
          type="email"
          placeholder="dr@carreiro.adv.br"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label className={styles.label} htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          className={styles.input}
          type="password"
          placeholder="••••••••"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
        />

        <a className={styles.forgotPassword} href="/esqueci-senha">
          Esqueci minha senha
        </a>

        <button className={styles.button} type="submit">
          Entrar
        </button>

        {erro && <span className={styles.error}>{erro}</span>}
      </form>
    </Auth>
  );
}
