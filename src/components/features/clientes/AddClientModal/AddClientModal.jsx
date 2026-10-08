'use client';

import { useState } from 'react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import AutocompleteResponsible from '../AutocompleteResponsible/AutocompleteResponsible';
import { ETAPAS, formatarCpfCnpj, formatarTelefone } from '@/utils/cliente';
import styles from './AddClientModal.module.css';

export default function AddClientModal({
  isOpen,
  onClose,
  onSubmit,
  funcionarios = [],
  isSaving = false,
}) {
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [responsavelId, setResponsavelId] = useState(null);
  const [etapaId, setEtapaId] = useState(1);
  const [areaInteresse, setAreaInteresse] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setNome('');
    setCpfCnpj('');
    setTelefone('');
    setEmail('');
    setResponsavelId(null);
    setEtapaId(1);
    setAreaInteresse('');
    setDescricao('');
    setError('');
  };

  const handleClose = () => {
    if (isSaving) return;
    resetForm();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nome.trim()) {
      setError('O nome ou razão social é obrigatório.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }

    try {
      await onSubmit?.({
        nome: nome.trim(),
        cpf: cpfCnpj.replace(/\D/g, '') || null,
        documento: cpfCnpj || null,
        telefone: telefone.trim() || null,
        email: email.trim(),
        responsavel_id: responsavelId ? Number(responsavelId) : null,
        etapa_id: Number(etapaId) || 1,
        area_interesse: areaInteresse.trim() || null,
        descricao: descricao.trim() || null,
        ultima_interacao: new Date().toISOString(),
      });
      resetForm();
    } catch (err) {
      setError(err.message || 'Erro ao salvar cliente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} preventClose={isSaving}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <h2 className={styles.title}>Cadastrar Novo Cliente</h2>
          <ModalCloseButton onClose={handleClose} disabled={isSaving} />
        </div>

        <div className={styles.body}>
          {error && (
            <div className={styles.errorAlert} role="alert">
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="add-client-nome" className={styles.label}>
              Nome Completo / Razão Social
            </label>
            <input
              id="add-client-nome"
              type="text"
              className={styles.input}
              placeholder="Nome do cliente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="add-client-cpf" className={styles.label}>
                CPF / CNPJ
              </label>
              <input
                id="add-client-cpf"
                type="text"
                className={styles.input}
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="add-client-telefone" className={styles.label}>
                Telefone
              </label>
              <input
                id="add-client-telefone"
                type="text"
                className={styles.input}
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="add-client-email" className={styles.label}>
              Email
            </label>
            <input
              id="add-client-email"
              type="email"
              className={styles.input}
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="add-client-responsavel" className={styles.label}>
              Responsável
            </label>
            <AutocompleteResponsible
              id="add-client-responsavel"
              responsavelId={responsavelId}
              onChange={(id) => setResponsavelId(id)}
              funcionarios={funcionarios}
              disabled={isSaving}
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="add-client-area" className={styles.label}>
                Área de Interesse
              </label>
              <input
                id="add-client-area"
                type="text"
                className={styles.input}
                placeholder="Ex: Cível, Trabalhista..."
                value={areaInteresse}
                onChange={(e) => setAreaInteresse(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="add-client-status" className={styles.label}>
                Status
              </label>
              <select
                id="add-client-status"
                className={styles.select}
                value={etapaId}
                onChange={(e) => setEtapaId(Number(e.target.value))}
                disabled={isSaving}
              >
                {ETAPAS.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="add-client-descricao" className={styles.label}>
              Descrição da Necessidade / Demanda
            </label>
            <textarea
              id="add-client-descricao"
              className={styles.textarea}
              placeholder="Descreva a demanda ou necessidade do cliente..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Cadastro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
