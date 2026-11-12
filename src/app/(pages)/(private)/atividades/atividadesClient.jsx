'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Clock,
  FileText,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  PlusCircle,
  Trash2,
  User,
  X,
} from 'lucide-react';
import ActivityFilters from '@/components/features/atividades/ActivityFilters/ActivityFilters';
import ActivityStageSummary from '@/components/features/atividades/ActivityStageSummary/ActivityStageSummary';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import { useKanbanAtividades } from '@/hooks/useKanbanAtividades';
import {
  atualizarAtividade,
  buscarAtividade,
  criarAtividade,
  criarEtapaKanban,
  excluirAtividade,
  excluirEtapaKanban,
  renomearEtapaKanban,
  reordenarEtapasKanban,
} from '@/services/atividades';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import { countActivitiesByStage } from '@/utils/atividade';
import { obterIniciais } from '@/utils/cliente';
import { getValidFotoUrl, isAdministratorAccount } from '@/utils/funcionario';
import { getCurrentUser } from '@/utils/authSession';
import { getImageUrl } from '@/utils/institucional';
import AutocompleteMultiResponsible from '@/components/features/atividades/AutocompleteMultiResponsible/AutocompleteMultiResponsible';
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

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const toDateInput = (iso) => String(iso).slice(0, 10);
const formatDate = (iso) => toDateInput(iso).split('-').reverse().join('/');
const isOverdue = (prazo, etapaNome) =>
  etapaNome !== 'Finalizado' &&
  toDateInput(prazo) < new Date().toISOString().slice(0, 10);
const isProtectedStage = (nome) =>
  ['backlog', 'finalizado'].includes(String(nome).trim().toLowerCase());

const emptySubscribe = () => () => {};

