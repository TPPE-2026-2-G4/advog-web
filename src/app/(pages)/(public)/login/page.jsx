'use client';

import Auth from '@/components/layout/auth/auth';
import { useInstitucionalContext } from '@/contexts/InstitucionalContext';
import { getContrastTextColor } from '@/utils/institucional';
import styles from './login.module.css';
import { useLogin } from '@/hooks/useLogin';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';

function LoginContent() {
  const { institucional } = useInstitucionalContext();
  const { email, setEmail, senha, setSenha, erro, isSubmitting, handleSubmit } =
    useLogin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cadastroConcluido, setCadastroConcluido] = useState(
    () => searchParams.get('cadastro') === 'sucesso'
  );

  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const corSecundariaTexto = getContrastTextColor(corSecundaria);

  useEffect(() => {
    if (searchParams.get('cadastro') !== 'sucesso') {
      return;
    }

    router.replace('/login');

    const timeoutId = setTimeout(() => {
      setCadastroConcluido(false);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [router, searchParams]);

  return (
    <Auth
      title="Acesso ao Sistema"
      subtitle="Insira suas credenciais para continuar"
      institucional={institucional}
    >
      {cadastroConcluido && (
        <div
          className={styles.success}
          role="status"
          aria-label="Cadastro finalizado com sucesso!"
        >
          Cadastro finalizado com sucesso!
        </div>
      )}

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

        <a
          className={styles.forgotPassword}
          href="/esqueci-senha"
          style={{ color: corSecundaria }}
        >
          Esqueci minha senha
        </a>

        <button
          className={styles.button}
          type="submit"
          disabled={isSubmitting}
          style={{
            backgroundColor: corSecundaria,
            color: corSecundariaTexto,
          }}
        >
          Entrar
        </button>

        {erro && <span className={styles.error}>{erro}</span>}
      </form>
    </Auth>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
