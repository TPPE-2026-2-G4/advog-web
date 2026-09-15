'use client';

import { Suspense } from 'react';
import Auth from '@/components/layout/auth/auth';
import styles from './firstLogin.module.css';
import { useFirstLogin } from '@/hooks/useFirstLogin';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';

function FirstLoginContent() {
  const {
    nome,
    setNome,
    senha,
    setSenha,
    confirmarSenha,
    setConfirmarSenha,
    uf,
    setUf,
    numeroOab,
    setNumeroOab,
    erro,
    isSubmitting,
    handleSubmit,
  } = useFirstLogin();

  return (
    <Auth
      title="Primeiro acesso"
      subtitle="Complete seus dados para finalizar seu cadastro e acessar a plataforma"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="nome">
          Nome completo
        </label>
        <input
          id="nome"
          className={styles.input}
          type="text"
          placeholder="Ex.: Maria Souza Lima"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          required
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
          required
        />

        <label className={styles.label} htmlFor="confirmarSenha">
          Confirmar senha
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

        <div className={styles.rowOab}>
          <div className={styles.ufGroup}>
            <label className={styles.label} htmlFor="uf">
              UF da OAB
            </label>
            <select
              id="uf"
              className={`${styles.input} ${styles.select}`}
              value={uf}
              onChange={(event) => setUf(event.target.value)}
              required
            >
              <option value="">UF</option>
              {[
                'AC',
                'AL',
                'AM',
                'AP',
                'BA',
                'CE',
                'DF',
                'ES',
                'GO',
                'MA',
                'MG',
                'MS',
                'MT',
                'PA',
                'PB',
                'PE',
                'PI',
                'PR',
                'RJ',
                'RN',
                'RO',
                'RR',
                'RS',
                'SC',
                'SE',
                'SP',
                'TO',
              ].map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.numeroGroup}>
            <label className={styles.label} htmlFor="numeroOab">
              Número da OAB
            </label>
            <input
              id="numeroOab"
              className={styles.input}
              type="text"
              placeholder="Ex.: 123456"
              value={numeroOab}
              onChange={(event) => setNumeroOab(event.target.value)}
              required
            />
          </div>
        </div>

        <button className={styles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              Salvando
              <LoadingDots />
            </>
          ) : (
            'Concluir cadastro'
          )}
        </button>

        {erro && <span className={styles.error}>{erro}</span>}
      </form>
    </Auth>
  );
}

export default function FirstLoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <FirstLoginContent />
    </Suspense>
  );
}
