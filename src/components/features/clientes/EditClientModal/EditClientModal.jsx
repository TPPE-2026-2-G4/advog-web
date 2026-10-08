'use client';

import { useState } from 'react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import AutocompleteResponsible from '../AutocompleteResponsible/AutocompleteResponsible';
import { ETAPAS, formatarCpfCnpj, formatarTelefone } from '@/utils/cliente';
import styles from '../AddClientModal/AddClientModal.module.css';

function EditClientDialog({
  isOpen,
  onClose,
  onSubmit,
  cliente,
  funcionarios = [],
  isSaving = false,
}) {
  const [nome, setNome] = useState(cliente?.nome || '');
  const [cpfCnpj, setCpfCnpj] = useState(() =>
    formatarCpfCnpj(cliente?.cpf || cliente?.cnpj || cliente?.documento || '')
  );
  const [telefone, setTelefone] = useState(() =>
    formatarTelefone(cliente?.telefone || '')
  );
  const [email, setEmail] = useState(cliente?.email || '');
  const [responsavelId, setResponsavelId] = useState(
    cliente?.responsavel_id || null
  );
  const [etapaId, setEtapaId] = useState(
    cliente?.etapa_id || cliente?.status_id || 1
  );
  const [areaInteresse, setAreaInteresse] = useState(
    cliente?.area_interesse || ''
  );
  const [descricao, setDescricao] = useState(cliente?.descricao || '');
  const [error, setError] = useState('');

  const handleClose = () => {
    if (isSaving) return;
    setError('');
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
      const clienteId = cliente.cliente_id || cliente.id;
      await onSubmit?.(clienteId, {
        nome: nome.trim(),
        cpf: cpfCnpj ? formatarCpfCnpj(cpfCnpj) : null,
        telefone: telefone ? formatarTelefone(telefone) : null,
        email: email.trim(),
        responsavel_id: responsavelId ? Number(responsavelId) : null,
        etapa_id: etapaId,
        area_interesse: areaInteresse.trim() || null,
        descricao: descricao.trim() || null,
        ultima_interacao: cliente.ultima_interacao || new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || 'Erro ao atualizar cliente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} preventClose={isSaving}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <h2 className={styles.title}>Editar Cliente</h2>
          <ModalCloseButton onClose={handleClose} disabled={isSaving} />
        </div>

        <div className={styles.body}>
          {error && (
            <div className={styles.errorAlert} role="alert">
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="edit-client-nome" className={styles.label}>
              Nome Completo / Razão Social
            </label>
            <input
              id="edit-client-nome"
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
              <label htmlFor="edit-client-cpf" className={styles.label}>
                CPF / CNPJ
              </label>
              <input
                id="edit-client-cpf"
                type="text"
                className={styles.input}
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-client-telefone" className={styles.label}>
                Telefone
              </label>
              <input
                id="edit-client-telefone"
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
            <label htmlFor="edit-client-email" className={styles.label}>
              Email
            </label>
            <input
              id="edit-client-email"
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
            <label htmlFor="edit-client-responsavel" className={styles.label}>
              Responsável
            </label>
            <AutocompleteResponsible
              id="edit-client-responsavel"
              responsavelId={responsavelId}
              onChange={(id) => setResponsavelId(id)}
              funcionarios={funcionarios}
              disabled={isSaving}
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label htmlFor="edit-client-area" className={styles.label}>
                Área de Interesse
              </label>
              <input
                id="edit-client-area"
                type="text"
                className={styles.input}
                placeholder="Ex: Cível, Trabalhista..."
                value={areaInteresse}
                onChange={(e) => setAreaInteresse(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-client-status" className={styles.label}>
                Status
              </label>
              <select
                id="edit-client-status"
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
            <label htmlFor="edit-client-descricao" className={styles.label}>
              Descrição da Necessidade / Demanda
            </label>
            <textarea
              id="edit-client-descricao"
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
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function EditClientModal(props) {
  if (!props.isOpen || !props.cliente) return null;

  const clientKey =
    props.cliente.cliente_id ?? props.cliente.id ?? 'edit-client';

  return <EditClientDialog key={clientKey} {...props} />;
}
