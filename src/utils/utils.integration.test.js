import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countActivitiesByStage,
  formatActivityResponsibles,
  formatarResumoAtividades,
  getRecentActivities,
  getStageTone,
  toKanbanStages,
} from './atividade';
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
} from './authSession';
import { toApiLancamento, toLancamento, parseApiError } from './financas';
import {
  calculateDaysSince,
  calculateRemainingDays,
  enrichProcess,
  formatCnjInput,
  normalizeProcessDate,
  sortCriticalProcesses,
  toProcessPage,
  toProcessView,
  toResponsavelOptions,
} from './processo';
import {
  EMPTY_TEAM_SUMMARY,
  formatarSumarioEquipe,
  obterProgressoEquipe,
} from './produtividadeEquipe';

const buildToken = (payload) => {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${body}.signature`;
};

describe('utilitários (integração entre módulos)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('sessão de autenticação', () => {
    it('lê o token do sessionStorage, do localStorage ou do token legado', () => {
      expect(getAccessToken()).toBeNull();

      localStorage.setItem('token', 'legado');
      expect(getAccessToken()).toBe('legado');

      localStorage.setItem('access_token', 'local');
      expect(getAccessToken()).toBe('local');

      sessionStorage.setItem('access_token', 'sessao');
      expect(getAccessToken()).toBe('sessao');
    });

    it('monta o usuário a partir do token quando não há usuário salvo', () => {
      sessionStorage.setItem(
        'access_token',
        buildToken({
          sub: '7',
          email: 'ana@advog.com',
          nome: 'Ana',
          cargo: { nome: 'Socia' },
        })
      );

      expect(getCurrentUser()).toEqual({
        funcionario_id: 7,
        email: 'ana@advog.com',
        nome: 'Ana',
        cargo: { nome: 'Socia' },
      });
    });

    it('usa valores padrão quando o token não traz nome, cargo ou identificador', () => {
      sessionStorage.setItem(
        'access_token',
        buildToken({ email: 'pedro@advog.com' })
      );

      expect(getCurrentUser()).toEqual({
        funcionario_id: undefined,
        email: 'pedro@advog.com',
        nome: 'pedro',
        cargo: '',
      });
    });

    it('mantém o usuário salvo quando o e-mail coincide com o do token', () => {
      sessionStorage.setItem(
        'access_token',
        buildToken({ email: 'ANA@advog.com' })
      );
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({ email: 'ana@advog.com', nome: 'Ana Salva' })
      );

      expect(getCurrentUser().nome).toBe('Ana Salva');
    });

    it('descarta o usuário salvo quando o e-mail diverge do token', () => {
      sessionStorage.setItem(
        'access_token',
        buildToken({ sub: '2', email: 'novo@advog.com' })
      );
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({ email: 'antigo@advog.com', nome: 'Antigo' })
      );
      localStorage.setItem(
        'current_user',
        JSON.stringify({ email: 'antigo@advog.com' })
      );

      expect(getCurrentUser().email).toBe('novo@advog.com');
      expect(sessionStorage.getItem('current_user')).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
    });

    it('ignora usuário salvo inválido e tokens malformados', () => {
      sessionStorage.setItem('current_user', '{inválido');
      expect(getCurrentUser()).toBeNull();

      sessionStorage.setItem('access_token', 'sem-partes');
      expect(getCurrentUser()).toBeNull();

      sessionStorage.setItem('access_token', 'a.%%%.c');
      expect(getCurrentUser()).toBeNull();
    });

    it('mantém o usuário salvo quando o token não possui e-mail', () => {
      sessionStorage.setItem('access_token', buildToken({ sub: '1' }));
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({ email: 'ana@advog.com' })
      );

      expect(getCurrentUser().email).toBe('ana@advog.com');
    });

    it('limpa toda a sessão', () => {
      sessionStorage.setItem('access_token', 'x');
      localStorage.setItem('token', 'y');
      localStorage.setItem('current_user', '{}');

      clearAuthSession();

      expect(getAccessToken()).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
    });

    it('não acessa o armazenamento fora do navegador', () => {
      vi.stubGlobal('window', undefined);

      expect(getAccessToken()).toBeNull();
      expect(getCurrentUser()).toBeNull();
      expect(() => clearAuthSession()).not.toThrow();
    });
  });

  describe('atividades', () => {
    it('formata o resumo com valores padrão para campos ausentes', () => {
      expect(formatarResumoAtividades({ escopo: 'escritorio' })).toEqual({
        escopo: 'escritorio',
        pendentes: 0,
        em_execucao: 0,
        concluidas: 0,
        atrasadas: 0,
      });
      expect(formatarResumoAtividades().escopo).toBe('usuario');
      expect(getStageTone('Etapa Nova')).toBe('neutral');
    });

    it('monta etapas, contagens e atividades recentes de um kanban incompleto', () => {
      const stages = toKanbanStages({
        etapas: [
          { etapa_id: 2, nome: 'Revisão', ordem: 3 },
          {
            etapa_id: 1,
            nome: 'Backlog',
            ordem: 1,
            atividades: [
              {
                atividade_id: 1,
                titulo: 'A',
                data_prazo: '2020-01-01T00:00:00',
              },
              {
                atividade_id: 2,
                titulo: 'B',
                data_prazo: '2999-01-01T00:00:00',
              },
            ],
          },
          { etapa_id: 3, nome: 'Em Execução', ordem: 1 },
        ],
      });

      expect(stages.map((stage) => stage.etapa_id)).toEqual([1, 3, 2]);
      expect(countActivitiesByStage(stages).total).toBe(2);

      const recent = getRecentActivities(stages);
      expect(recent.map((activity) => activity.atividade_id)).toEqual([2, 1]);
      expect(recent[1].atrasada).toBe(true);
      expect(getRecentActivities(stages, 1)).toHaveLength(1);
      expect(formatActivityResponsibles()).toBe('Sem responsável');
      expect(toKanbanStages()).toEqual([]);
    });
  });

  describe('produtividade da equipe', () => {
    it('completa campos ausentes e limita o progresso entre 0 e 100', () => {
      expect(formatarSumarioEquipe()).toEqual(EMPTY_TEAM_SUMMARY);
      expect(formatarSumarioEquipe({ finalizadas: '4' }).finalizadas).toBe(4);
      expect(obterProgressoEquipe({ progresso: 140 })).toBe(100);
      expect(obterProgressoEquipe({ progresso: -5 })).toBe(0);
      expect(obterProgressoEquipe({})).toBe(0);
    });
  });

  describe('financas', () => {
    it('converte lançamentos com tipos e datas em formatos variados', () => {
      expect(toLancamento({ tipo: 'Saída' }).tipo).toBe('saida');
      expect(toLancamento({ tipo: 'SAIDA' }).tipo).toBe('saida');
      expect(toLancamento({}).tipo).toBe('entrada');
      expect(
        toLancamento({ data_vencimento: '31/12/2026' }).dataVencimentoIso
      ).toBe('2026-12-31');
      expect(
        toApiLancamento({
          tipo: 'saida',
          dataVencimento: '15/08/2026',
          dataPagamento: '16/08/2026',
          status: 'realizado',
        })
      ).toMatchObject({ tipo: 's' });
    });

    it('usa a data original quando ela não pode ser convertida', () => {
      const payload = toApiLancamento({
        tipo: 'entrada',
        dataVencimentoIso: 'data-estranha',
        dataPagamentoIso: 'pagamento-estranho',
        status: 'Realizado',
      });

      expect(payload.data_vencimento).toBe('data-estranha');
      expect(payload.data_pagamento).toBe('pagamento-estranho');
    });

    it('serializa erros de validação sem mensagens utilizáveis', () => {
      expect(parseApiError({ detail: [] })).toBe('[]');
    });
  });

  describe('processos', () => {
    it('normaliza datas ISO, brasileiras e inválidas', () => {
      expect(normalizeProcessDate('2026-09-01T10:00:00')).toBe('2026-09-01');
      expect(normalizeProcessDate('2026-02-31')).toBe('');
      expect(normalizeProcessDate('31/12/2026')).toBe('2026-12-31');
      expect(normalizeProcessDate('31/02/2026')).toBe('');
      expect(normalizeProcessDate('texto')).toBe('');
      expect(normalizeProcessDate('')).toBe('');
    });

    it('calcula dias restantes e decorridos, tolerando datas inválidas', () => {
      const now = new Date('2026-09-10T12:00:00Z');

      expect(calculateRemainingDays('2026-09-15', now)).toBe(5);
      expect(calculateRemainingDays('invalida', now)).toBeNull();
      expect(calculateDaysSince('2026-09-05', now)).toBe(5);
      expect(calculateDaysSince('2026-09-20', now)).toBe(0);
      expect(calculateDaysSince('invalida', now)).toBeNull();
    });

    it('formata o número CNJ progressivamente', () => {
      expect(formatCnjInput('00612')).toBe('00612');
      expect(formatCnjInput('006123456')).toBe('0061234-56');
      expect(formatCnjInput('00612345620268')).toBe('0061234-56.2026.8');
      expect(formatCnjInput('0061234562026826')).toBe('0061234-56.2026.8.26');
      expect(formatCnjInput('00612345620268260100999')).toBe(
        '0061234-56.2026.8.26.0100'
      );
      expect(formatCnjInput(undefined)).toBe('');
      expect(formatCnjInput('0061234562026')).toBe('0061234-56.2026');
    });

    it('monta a visão do processo com valores padrão', () => {
      expect(
        toProcessView(
          { titulo_proc: 'Caso', cliente_id: 4, responsavel_id: 3 },
          new Map([['3', 'Ana']])
        )
      ).toMatchObject({
        id: '',
        cliente: 'Cliente nº 4',
        responsavel: 'Ana',
      });
      expect(toProcessView({ titulo_proc: 'Caso' })).toMatchObject({
        cliente: 'Não informado',
        responsavel: 'Não informado',
      });
    });

    it('monta a página de processos com valores padrão', () => {
      expect(toProcessPage({})).toEqual({
        itens: [],
        total: 0,
        page: 1,
        pageSize: 0,
        totalPages: 1,
      });
      expect(
        toResponsavelOptions([{ id: 9, nome: 'Carlos' }, { funcionario_id: 1 }])
      ).toEqual([
        { value: '9', label: 'Carlos' },
        { value: '1', label: undefined },
      ]);
    });

    it('ordena processos críticos por movimentação, início e identificador', () => {
      const ordered = sortCriticalProcesses([
        { processo_id: 1 },
        { processo_id: 2, data_realizado: '2026-08-02' },
        { processo_id: 3, data_inicio: '2026-08-01' },
        { processo_id: 4, data_realizado: '2026-08-02' },
        { processo_id: 5 },
        undefined,
      ]);

      expect(ordered.slice(0, 3).map((item) => item?.processo_id)).toEqual([
        3, 4, 2,
      ]);
      expect(ordered.at(-1)).toBeUndefined();
      expect(sortCriticalProcesses()).toEqual([]);
    });

    it('enriquece o processo com identificadores e nomes alternativos', () => {
      expect(enrichProcess(null)).toBeNull();

      expect(
        enrichProcess({ cnj: '123', titulo: 'T', descricao: 'D' })
      ).toMatchObject({
        id: '123',
        cliente: 'Sem cliente',
        responsavel: 'Sem responsável',
      });

      expect(
        enrichProcess(
          { id: 8, cliente_id: 4, funcionario_id: 3 },
          new Map(),
          new Map()
        )
      ).toMatchObject({
        processo_id: 8,
        cliente: 'Cliente #4',
        responsavel: 'Responsável #3',
      });
    });
  });
});
