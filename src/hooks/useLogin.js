import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function useLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');

    try {
      await login(email, senha);
      router.push('/dashboard');
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Não foi possível entrar.'
      );
    }
  }

  return {
    email,
    setEmail,
    senha,
    setSenha,
    erro,
    setErro,
    handleSubmit,
  };
}
