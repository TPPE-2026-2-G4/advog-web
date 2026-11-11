'use client';

import { CheckCircle, Send } from 'lucide-react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import { useSolicitarAtendimento } from '@/hooks/useSolicitarAtendimento';
import { LIMITES_SOLICITACAO } from '@/services/solicitacoes';
import { formatarTelefone } from '@/utils/cliente';
import Toast from '@/components/ui/Toast/Toast';
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
          <p>Preencha o formulário abaixo e nossa equipe entrará em contato.</p>
        </header>

        {status === 'confirmacao' ? (
          <div className={`${styles.card} ${styles.confirmation}`}>
            <div role="status" aria-label="Solicitação enviada">
              <CheckCircle
                className={styles.successIcon}
                size={48}
                aria-hidden="true"
              />
              <h2>Solicitação enviada!</h2>
              <p>
                Recebemos sua solicitação com sucesso. Nossa equipe entrará em
                contato.
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
            <div className={styles.fields}>
              {fields.map(
                ({ name, label, type, autoComplete, placeholder }) => {
                  const id = `atendimento-${name}`;
                  const isTelefone = name === 'telefone';
                  const isEmail = name === 'email';
                  const handleInputChange = isTelefone
                    ? (e) => {
                        const formatted = formatarTelefone(e.target.value);
                        handleChange({
                          target: { name: 'telefone', value: formatted },
                        });
                      }
                    : handleChange;

                  const inputProps = {
                    id,
                    name,
                    autoComplete,
                    placeholder,
                    className: styles.input,
                    value: formData[name],
                    onChange: handleInputChange,
                    required: true,
                    ...(isTelefone ? { maxLength: 15 } : {}),
                    ...(isEmail ? { maxLength: 100 } : {}),
                    ...LIMITES_SOLICITACAO[name],
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
            <Toast message={erro} />
            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.button}
                disabled={isSubmitting}
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
