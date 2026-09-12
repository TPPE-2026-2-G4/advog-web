'use client';

import { useState } from 'react';
import Link from 'next/link';
import Auth from '@/components/layout/auth/auth';
import { useAuth } from '@/hooks/useAuth';
import styles from './firstLogin.module.css';

export default function FirstLoginPage() {
  const { firstLogin } = useAuth();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [uf, setUf] = useState('');
  const [numeroOab, setNumeroOab] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }

    try {
      await firstLogin({
        nome,
        senha,
        uf,
        numeroOab,
      });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o cadastro.'
      );
    }
  }

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

        <button className={styles.button} type="submit">
          Concluir cadastro
        </button>

        {erro && <span className={styles.error}>{erro}</span>}

        <p className={styles.information}>
          Já finalizou seu cadastro?{' '}
          <Link href="/login">Acessar a plataforma</Link>
        </p>
      </form>
    </Auth>
  );
}
