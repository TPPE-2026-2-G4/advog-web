import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function useLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErro('');

    try {
      await login(email, senha);
      router.push('/dashboard');
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Não foi possível entrar.'
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    email,
    setEmail,
    senha,
    setSenha,
    erro,
    setErro,
    isSubmitting,
    handleSubmit,
  };
}
