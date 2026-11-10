'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import {
  DIAS,
  NOMES_DIAS,
  montarRegra,
  opcoesRecorrencia,
} from '@/utils/recorrencia';
import styles from './LancamentoModal.module.css';

export default function RecorrenciaSelector({
  data,
  value,
  onChange,
  onDialogChange,
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const conteudo = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement;
    conteudo.current.querySelector('input').focus();
    return () => anterior?.focus();
  }, [aberto]);
  const [config, setConfig] = useState({
    unidade: 'WEEKLY',
    intervalo: 1,
    dias: [DIAS[new Date(`${data}T12:00:00`).getDay()]],
    mensal: 'monthlyDay',
    termina: 'never',
    fim: '',
    quantidade: 12,
  });
  const opcoes = opcoesRecorrencia(data);
  const mudar = (campo, valor) =>
    setConfig((atual) => ({ ...atual, [campo]: valor }));
  const fechar = () => {
    setAberto(false);
    onDialogChange(false);
  };
  const aplicar = () => {
    if (
      !Number.isInteger(Number(config.intervalo)) ||
      Number(config.intervalo) < 1 ||
      Number(config.intervalo) > 1100
    ) {
      setErro('Informe um intervalo entre 1 e 1100.');
      return;
    }
    if (config.unidade === 'WEEKLY' && !config.dias.length) {
      setErro('Selecione pelo menos um dia da semana.');
      return;
    }
    if (config.termina === 'date' && (!config.fim || config.fim < data)) {
      setErro('O término deve ser igual ou posterior ao primeiro vencimento.');
      return;
    }
    if (
      config.termina === 'count' &&
      (!Number.isInteger(Number(config.quantidade)) ||
        Number(config.quantidade) < 1 ||
        Number(config.quantidade) > 1100)
    ) {
      setErro('Informe entre 1 e 1100 ocorrências, incluindo a primeira.');
      return;
    }
    onChange('custom', montarRegra(config, data));
    fechar();
  };
  return (
    <>
      <label className={styles.inputGroup}>
        Repetição
        <select
          className={styles.select}
          value={value}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setErro('');
              setAberto(true);
              onDialogChange(true);
            } else onChange(e.target.value, '');
          }}
        >
          {opcoes.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="custom">Personalizado...</option>
        </select>
      </label>
      {value === 'custom' && (
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => {
            setAberto(true);
            onDialogChange(true);
          }}
        >
          Editar recorrência personalizada
        </button>
      )}
      <p className={styles.label}>
        Serão gerados lançamentos por até 3 anos, sem renovação automática.
      </p>
      {aberto &&
        createPortal(
          <Modal
            isOpen={aberto}
            onClose={fechar}
            className={styles.modal}
            ariaLabel="Recorrência personalizada"
          >
            <div
              ref={conteudo}
              onKeyDown={(event) => {
                if (event.key !== 'Tab') return;
                const campos = [
                  ...conteudo.current.querySelectorAll('button, input, select'),
                ];
                const primeiro = campos[0];
                const ultimo = campos.at(-1);
                if (event.shiftKey && document.activeElement === primeiro) {
                  event.preventDefault();
                  ultimo.focus();
                } else if (
                  !event.shiftKey &&
                  document.activeElement === ultimo
                ) {
                  event.preventDefault();
                  primeiro.focus();
                }
              }}
            >
              <div className={styles.header}>
                <h2 className={styles.title}>Recorrência personalizada</h2>
                <ModalCloseButton onClose={fechar} />
              </div>
              <div className={styles.body}>
                <fieldset className={styles.recurrenceBlock}>
                  <legend>Repetir a cada:</legend>
                  <div className={styles.row}>
                    <input
                      aria-label="Intervalo de repetição"
                      type="number"
                      min="1"
                      max="1100"
                      className={styles.input}
                      value={config.intervalo}
                      onChange={(e) => mudar('intervalo', e.target.value)}
                    />
                    <select
                      aria-label="Unidade de repetição"
                      className={styles.select}
                      value={config.unidade}
                      onChange={(e) => mudar('unidade', e.target.value)}
                    >
                      <option value="DAILY">dia</option>
                      <option value="WEEKLY">semana</option>
                      <option value="MONTHLY">mês</option>
                      <option value="YEARLY">ano</option>
                    </select>
                  </div>
                </fieldset>
                {['WEEKLY', 'MONTHLY'].includes(config.unidade) && (
                  <fieldset className={styles.recurrenceBlock}>
                    <legend>Repetir no(a):</legend>
                    {config.unidade === 'WEEKLY' ? (
                      <div className={styles.weekdays}>
                        {DIAS.map((dia, i) => (
                          <button
                            key={dia}
                            type="button"
                            className={styles.weekday}
                            aria-label={NOMES_DIAS[i]}
                            aria-pressed={config.dias.includes(dia)}
                            onClick={() =>
                              mudar(
                                'dias',
                                config.dias.includes(dia)
                                  ? config.dias.filter((d) => d !== dia)
                                  : [...config.dias, dia]
                              )
                            }
                          >
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][i]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <select
                        aria-label="Repetição mensal"
                        className={styles.select}
                        value={config.mensal}
                        onChange={(e) => mudar('mensal', e.target.value)}
                      >
                        {opcoes
                          .filter((o) => o.value.startsWith('monthly'))
                          .map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label.replace('Mensalmente: ', '')}
                            </option>
                          ))}
                      </select>
                    )}
                  </fieldset>
                )}
                <fieldset className={styles.recurrenceBlock}>
                  <legend>Termina em:</legend>
                  <label>
                    <input
                      type="radio"
                      name="termino-recorrencia"
                      checked={config.termina === 'never'}
                      onChange={() => mudar('termina', 'never')}
                    />{' '}
                    Nunca (limitado a 3 anos)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="termino-recorrencia"
                      checked={config.termina === 'date'}
                      onChange={() => mudar('termina', 'date')}
                    />{' '}
                    Em
                  </label>
                  {config.termina === 'date' && (
                    <input
                      aria-label="Data de término"
                      type="date"
                      min={data}
                      className={styles.input}
                      value={config.fim}
                      onChange={(e) => mudar('fim', e.target.value)}
                    />
                  )}
                  <label>
                    <input
                      type="radio"
                      name="termino-recorrencia"
                      checked={config.termina === 'count'}
                      onChange={() => mudar('termina', 'count')}
                    />{' '}
                    Após
                  </label>
                  {config.termina === 'count' && (
                    <label className={styles.inputGroup}>
                      Quantidade de ocorrências
                      <input
                        type="number"
                        min="1"
                        max="1100"
                        className={styles.input}
                        value={config.quantidade}
                        onChange={(e) => mudar('quantidade', e.target.value)}
                      />
                    </label>
                  )}
                </fieldset>
                {erro && (
                  <p role="alert" className={styles.error}>
                    {erro}
                  </p>
                )}
              </div>
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={fechar}
                >
                  Cancelar recorrência
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={aplicar}
                >
                  Aplicar recorrência
                </button>
              </div>
            </div>
          </Modal>,
          document.body
        )}
    </>
  );
}
