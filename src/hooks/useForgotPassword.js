import { requestPasswordReset, resetPassword } from '@/services/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

export function useForgotPassword({ resetMode = false } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = resetMode ? searchParams.get('token') : null;
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (resetMode && !token) {
      setErro(
        'Link de redefinição inválido ou expirado. Solicite um novo link.'
      );
      return;
    }

    if (token && senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErro('');

    try {
      if (token) {
        await resetPassword({ token, senha });
        router.push('/login?senha=sucesso');
      } else {
        await requestPasswordReset(email);
        setEnviado(true);
      }
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : token
            ? 'Não foi possível redefinir sua senha.'
            : 'Não foi possível enviar o link de redefinição.'
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return {
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
  };
}
