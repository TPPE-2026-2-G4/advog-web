'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import styles from './firstLoginForm.module.css';

export default function FirstLoginForm() {
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
      setErro(error.message);
    }
  }

  return (
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
            <option value="AC">AC</option>
            <option value="AL">AL</option>
            <option value="AM">AM</option>
            <option value="AP">AP</option>
            <option value="BA">BA</option>
            <option value="CE">CE</option>
            <option value="DF">DF</option>
            <option value="ES">ES</option>
            <option value="GO">GO</option>
            <option value="MA">MA</option>
            <option value="MG">MG</option>
            <option value="MS">MS</option>
            <option value="MT">MT</option>
            <option value="PA">PA</option>
            <option value="PB">PB</option>
            <option value="PE">PE</option>
            <option value="PI">PI</option>
            <option value="PR">PR</option>
            <option value="RJ">RJ</option>
            <option value="RN">RN</option>
            <option value="RO">RO</option>
            <option value="RR">RR</option>
            <option value="RS">RS</option>
            <option value="SC">SC</option>
            <option value="SE">SE</option>
            <option value="SP">SP</option>
            <option value="TO">TO</option>
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
  );
}
