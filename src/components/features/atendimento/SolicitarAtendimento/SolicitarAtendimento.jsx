'use client';

import { CheckCircle, Send } from 'lucide-react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import { useSolicitarAtendimento } from '@/hooks/useSolicitarAtendimento';
import styles from './SolicitarAtendimento.module.css';

const fields = [
  {
    name: 'nome',
    label: 'Nome completo',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Seu nome',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'seu@email.com',
  },
  {
    name: 'telefone',
    label: 'Telefone',
    type: 'tel',
    autoComplete: 'tel',
    placeholder: '(61) 99999-9999',
  },
  {
    name: 'descricao',
    label: 'Descreva sua demanda',
    placeholder: 'Conte-nos resumidamente sobre sua situação jurídica...',
  },
];

export default function SolicitarAtendimento() {
  const {
    formData,
    errors,
    erro,
    status,
    formRef,
    handleChange,
    handleSubmit,
    resetForm,
  } = useSolicitarAtendimento();
  const isSubmitting = status === 'processamento';

  return (
    <section
      id="contato"
      className={styles.section}
      aria-labelledby="atendimento-title"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 id="atendimento-title">Solicitar Atendimento</h1>
          <p>Preencha o formulário abaixo para descrever sua demanda.</p>
        </header>

        {status === 'confirmacao' ? (
          <div className={`${styles.card} ${styles.confirmation}`}>
            <div role="status" aria-label="Simulação concluída">
              <CheckCircle
                className={styles.successIcon}
                size={48}
                aria-hidden="true"
              />
              <h2>Simulação concluída</h2>
              <p>
                Simulação concluída. Nenhuma solicitação foi enviada ao
                escritório.
              </p>
            </div>
            <button type="button" className={styles.button} onClick={resetForm}>
              Preencher nova solicitação
            </button>
          </div>
        ) : (
          <form
            ref={formRef}
            className={styles.card}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isSubmitting}
          >
            <p id="atendimento-demo" className={styles.notice}>
              Modo de demonstração: os dados preenchidos não serão enviados ao
              escritório.
            </p>
            <div className={styles.fields}>
              {fields.map(
                ({ name, label, type, autoComplete, placeholder }) => {
                  const id = `atendimento-${name}`;
                  const inputProps = {
                    id,
                    name,
                    autoComplete,
                    placeholder,
                    className: styles.input,
                    value: formData[name],
                    onChange: handleChange,
                    required: true,
                    disabled: isSubmitting,
                    'aria-invalid': Boolean(errors[name]),
                    'aria-describedby': errors[name]
                      ? `${id}-error`
                      : undefined,
                  };

                  return (
                    <div className={styles.field} key={name}>
                      <label htmlFor={id}>{label}</label>
                      {name === 'descricao' ? (
                        <textarea {...inputProps} rows={4} />
                      ) : (
                        <input {...inputProps} type={type} />
                      )}
                      {errors[name] && (
                        <p id={`${id}-error`} className={styles.error}>
                          {errors[name]}
                        </p>
                      )}
                    </div>
                  );
                }
              )}
            </div>
            {erro && (
              <p className={styles.error} role="alert">
                {erro}
              </p>
            )}
            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.button}
                disabled={isSubmitting}
                aria-describedby="atendimento-demo"
              >
                {isSubmitting ? (
                  <LoadingDots />
                ) : (
                  <>
                    <Send size={18} aria-hidden="true" /> Enviar Solicitação
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