export default function AtividadesClient() {
  const userJson = useSyncExternalStore(
    emptySubscribe,
    () => JSON.stringify(getCurrentUser() ?? null),
    () => 'null'
  );
  const currentUser = JSON.parse(userJson);
  const isUserAdmin = isAdministratorAccount(currentUser);
  const perms = currentUser?.cargo?.permissao ?? {};
  const canView =
    !currentUser ||
    isUserAdmin ||
    perms.visualizar_atividades === true ||
    perms.gerenciar_atividades === true ||
    perms.criar_atividades === true ||
    perms.editar_atividades === true;
  const canManage =
    !currentUser ||
    isUserAdmin ||
    perms.gerenciar_atividades === true ||
    (perms.criar_atividades === true && perms.editar_atividades === true);
  const canCreate = canManage;
  const canEdit = canManage;
  const canDelete = canManage;

  const {
    stages: etapas,
    isLoading,
    error,
    filters,
    setFilter,
    clearFilters,
    reload: recarregar,
  } = useKanbanAtividades();

  const { total, stages: stageCounts } = useMemo(
    () => countActivitiesByStage(etapas),
    [etapas]
  );

  const [funcionarios, setFuncionarios] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [viewing, setViewing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    data_inicio: getTodayDate(),
  }));
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [stageToDelete, setStageToDelete] = useState(null);
  const [formError, setFormError] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [draggedStageId, setDraggedStageId] = useState(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState(null);
  const [stageName, setStageName] = useState('');
  const [stageFormError, setStageFormError] = useState('');
  const [novaEtapaOpen, setNovaEtapaOpen] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState('');

  useEffect(() => {
    Promise.all([
      Promise.resolve(listarFuncionarios?.()).catch(() => []),
      Promise.resolve(listarProcessos?.()).catch(() => ({ itens: [] })),
    ]).then(([funcs, procs]) => {
      setFuncionarios(
        Array.isArray(funcs)
          ? funcs.filter((f) => !isAdministratorAccount(f))
          : []
      );
      setProcessos(Array.isArray(procs?.itens) ? procs.itens : []);
    });
  }, []);

  useEffect(() => {
    if (!actionError) return undefined;
    const timer = setTimeout(() => setActionError(''), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(''), 15000);
    return () => clearTimeout(timer);
  }, [feedback]);

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
    setForm({
      ...EMPTY_FORM,
      data_inicio: getTodayDate(),
      etapa_id: etapas[0]?.etapa_id ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openDetails = async (card) => {
    try {
      const detail = await buscarAtividade(card.atividade_id);
      setViewing(detail);
    } catch (err) {
      setActionError(err.message);
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
        responsaveis_ids: (detail.responsaveis || [])
          .filter((r) => !isAdministratorAccount(r))
          .map((r) => r.funcionario_id),
      });
      setFormError('');
      setModalOpen(true);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const toggleResponsavel = (id) => {
    const target = funcionarios.find(
      (f) => Number(f.funcionario_id || f.id) === Number(id)
    );
    if (target && isAdministratorAccount(target)) return;

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

    const adminIds = new Set(
      funcionarios
        .filter((f) => isAdministratorAccount(f))
        .map((f) => Number(f.funcionario_id || f.id))
    );
    const cleanResponsaveisIds = form.responsaveis_ids.filter(
      (id) => !adminIds.has(Number(id))
    );

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      data_inicio: `${form.data_inicio}T00:00:00`,
      data_prazo: `${form.data_prazo}T23:59:59`,
      etapa_id: Number(form.etapa_id),
      processo_id: form.processo_id ? Number(form.processo_id) : null,
      responsaveis_ids: cleanResponsaveisIds,
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
      setActionError(err.message);
    }
  };

  const handleMove = async (atividadeId, novaEtapaId) => {
    try {
      await atualizarAtividade(atividadeId, { etapa_id: Number(novaEtapaId) });
      recarregar();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openCreateStage = () => {
    setEditingStageId(null);
    setStageName('');
    setStageFormError('');
    setStageModalOpen(true);
  };

  const openRenameStage = (col) => {
    setEditingStageId(col.etapa_id);
    setStageName(col.nome);
    setStageFormError('');
    setStageModalOpen(true);
  };

  const handleSaveStage = async (e) => {
    e.preventDefault();
    const trimmed = stageName.trim();
    if (!trimmed) {
      setStageFormError('Informe o nome da etapa.');
      return;
    }

    try {
      if (editingStageId !== null) {
        await renomearEtapaKanban(editingStageId, { nome: trimmed });
        setFeedback('Etapa renomeada com sucesso.');
      } else {
        await criarEtapaKanban({ nome: trimmed });
        setFeedback('Etapa criada com sucesso.');
      }
      setStageModalOpen(false);
      recarregar();
    } catch (err) {
      setStageFormError(err.message);
    }
  };

  const handleDeleteStage = async (col) => {
    setActionError('');
    try {
      await excluirEtapaKanban(col.etapa_id);
      setFeedback('Etapa excluída.');
      recarregar();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAddColuna = async () => {
    const trimmed = novaEtapaNome.trim();
    if (!trimmed) {
      setActionError('Informe o nome da etapa.');
      return;
    }

    setActionError('');
    try {
      await criarEtapaKanban({ nome: trimmed });
      setFeedback('Etapa criada com sucesso.');
      setNovaEtapaNome('');
      setNovaEtapaOpen(false);
      recarregar();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleReorderStages = async (sourceStageId, targetStageId) => {
    const currentIds = etapas.map((et) => et.etapa_id);
    const fromIndex = currentIds.indexOf(sourceStageId);
    const toIndex = currentIds.indexOf(targetStageId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const nextIds = [...currentIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);

    setActionError('');
    try {
      await reordenarEtapasKanban(nextIds);
      recarregar();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const responsaveisOptions = useMemo(
    () =>
      funcionarios
        .filter((f) => !isAdministratorAccount(f))
        .map((f) => ({
          value: String(f.funcionario_id),
          label: f.nome,
        })),
    [funcionarios]
  );

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.alertError} role="alert">
          <div>
            <h1>Acesso negado</h1>
            <p>Você não possui permissão para visualizar as atividades.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quadro de Atividades</h1>
          <p className={styles.subtitle}>
            Gerencie as tarefas do escritório por status
          </p>
        </div>
        {canCreate && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={openCreateStage}
            >
              <Plus size={18} /> Nova Etapa
            </button>
            <button
              type="button"
              className={styles.addButton}
              onClick={openCreate}
            >
              <Plus size={18} /> Nova Atividade
            </button>
          </div>
        )}
      </header>

      <ActivityStageSummary
        total={total}
        stages={stageCounts}
        isLoading={isLoading}
        error={error}
        onRetry={recarregar}
      />

      <ActivityFilters
        filters={filters}
        responsaveis={responsaveisOptions}
        funcionarios={funcionarios}
        onFilterChange={setFilter}
        onClear={clearFilters}
      />

      {feedback && (
        <div role="status" className={styles.alertSuccess}>
          {feedback}
        </div>
      )}
      {actionError && (
        <div role="alert" className={styles.alertError}>
          {actionError}
        </div>
      )}

      <div className={styles.board}>
        {etapas.map((col) => {
          const protectedStage = isProtectedStage(col.nome);
          return (
            <div
              key={col.etapa_id}
              data-testid={`coluna-${col.etapa_id}`}
              className={`${styles.column} ${draggedStageId === col.etapa_id ? styles.columnDragging : ''}`}
              draggable={canEdit}
              onDragStart={() => {
                setDraggedStageId(col.etapa_id);
                setDraggedId(null);
              }}
              onDragEnd={() => setDraggedStageId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedStageId !== null) {
                  if (draggedStageId !== col.etapa_id) {
                    handleReorderStages(draggedStageId, col.etapa_id);
                  }
                  setDraggedStageId(null);
                  return;
                }
                if (draggedId && draggedId.etapaId !== col.etapa_id) {
                  handleMove(draggedId.id, col.etapa_id);
                }
                setDraggedId(null);
              }}
            >
              <div className={styles.columnHeader}>
                <div className={styles.columnTitleGroup}>
                  {canEdit && (
                    <GripVertical
                      size={14}
                      className={styles.dragHandle}
                      aria-hidden="true"
                    />
                  )}
                  <span className={styles.columnTitle}>
                    <span>{col.nome.slice(0, 1)}</span>
                    {col.nome.slice(1)}
                  </span>
                </div>
                <div className={styles.columnHeaderActions}>
                  <span className={styles.badge}>{col.atividades.length}</span>
                  {!protectedStage && canEdit && (
                    <button
                      type="button"
                      aria-label={`Renomear etapa ${col.nome}`}
                      className={styles.iconBtn}
                      onClick={() => openRenameStage(col)}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {!protectedStage && canDelete && (
                    <button
                      type="button"
                      aria-label={`Excluir etapa ${col.nome}`}
                      className={styles.iconBtn}
                      onClick={() => {
                        if (col.atividades && col.atividades.length > 0) {
                          setActionError(
                            'Não é possível excluir uma etapa que possui atividades vinculadas. Mova ou exclua as atividades antes.'
                          );
                        } else {
                          setStageToDelete(col);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
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
                      draggable={canEdit}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedStageId(null);
                        setDraggedId({
                          id: a.atividade_id,
                          etapaId: col.etapa_id,
                        });
                      }}
                      className={styles.card}
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
                                setActivityToDelete(a);
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
          );
        })}

        {canCreate &&
          (novaEtapaOpen ? (
            <div className={styles.newStageBox}>
              <input
                autoFocus
                type="text"
                aria-label="Nome da nova etapa"
                value={novaEtapaNome}
                onChange={(e) => setNovaEtapaNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColuna();
                  if (e.key === 'Escape') {
                    setNovaEtapaOpen(false);
                    setNovaEtapaNome('');
                  }
                }}
                placeholder="Nome da etapa..."
                className={styles.newStageInput}
              />
              <div className={styles.newStageActions}>
                <button
                  type="button"
                  className={styles.newStageSubmitBtn}
                  onClick={handleAddColuna}
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  aria-label="Cancelar nova etapa"
                  onClick={() => {
                    setNovaEtapaOpen(false);
                    setNovaEtapaNome('');
                  }}
                  className={styles.newStageCancelBtn}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Adicionar nova etapa ao final"
              onClick={() => setNovaEtapaOpen(true)}
              className={styles.newStageDashedBtn}
            >
              <PlusCircle size={24} />
              <span>Nova Etapa</span>
            </button>
          ))}
      </div>

      <Modal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        ariaLabel={editingStageId !== null ? 'Renomear Etapa' : 'Nova Etapa'}
      >
        <form
          onSubmit={handleSaveStage}
          className={styles.modalContent}
          noValidate
        >
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>
                {editingStageId !== null ? 'Renomear Etapa' : 'Nova Etapa'}
              </h2>
              <p className={styles.requiredHint}>
                <span aria-hidden="true">*</span> Campos obrigatórios
              </p>
            </div>
            <ModalCloseButton onClose={() => setStageModalOpen(false)} />
          </div>
          <div className={styles.modalBody}>
            {stageFormError && (
              <div role="alert" className={styles.alertError}>
                {stageFormError}
              </div>
            )}
            <label className={styles.field}>
              <span className={styles.requiredLabel}>Nome da etapa</span>
              <input
                aria-label="Nome da etapa"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                required
              />
            </label>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setStageModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.addButton}>
              {editingStageId !== null ? 'Salvar Etapa' : 'Criar Etapa'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(activityToDelete)}
        onClose={() => setActivityToDelete(null)}
        ariaLabel="Excluir atividade"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Excluir atividade</h2>
              <p className={styles.modalSubtitle}>
                Esta ação não poderá ser desfeita.
              </p>
            </div>
            <ModalCloseButton onClose={() => setActivityToDelete(null)} />
          </div>
          <div className={styles.modalBody}>
            <p>
              Tem certeza que deseja excluir a atividade{' '}
              <strong>&quot;{activityToDelete?.titulo}&quot;</strong>?
            </p>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setActivityToDelete(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={async () => {
                const id = activityToDelete?.atividade_id;
                setActivityToDelete(null);
                if (id) await handleDelete(id);
              }}
            >
              Confirmar exclusão
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(stageToDelete)}
        onClose={() => setStageToDelete(null)}
        ariaLabel="Excluir etapa"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Excluir etapa</h2>
              <p className={styles.modalSubtitle}>
                Esta ação não poderá ser desfeita.
              </p>
            </div>
            <ModalCloseButton onClose={() => setStageToDelete(null)} />
          </div>
          <div className={styles.modalBody}>
            <p>
              Tem certeza que deseja excluir a etapa{' '}
              <strong>&quot;{stageToDelete?.nome}&quot;</strong>?
            </p>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setStageToDelete(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={async () => {
                const col = stageToDelete;
                setStageToDelete(null);
                if (col) await handleDeleteStage(col);
              }}
            >
              Confirmar exclusão
            </button>
          </div>
        </div>
      </Modal>

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
                    <span className={styles.detailLabel}>Responsáveis</span>
                    {(() => {
                      const validResponsaveis = (
                        viewing.responsaveis || []
                      ).filter((r) => !isAdministratorAccount(r));
                      if (validResponsaveis.length === 0) {
                        return (
                          <p className={styles.detailValue}>Não atribuído</p>
                        );
                      }
                      return (
                        <div className={styles.responsibleList}>
                          {validResponsaveis.map((r) => {
                            const rId = r.funcionario_id || r.id;
                            const fullFunc =
                              funcionarios.find(
                                (f) =>
                                  Number(f.funcionario_id || f.id) ===
                                    Number(rId) || f.nome === r.nome
                              ) || r;
                            const nome = fullFunc.nome || r.nome;
                            const fotoUrl =
                              getValidFotoUrl(fullFunc) || getValidFotoUrl(r);

                            return (
                              <div
                                key={rId || nome}
                                className={styles.responsibleRow}
                              >
                                <div className={styles.detailAvatar}>
                                  {fotoUrl ? (
                                    <>
                                      <img
                                        src={getImageUrl(fotoUrl)}
                                        alt={`Foto de ${nome}`}
                                        className={styles.avatarImage}
                                        onError={(e) => {
                                          e.currentTarget.style.display =
                                            'none';
                                          if (
                                            e.currentTarget.nextElementSibling
                                          ) {
                                            e.currentTarget.nextElementSibling.style.display =
                                              'inline';
                                          }
                                        }}
                                      />
                                      <span style={{ display: 'none' }}>
                                        {obterIniciais(nome)}
                                      </span>
                                    </>
                                  ) : (
                                    obterIniciais(nome)
                                  )}
                                </div>
                                <span className={styles.responsibleName}>
                                  {nome}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
              <label htmlFor="atividade-responsaveis">Responsáveis</label>
              <AutocompleteMultiResponsible
                id="atividade-responsaveis"
                selectedIds={form.responsaveis_ids}
                onChange={(ids) =>
                  setForm((prev) => ({ ...prev, responsaveis_ids: ids }))
                }
                funcionarios={funcionarios}
                placeholder="Selecione os responsáveis..."
              />
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
