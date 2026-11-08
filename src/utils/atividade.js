import { isOverdueDeadline } from '@/utils/processo';

export const FINALIZED_STAGE = 'Finalizado';
export const RECENT_ACTIVITIES_LIMIT = 5;

export const EMPTY_ACTIVITY_SUMMARY = Object.freeze({
  escopo: 'usuario',
  pendentes: 0,
  em_execucao: 0,
  concluidas: 0,
  atrasadas: 0,
});

const STAGE_TONES = Object.freeze({
  Backlog: 'neutral',
  'Em Execução': 'info',
  Revisão: 'warning',
  [FINALIZED_STAGE]: 'success',
});

export const formatarResumoAtividades = (summary) => ({
  escopo: summary?.escopo === 'escritorio' ? 'escritorio' : 'usuario',
  pendentes: Number(summary?.pendentes || 0),
  em_execucao: Number(summary?.em_execucao || 0),
  concluidas: Number(summary?.concluidas || 0),
  atrasadas: Number(summary?.atrasadas || 0),
});

export const getActivityScopeLabel = (scope) =>
  scope === 'escritorio' ? 'Atividades do escritório' : 'Minhas atividades';

export const getStageTone = (stageName) => STAGE_TONES[stageName] ?? 'neutral';

export const toKanbanStages = (kanban) =>
  [...(kanban?.etapas ?? [])]
    .sort((a, b) => a.ordem - b.ordem || a.etapa_id - b.etapa_id)
    .map((stage) => ({ ...stage, atividades: stage.atividades ?? [] }));

export const countActivitiesByStage = (stages = []) => {
  const counts = stages.map((stage) => ({
    etapa_id: stage.etapa_id,
    nome: stage.nome,
    quantidade: stage.atividades.length,
  }));

  return {
    total: counts.reduce((sum, stage) => sum + stage.quantidade, 0),
    stages: counts,
  };
};

export const getRecentActivities = (
  stages = [],
  limit = RECENT_ACTIVITIES_LIMIT,
  now = new Date()
) =>
  stages
    .flatMap((stage) =>
      stage.atividades.map((activity) => {
        const isFinished = stage.nome === FINALIZED_STAGE;

        return {
          ...activity,
          etapa_id: stage.etapa_id,
          etapa: stage.nome,
          finalizada: isFinished,
          atrasada: !isFinished && isOverdueDeadline(activity.data_prazo, now),
        };
      })
    )
    .sort((a, b) => b.atividade_id - a.atividade_id)
    .slice(0, limit);

export const formatActivityResponsibles = (responsaveis = []) =>
  responsaveis.length > 0
    ? responsaveis.map((responsavel) => responsavel.nome).join(', ')
    : 'Sem responsável';

export const distributeActivitiesIntoStages = (
  stages = [],
  activities = []
) => {
  const activitiesByStage = new Map();
  stages.forEach((stage) => activitiesByStage.set(stage.etapa_id, []));

  activities.forEach((activity) => {
    if (activitiesByStage.has(activity.etapa_id)) {
      activitiesByStage.get(activity.etapa_id).push(activity);
    }
  });

  return stages.map((stage) => ({
    ...stage,
    atividades: activitiesByStage.get(stage.etapa_id) ?? [],
  }));
};
