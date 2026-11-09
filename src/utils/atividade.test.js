import { describe, expect, it } from 'vitest';
import {
  countActivitiesByStage,
  distributeActivitiesIntoStages,
  EMPTY_ACTIVITY_SUMMARY,
  formatActivityResponsibles,
  formatarResumoAtividades,
  getActivityScopeLabel,
  getRecentActivities,
  getStageTone,
  toKanbanStages,
} from './atividade';

const kanban = {
  escopo: 'escritorio',
  etapas: [
    {
      etapa_id: 4,
      nome: 'Finalizado',
      ordem: 4,
      atividades: [
        {
          atividade_id: 5,
          titulo: 'Homologação',
          data_prazo: '2026-08-25T18:00:00',
          responsaveis: [],
        },
      ],
    },
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [
        {
          atividade_id: 9,
          titulo: 'Petição atrasada',
          data_prazo: '2026-08-01T18:00:00',
          responsaveis: [],
        },
        {
          atividade_id: 8,
          titulo: 'Petição no prazo',
          data_prazo: '2026-12-01T18:00:00',
          responsaveis: [],
        },
      ],
    },
    { etapa_id: 2, nome: 'Em Execução', ordem: 2 },
  ],
};

const now = new Date('2026-09-01T12:00:00Z');

describe('utils de atividade', () => {
  it('formata o resumo convertendo valores para número', () => {
    expect(
      formatarResumoAtividades({
        escopo: 'escritorio',
        pendentes: '3',
        em_execucao: 7,
        concluidas: null,
      })
    ).toEqual({
      escopo: 'escritorio',
      pendentes: 3,
      em_execucao: 7,
      concluidas: 0,
      atrasadas: 0,
    });
  });

  it('usa o escopo "usuario" e valores zerados quando o resumo é inválido', () => {
    expect(formatarResumoAtividades(undefined)).toEqual(EMPTY_ACTIVITY_SUMMARY);
  });

  it.each([
    ['escritorio', 'Atividades do escritório'],
    ['usuario', 'Minhas atividades'],
  ])('descreve o escopo %s', (scope, label) => {
    expect(getActivityScopeLabel(scope)).toBe(label);
  });

  it('define o tom de cada etapa com fallback neutro', () => {
    expect(getStageTone('Backlog')).toBe('neutral');
    expect(getStageTone('Em Execução')).toBe('info');
    expect(getStageTone('Revisão')).toBe('warning');
    expect(getStageTone('Finalizado')).toBe('success');
    expect(getStageTone('Outra')).toBe('neutral');
  });

  it('ordena as etapas e garante a lista de atividades', () => {
    const stages = toKanbanStages(kanban);

    expect(stages.map((stage) => stage.nome)).toEqual([
      'Backlog',
      'Em Execução',
      'Finalizado',
    ]);
    expect(stages[1].atividades).toEqual([]);
    expect(toKanbanStages(undefined)).toEqual([]);
  });

  it('desempata etapas com a mesma ordem pelo id', () => {
    const stages = toKanbanStages({
      etapas: [
        { etapa_id: 2, nome: 'B', ordem: 1 },
        { etapa_id: 1, nome: 'A', ordem: 1 },
      ],
    });

    expect(stages.map((stage) => stage.nome)).toEqual(['A', 'B']);
  });

  it('conta o total e as atividades por etapa', () => {
    expect(countActivitiesByStage(toKanbanStages(kanban))).toEqual({
      total: 3,
      stages: [
        { etapa_id: 1, nome: 'Backlog', quantidade: 2 },
        { etapa_id: 2, nome: 'Em Execução', quantidade: 0 },
        { etapa_id: 4, nome: 'Finalizado', quantidade: 1 },
      ],
    });
    expect(countActivitiesByStage()).toEqual({ total: 0, stages: [] });
  });

  it('lista as atividades mais recentes, sinalizando finalizadas e atrasadas', () => {
    const recent = getRecentActivities(toKanbanStages(kanban), 5, now);

    expect(recent.map((activity) => activity.atividade_id)).toEqual([9, 8, 5]);
    expect(recent[0]).toMatchObject({
      etapa: 'Backlog',
      finalizada: false,
      atrasada: true,
    });
    expect(recent[1]).toMatchObject({ atrasada: false });
    expect(recent[2]).toMatchObject({ finalizada: true, atrasada: false });
  });

  it('respeita o limite de atividades recentes', () => {
    expect(getRecentActivities(toKanbanStages(kanban), 2, now)).toHaveLength(2);
    expect(getRecentActivities()).toEqual([]);
  });

  it('formata os responsáveis da atividade', () => {
    expect(
      formatActivityResponsibles([
        { funcionario_id: 1, nome: 'Ana' },
        { funcionario_id: 2, nome: 'Pedro' },
      ])
    ).toBe('Ana, Pedro');
    expect(formatActivityResponsibles([])).toBe('Sem responsável');
    expect(formatActivityResponsibles()).toBe('Sem responsável');
  });
});

describe('distributeActivitiesIntoStages', () => {
  const etapasModelo = [
    { etapa_id: 1, nome: 'Backlog', ordem: 1, atividades: [] },
    { etapa_id: 2, nome: 'Em Execução', ordem: 2, atividades: [] },
    { etapa_id: 3, nome: 'Finalizado', ordem: 3, atividades: [] },
  ];

  it('distribui corretamente as atividades conforme suas etapas', () => {
    const atividades = [
      { atividade_id: 10, titulo: 'Atividade 1', etapa_id: 1 },
      { atividade_id: 20, titulo: 'Atividade 2', etapa_id: 2 },
      { atividade_id: 30, titulo: 'Atividade 3', etapa_id: 1 },
    ];

    const resultado = distributeActivitiesIntoStages(etapasModelo, atividades);

    expect(resultado[0].atividades).toHaveLength(2);
    expect(resultado[0].atividades.map((a) => a.atividade_id)).toEqual([
      10, 30,
    ]);

    expect(resultado[1].atividades).toHaveLength(1);
    expect(resultado[1].atividades[0].atividade_id).toBe(20);

    expect(resultado[2].atividades).toEqual([]);
  });

  it('preserva colunas vazias mantendo array vazio em atividades', () => {
    const resultado = distributeActivitiesIntoStages(etapasModelo, []);

    expect(resultado).toHaveLength(3);
    expect(resultado[0].atividades).toEqual([]);
    expect(resultado[1].atividades).toEqual([]);
    expect(resultado[2].atividades).toEqual([]);
  });

  it('descarta com segurança atividades associadas a etapa_id inexistente', () => {
    const atividadesComIdInvalido = [
      { atividade_id: 99, titulo: 'Sem etapa válida', etapa_id: 999 },
    ];

    const resultado = distributeActivitiesIntoStages(
      etapasModelo,
      atividadesComIdInvalido
    );

    expect(resultado[0].atividades).toEqual([]);
    expect(resultado[1].atividades).toEqual([]);
    expect(resultado[2].atividades).toEqual([]);
  });

  it('trata parâmetros ausentes ou nulos sem lançar exceção', () => {
    expect(distributeActivitiesIntoStages()).toEqual([]);
    expect(distributeActivitiesIntoStages(null, null)).toEqual([]);
  });
});
