import { useRef, useState } from 'react';
import {
  enviarSolicitacaoServico,
  ERROS_SOLICITACAO,
  LIMITES_SOLICITACAO,
} from '@/services/solicitacoes';

const emptyFormData = { nome: '', email: '', telefone: '', descricao: '' };

export function useSolicitarAtendimento() {
  const [formData, setFormData] = useState(emptyFormData);
  const [errors, setErrors] = useState({});
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('preenchimento');
  const submittingRef = useRef(false);
  const formRef = useRef(null);

  function focusField(field) {
    formRef.current?.elements.namedItem(field)?.focus();
  }

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
    dados.telefone = dados.telefone.replace(/\D/g, '');
    const validationErrors = {};
    for (const [field, value] of Object.entries(dados)) {
      if (!value) validationErrors[field] = 'Preencha este campo.';
    }
    for (const [field, { minLength, maxLength }] of Object.entries(
      LIMITES_SOLICITACAO
    )) {
      if (
        dados[field] &&
        (dados[field].length < minLength || dados[field].length > maxLength)
      ) {
        validationErrors[field] = ERROS_SOLICITACAO[field];
      }
    }
    if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      validationErrors.email = ERROS_SOLICITACAO.email;
    }
    if (formData.telefone.trim() && !/^\d{10,11}$/.test(dados.telefone)) {
      validationErrors.telefone = ERROS_SOLICITACAO.telefone;
    }

    setErrors(validationErrors);
    setErro('');
    const firstInvalidField = Object.keys(emptyFormData).find(
      (field) => validationErrors[field]
    );
    if (firstInvalidField) {
      focusField(firstInvalidField);
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
          : 'Não foi possível enviar sua solicitação. Tente novamente.'
      );
      if (error instanceof Error && error.fields) {
        setErrors(error.fields);
        requestAnimationFrame(() => {
          focusField(
            Object.keys(emptyFormData).find((field) => error.fields[field])
          );
        });
      }
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
      focusField('nome');
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
