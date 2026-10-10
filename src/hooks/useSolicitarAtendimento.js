import { useRef, useState } from 'react';
import { enviarSolicitacaoServico } from '@/services/solicitacoes';

const emptyFormData = { nome: '', email: '', telefone: '', descricao: '' };

export function useSolicitarAtendimento() {
  const [formData, setFormData] = useState(emptyFormData);
  const [errors, setErrors] = useState({});
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('preenchimento');
  const submittingRef = useRef(false);
  const formRef = useRef(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setErro('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    const dados = Object.fromEntries(
      Object.entries(formData).map(([field, value]) => [field, value.trim()])
    );
    const validationErrors = {};
    for (const [field, value] of Object.entries(dados)) {
      if (!value) validationErrors[field] = 'Preencha este campo.';
    }
    if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      validationErrors.email = 'Informe um email válido.';
    }

    setErrors(validationErrors);
    setErro('');
    const firstInvalidField = Object.keys(validationErrors)[0];
    if (firstInvalidField) {
      formRef.current?.elements.namedItem(firstInvalidField).focus();
      return;
    }

    submittingRef.current = true;
    setStatus('processamento');
    try {
      await enviarSolicitacaoServico(dados);
      setStatus('confirmacao');
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a simulação. Tente novamente.'
      );
      setStatus('preenchimento');
    } finally {
      submittingRef.current = false;
    }
  }

  function resetForm() {
    setFormData(emptyFormData);
    setErrors({});
    setErro('');
    setStatus('preenchimento');
    requestAnimationFrame(() => {
      formRef.current?.elements.namedItem('nome').focus();
    });
  }

  return {
    formData,
    errors,
    erro,
    status,
    formRef,
    handleChange,
    handleSubmit,
    resetForm,
  };
}
