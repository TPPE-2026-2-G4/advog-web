import { firstLogin } from '@/services/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function useFirstLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [uf, setUf] = useState('');
  const [numeroOab, setNumeroOab] = useState('');
  const [erro, setErro] = useState('');

  const token = searchParams.get('token');

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }

    try {
      await firstLogin({
        token: token,
        nome,
        senha,
        uf,
        numeroOab,
      });
      router.push('/login');
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o cadastro.'
      );
    }
  }

  return {
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
    setErro,
    handleSubmit,
  };
}
