'use client';

import { useState } from 'react';
import Auth from '@/components/layout/auth/auth';
import { useAuth } from '@/hooks/useAuth';
import styles from './login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    try {
      await login(email, senha);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Não foi possível entrar.'
      );
    }
  }

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
