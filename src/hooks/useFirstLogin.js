import { firstLogin } from '@/services/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

export function useFirstLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [uf, setUf] = useState('');
  const [numeroOab, setNumeroOab] = useState('');
  const [erro, setErro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const token = searchParams.get('token');

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    setErro('');

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      await firstLogin({
        token: token,
        nome,
        senha,
        uf,
        numeroOab,
      });
      router.push('/login?cadastro=sucesso');
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o cadastro.'
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
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
    isSubmitting,
    handleSubmit,
  };
}
