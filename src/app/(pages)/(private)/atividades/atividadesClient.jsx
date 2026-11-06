'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  FileText,
  Layers,
  Pencil,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import {
  atualizarAtividade,
  buscarAtividade,
  criarAtividade,
  excluirAtividade,
  obterKanban,
} from '@/services/atividades';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import { getCurrentUser } from '@/utils/authSession';
import styles from './atividades.module.css';

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  data_inicio: '',
  data_prazo: '',
  etapa_id: '',
  processo_id: '',
  responsaveis_ids: [],
};

const toDateInput = (iso) => String(iso).slice(0, 10);
const formatDate = (iso) => toDateInput(iso).split('-').reverse().join('/');
const isOverdue = (prazo, etapaNome) =>
  etapaNome !== 'Finalizado' &&
  toDateInput(prazo) < new Date().toISOString().slice(0, 10);

export default function AtividadesClient() {
  const perms = getCurrentUser()?.cargo?.permissao ?? {};
  const canCreate = perms.criar_atividades !== false;
  const canEdit = perms.editar_atividades !== false;
  const canDelete = perms.excluir_atividades !== false;

  const [etapas, setEtapas] = useState([]);
  const [escopo, setEscopo] = useState('escritorio');
  const [funcionarios, setFuncionarios] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [viewing, setViewing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    Promise.all([
      obterKanban(),
      listarFuncionarios(),
      listarProcessos().catch(() => ({ itens: [] })),
    ])
      .then(([kanban, funcs, procs]) => {
        setEtapas(kanban.etapas);
        setEscopo(kanban.escopo);
        setFuncionarios(funcs);
        setProcessos(procs.itens);
        setError('');
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [reloadKey]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(''), 15000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const recarregar = () => setReloadKey((k) => k + 1);

  const etapasMap = useMemo(
    () => new Map(etapas.map((e) => [e.etapa_id, e.nome])),
    [etapas]
  );
  const processosMap = useMemo(
    () => new Map(processos.map((p) => [p.processo_id, p.titulo])),
    [processos]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, etapa_id: etapas[0]?.etapa_id ?? '' });
    setFormError('');
    setModalOpen(true);
  };

  const openDetails = async (card) => {
    try {
      const detail = await buscarAtividade(card.atividade_id);
      setViewing(detail);
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = async (card) => {
    try {
      const detail = card.descricao
        ? card
        : await buscarAtividade(card.atividade_id);
      setEditingId(card.atividade_id);
      setForm({
        titulo: detail.titulo,
        descricao: detail.descricao,
        data_inicio: toDateInput(detail.data_inicio),
        data_prazo: toDateInput(detail.data_prazo),
        etapa_id: detail.etapa_id,
        processo_id: detail.processo_id ?? '',
        responsaveis_ids: detail.responsaveis.map((r) => r.funcionario_id),
      });
      setFormError('');
      setModalOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleResponsavel = (id) => {
    setForm((prev) => ({
      ...prev,
      responsaveis_ids: prev.responsaveis_ids.includes(id)
        ? prev.responsaveis_ids.filter((item) => item !== id)
        : [...prev.responsaveis_ids, id],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (
      !form.titulo.trim() ||
      !form.descricao.trim() ||
      !form.data_inicio ||
      !form.data_prazo ||
      !form.etapa_id
    ) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (form.data_prazo < form.data_inicio) {
      setFormError('O prazo não pode ser anterior à data de início.');
      return;
    }

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      data_inicio: `${form.data_inicio}T00:00:00`,
      data_prazo: `${form.data_prazo}T23:59:59`,
      etapa_id: Number(form.etapa_id),
      processo_id: form.processo_id ? Number(form.processo_id) : null,
      responsaveis_ids: form.responsaveis_ids,
    };

    try {
      if (editingId !== null) {
        await atualizarAtividade(editingId, payload);
        setFeedback('Atividade atualizada com sucesso.');
      } else {
        await criarAtividade(payload);
        setFeedback('Atividade criada com sucesso.');
      }
      setModalOpen(false);
      recarregar();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await excluirAtividade(id);
      setFeedback('Atividade excluída.');
      recarregar();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMove = async (atividadeId, novaEtapaId) => {
    try {
      await atualizarAtividade(atividadeId, { etapa_id: Number(novaEtapaId) });
      recarregar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Quadro de Atividades</h1>
          <p className={styles.subtitle}>
            {escopo === 'usuario'
              ? 'Minhas atividades atribuídas'
              : 'Gerencie as tarefas do escritório por status'}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className={styles.addButton}
            onClick={openCreate}
          >
            <Plus size={18} /> Nova Atividade
          </button>
        )}
      </div>

      <div className={styles.statsBar} aria-label="Resumo de atividades">
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Total</span>
          <span className={styles.statValue}>
            {etapas.reduce((acc, col) => acc + col.atividades.length, 0)}
          </span>
        </div>
        {etapas.map((col, idx) => (
          <div key={col.etapa_id} className={styles.statBox} data-stage={idx}>
            <span className={styles.statLabel}>{col.nome}</span>
            <span className={styles.statValue}>{col.atividades.length}</span>
          </div>
        ))}
      </div>

      {feedback && (
        <div role="status" className={styles.alertSuccess}>
          {feedback}
        </div>
      )}
      {error && (
        <div role="alert" className={styles.alertError}>
          {error}
        </div>
      )}

      <div className={styles.board}>
        {etapas.map((col) => (
          <div
            key={col.etapa_id}
            data-testid={`coluna-${col.etapa_id}`}
            className={styles.column}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedId && draggedId.etapaId !== col.etapa_id) {
                handleMove(draggedId.id, col.etapa_id);
              }
              setDraggedId(null);
            }}
          >
            <div className={styles.columnHeader}>
              <h2 className={styles.columnTitle}>{col.nome}</h2>
              <span className={styles.badge}>{col.atividades.length}</span>
            </div>

            <div className={styles.cardList}>
              {col.atividades.map((a) => {
                const vencida = isOverdue(a.data_prazo, col.nome);
                const respNomes = a.responsaveis.length
                  ? a.responsaveis.map((r) => r.nome).join(', ')
                  : 'Não atribuído';
                return (
                  <div
                    key={a.atividade_id}
                    className={styles.card}
                    draggable={canEdit}
                    onDragStart={() =>
                      setDraggedId({
                        id: a.atividade_id,
                        etapaId: col.etapa_id,
                      })
                    }
                    onClick={() => openDetails(a)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>{a.titulo}</span>
                      <div className={styles.cardActions}>
                        {canEdit && (
                          <button
                            type="button"
                            aria-label={`Editar ${a.titulo}`}
                            className={styles.iconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(a);
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            aria-label={`Excluir ${a.titulo}`}
                            className={styles.iconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(a.atividade_id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardMeta}>
                      <div className={styles.metaRow}>
                        <User size={13} />
                        <span>{respNomes}</span>
                      </div>
                      <div
                        className={`${styles.metaRow} ${vencida ? styles.overdue : ''}`}
                      >
                        <Clock size={13} />
                        <span>
                          {formatDate(a.data_prazo)}
                          {vencida && ' · Vencida'}
                        </span>
                      </div>
                      {a.processo_id && (
                        <div className={styles.processTag}>
                          {processosMap.get(a.processo_id) ||
                            `Processo #${a.processo_id}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {col.atividades.length === 0 && (
                <div className={styles.emptyCol}>Nenhuma atividade</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        ariaLabel="Detalhes da Atividade"
      >
        {viewing && (
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Detalhes da Atividade</h2>
              <ModalCloseButton onClose={() => setViewing(null)} />
            </div>
            <div className={styles.modalBody}>
              <h3 className={styles.detailHeading}>{viewing.titulo}</h3>
              <p className={styles.detailDesc}>{viewing.descricao}</p>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <Layers size={16} />
                  <div>
                    <span className={styles.detailLabel}>Status</span>
                    <p className={styles.detailValue}>
                      {etapasMap.get(viewing.etapa_id)}
                    </p>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <User size={16} />
                  <div>
                    <span className={styles.detailLabel}>Responsável</span>
                    <p className={styles.detailValue}>
                      {viewing.responsaveis.length
                        ? viewing.responsaveis.map((r) => r.nome).join(', ')
                        : 'Não atribuído'}
                    </p>
                  </div>
                </div>
                <div className={styles.detailItem}>
                  <Clock size={16} />
                  <div>
                    <span className={styles.detailLabel}>Prazo</span>
                    <p className={styles.detailValue}>
                      {formatDate(viewing.data_prazo)}
                    </p>
                  </div>
                </div>
                {viewing.processo_id && (
                  <div className={styles.detailItem}>
                    <FileText size={16} />
                    <div>
                      <span className={styles.detailLabel}>
                        Processo associado
                      </span>
                      <p className={styles.detailValue}>
                        {processosMap.get(viewing.processo_id) ||
                          `Processo #${viewing.processo_id}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setViewing(null)}
              >
                Fechar
              </button>
              {canEdit && (
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => {
                    openEdit(viewing);
                    setViewing(null);
                  }}
                >
                  <Pencil size={15} /> Editar
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        ariaLabel={editingId !== null ? 'Editar Atividade' : 'Nova Atividade'}
      >
        <form onSubmit={handleSave} className={styles.modalContent} noValidate>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>
                {editingId !== null ? 'Editar Atividade' : 'Nova Atividade'}
              </h2>
              <p className={styles.requiredHint}>
                <span aria-hidden="true">*</span> Campos obrigatórios
              </p>
            </div>
            <ModalCloseButton onClose={() => setModalOpen(false)} />
          </div>
          <div className={styles.modalBody}>
            {formError && (
              <div role="alert" className={styles.alertError}>
                {formError}
              </div>
            )}
            <label className={styles.field}>
              <span className={styles.requiredLabel}>Título</span>
              <input
                aria-label="Título"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.requiredLabel}>Descrição</span>
              <textarea
                aria-label="Descrição"
                rows={2}
                value={form.descricao}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
                required
              />
            </label>
            <div className={styles.gridTwo}>
              <label className={styles.field}>
                <span className={styles.requiredLabel}>Status</span>
                <select
                  aria-label="Status"
                  value={form.etapa_id}
                  onChange={(e) =>
                    setForm({ ...form, etapa_id: e.target.value })
                  }
                  required
                >
                  {etapas.map((et) => (
                    <option key={et.etapa_id} value={et.etapa_id}>
                      {et.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Processo associado</span>
                <select
                  aria-label="Processo associado"
                  value={form.processo_id}
                  onChange={(e) =>
                    setForm({ ...form, processo_id: e.target.value })
                  }
                >
                  <option value="">Nenhum</option>
                  {processos.map((p) => (
                    <option key={p.processo_id} value={p.processo_id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.gridTwo}>
              <label className={styles.field}>
                <span className={styles.requiredLabel}>Data de início</span>
                <input
                  type="date"
                  aria-label="Data de início"
                  value={form.data_inicio}
                  onChange={(e) =>
                    setForm({ ...form, data_inicio: e.target.value })
                  }
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.requiredLabel}>Prazo</span>
                <input
                  type="date"
                  aria-label="Prazo"
                  value={form.data_prazo}
                  onChange={(e) =>
                    setForm({ ...form, data_prazo: e.target.value })
                  }
                  required
                />
              </label>
            </div>
            <div className={styles.field}>
              <span>Responsáveis</span>
              <div className={styles.checkList}>
                {funcionarios.map((f) => (
                  <label key={f.funcionario_id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={form.responsaveis_ids.includes(f.funcionario_id)}
                      onChange={() => toggleResponsavel(f.funcionario_id)}
                    />
                    <span>{f.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.addButton}>
              {editingId !== null ? 'Salvar Alterações' : 'Criar Atividade'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
