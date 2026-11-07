'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Auth from '@/components/layout/auth/auth';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import { useInstitucionalContext } from '@/contexts/InstitucionalContext';
import { getContrastTextColor } from '@/utils/institucional';
import styles from './forgotPassword.module.css';

export function ForgotPasswordContent({ resetMode = false }) {
  const {
    token,
    email,
    setEmail,
    senha,
    setSenha,
    confirmarSenha,
    setConfirmarSenha,
    erro,
    enviado,
    isSubmitting,
    handleSubmit,
  } = useForgotPassword({ resetMode });
  const { institucional } = useInstitucionalContext();
  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const corSecundariaTexto = getContrastTextColor(corSecundaria);

  if (!token && enviado) {
    return (
      <Auth
        title="Verifique seu e-mail"
        subtitle="Enviamos as instruções para redefinir sua senha"
        institucional={institucional}
      >
        <div className={styles.feedback} role="status">
          <p>
            Se o e-mail estiver cadastrado, você irá receber um link em
            instantes.
          </p>
          <Link
            className={styles.backLink}
            href="/login"
            style={{ color: corSecundaria }}
          >
            Voltar para o login
          </Link>
        </div>
      </Auth>
    );
  }

  return (
    <Auth
      title={resetMode ? 'Redefinir senha' : 'Recuperar senha'}
      subtitle={
        resetMode
          ? 'Crie uma nova senha para acessar o sistema'
          : 'Informe seu e-mail para receber o link de redefinição'
      }
      institucional={institucional}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {resetMode ? (
          <>
            <label className={styles.label} htmlFor="senha">
              Nova senha
            </label>
            <input
              id="senha"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              minLength={8}
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />

            <label className={styles.label} htmlFor="confirmarSenha">
              Confirmar nova senha
            </label>
            <input
              id="confirmarSenha"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              required
            />
          </>
        ) : (
          <>
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
              required
            />
          </>
        )}

        <button
          className={styles.button}
          type="submit"
          disabled={isSubmitting}
          style={{ backgroundColor: corSecundaria, color: corSecundariaTexto }}
        >
          {isSubmitting ? (
            <>
              {resetMode ? 'Redefinindo' : 'Enviando'} <LoadingDots />
            </>
          ) : resetMode ? (
            'Redefinir senha'
          ) : (
            'Enviar link'
          )}
        </button>

        {erro && <span className={styles.error}>{erro}</span>}
        <Link
          className={styles.backLink}
          href="/login"
          style={{ color: corSecundaria }}
        >
          Voltar para o login
        </Link>
      </form>
    </Auth>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
