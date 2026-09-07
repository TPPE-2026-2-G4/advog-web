'use client';

import { useState } from 'react';
import { login } from '@/services/auth';
import styles from './loginForm.module.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await login(email, senha);

      window.location.href = '/dashboard';
    } catch (error) {
      setErro(error.message);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>Email empresarial</label>
      <input
        className={styles.input}
        type="email"
        placeholder="dr@carreiro.adv.br"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Senha</label>
      <input
        className={styles.input}
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <a href="#" onClick={(e) => e.preventDefault()}>
        Esqueci minha senha
      </a>

      <button className={styles.button} type="submit">
        Entrar
      </button>

      {erro && <span>{erro}</span>}
    </form>
  );
}
