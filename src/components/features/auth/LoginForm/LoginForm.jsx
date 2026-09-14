'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setIsSubmitting(true);

    try {
      await login(email, senha);
      router.push('/dashboard');
    } catch (error) {
      setErro(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label}>Email empresarial</label>
      <input
        className={styles.input}
        type="email"
        placeholder="dr@carreiro.adv.br"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className={styles.label}>Senha</label>
      <input
        className={styles.input}
        type="password"
        placeholder="••••••••"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <a className={styles.forgotPassword} href="/esqueci-senha">
        Esqueci minha senha
      </a>

      <button className={styles.button} type="submit">
        Entrar
      </button>

      {erro && <span className={styles.error}>{erro}</span>}
    </form>
  );
}
