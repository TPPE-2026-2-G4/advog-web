import { describe, expect, it } from 'vitest';
import {
  buildProcessQuery,
  hasInvalidDateRange,
  toProcessPage,
  toProcessView,
  toResponsavelNames,
  toResponsavelOptions,
  CNJ_REGEX,
  calculateDaysSince,
  calculateRemainingDays,
  enrichProcess,
  formatCnjInput,
  formatProcessDate,
  isOverdueDeadline,
  normalizeProcessDate,
  sortCriticalProcesses,
  toProcessFormData,
  toProcessPayload,
  toProcessUpdatePayload,
} from './processo';

const formData = {
  cnj: ' 0061234-56.2026.8.26.0100 ',
  titulo: '  Ação indenizatória  ',
  descricao: '  ',
  status: 'Ativo',
  tribunal: ' TJDFT ',
  area: ' Civil ',
  data_inicio: '01/09/2026',
  data_realizado: '',
  data_prazo: '2026-10-05',
  cliente_id: '4',
  funcionario_id: '3',
};

describe('utilitários de processo', () => {
  it.each([
    {
      cenario: 'data ISO simples',
      value: '2026-10-05',
      expected: '2026-10-05',
    },
    {
      cenario: 'data ISO com horário',
      value: '2026-10-05T12:30:00',
      expected: '2026-10-05',
    },
    {
      cenario: 'data no formato brasileiro',
      value: '05/10/2026',
      expected: '2026-10-05',
    },
    {
      cenario: 'data no formato brasileiro com espaços',
      value: ' 05/10/2026 ',
      expected: '2026-10-05',
    },
    { cenario: 'string vazia', value: '', expected: '' },
    { cenario: 'valor null', value: null, expected: '' },
    {
      cenario: 'dia inexistente em fevereiro',
      value: '31/02/2026',
      expected: '',
    },
    { cenario: 'mês inválido em ISO', value: '2026-13-01', expected: '' },
    {
      cenario: 'texto arbitrário inválido',
      value: 'data inválida',
      expected: '',
    },
  ])(
    'normalizeProcessDate trata $cenario ($value -> "$expected")',
    ({ value, expected }) => {
      expect(normalizeProcessDate(value)).toBe(expected);
    }
  );

  it.each([
    {
      cenario: 'data ISO válida',
      value: '2026-10-05',
      expected: '05/10/2026',
    },
    {
      cenario: 'data já em formato pt-BR',
      value: '05/10/2026',
      expected: '05/10/2026',
    },
    {
      cenario: 'texto descritivo não reconhecido como data',
      value: 'sem prazo',
      expected: 'sem prazo',
    },
    {
      cenario: 'valor vazio retornando fallback',
      value: '',
      expected: 'Não informado',
    },
  ])(
    'formatProcessDate formata $cenario ($value -> "$expected")',
    ({ value, expected }) => {
      expect(formatProcessDate(value)).toBe(expected);
    }
  );

  it.each([
    { cenario: 'prazo futuro em ISO', value: '2026-10-05', expected: 4 },
    { cenario: 'prazo passado em pt-BR', value: '30/09/2026', expected: -1 },
    { cenario: 'prazo no mesmo dia', value: '2026-10-01', expected: 0 },
    { cenario: 'data inválida', value: 'inválida', expected: null },
  ])(
    'calculateRemainingDays calcula dias restantes para $cenario',
    ({ value, expected }) => {
      const now = new Date('2026-10-01T23:59:00.000Z');
      expect(calculateRemainingDays(value, now)).toBe(expected);
    }
  );

  it.each([
    {
      cenario: 'prazo anterior à data atual',
      value: '2026-09-30',
      expected: true,
    },
    {
      cenario: 'prazo igual à data atual',
      value: '2026-10-01',
      expected: false,
    },
    {
      cenario: 'prazo posterior à data atual',
      value: '2026-10-02',
      expected: false,
    },
    { cenario: 'data inválida', value: 'inválida', expected: false },
  ])(
    'isOverdueDeadline retorna $expected para $cenario ($value)',
    ({ value, expected }) => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      expect(isOverdueDeadline(value, now)).toBe(expected);
    }
  );

  it.each([
    {
      cenario: 'CNJ formatado segundo o padrão oficial',
      value: '0061234-56.2026.8.26.0100',
      expected: true,
    },
    {
      cenario: 'CNJ apenas com dígitos sem pontuação',
      value: '00612345620268260100',
      expected: false,
    },
  ])('CNJ_REGEX avalia $cenario como $expected', ({ value, expected }) => {
    expect(CNJ_REGEX.test(value)).toBe(expected);
  });

  it.each([
    { cenario: '7 dígitos iniciais', input: '0061234', expected: '0061234' },
    {
      cenario: '9 dígitos com hífen',
      input: '006123456',
      expected: '0061234-56',
    },
    {
      cenario: '13 dígitos com ano',
      input: '0061234562026',
      expected: '0061234-56.2026',
    },
    {
      cenario: '20 dígitos completos',
      input: '00612345620268260100',
      expected: '0061234-56.2026.8.26.0100',
    },
    {
      cenario: 'entrada com caracteres alfabéticos misturados',
      input: '0061234abc562026x8y260100',
      expected: '0061234-56.2026.8.26.0100',
    },
    {
      cenario: 'entrada excedendo o limite de 20 dígitos',
      input: '006123456202682601009999',
      expected: '0061234-56.2026.8.26.0100',
    },
    { cenario: 'entrada nula', input: null, expected: '' },
  ])(
    'formatCnjInput formata progressivamente $cenario ($input -> "$expected")',
    ({ input, expected }) => {
      expect(formatCnjInput(input)).toBe(expected);
    }
  );

  it('monta o payload de criação normalizado', () => {
    expect(toProcessPayload(formData)).toEqual({
      cnj: '0061234-56.2026.8.26.0100',
      titulo: 'Ação indenizatória',
      descricao: null,
      status: 'Ativo',
      tribunal: 'TJDFT',
      area: 'Civil',
      data_inicio: '2026-09-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-10-05T00:00:00',
      cliente_id: 4,
      funcionario_id: 3,
    });
  });

  it('envia funcionario_id nulo quando não há responsável e omite CNJ quando solicitado', () => {
    expect(
      toProcessPayload({ ...formData, funcionario_id: '' }).funcionario_id
    ).toBeNull();
    expect(
      toProcessPayload(formData, { includeCnj: false })
    ).not.toHaveProperty('cnj');
  });

  it('inclui no payload de atualização apenas os campos alterados', () => {
    const original = {
      cnj: '0061234-56.2026.8.26.0100',
      titulo: 'Ação indenizatória',
      descricao: null,
      status: 'Ativo',
      tribunal: 'TJDFT',
      area: 'Civil',
      data_inicio: '2026-09-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-10-05T00:00:00',
      cliente_id: 4,
      funcionario_id: 3,
    };

    expect(
      toProcessUpdatePayload(
        { ...toProcessFormData(original), status: 'Concluído' },
        original
      )
    ).toEqual({ status: 'Concluído' });
  });

  it.each([
    {
      cenario: 'resposta preenchida da API',
      input: {
        cnj: '0061234-56.2026.8.26.0100',
        titulo: 'Caso',
        descricao: null,
        status: 'Ativo',
        tribunal: 'TJDFT',
        area: 'Civil',
        data_inicio: '2026-09-01T00:00:00',
        data_realizado: null,
        data_prazo: '05/10/2026',
        cliente_id: 4,
        funcionario_id: null,
      },
      expected: {
        cnj: '0061234-56.2026.8.26.0100',
        titulo: 'Caso',
        descricao: '',
        status: 'Ativo',
        tribunal: 'TJDFT',
        area: 'Civil',
        data_inicio: '2026-09-01',
        data_realizado: '',
        data_prazo: '2026-10-05',
        cliente_id: '4',
        funcionario_id: '',
      },
    },
    {
      cenario: 'processo indefinido (valores padrão)',
      input: undefined,
      expected: {
        cnj: '',
        titulo: '',
        descricao: '',
        status: 'Em Análise',
        tribunal: '',
        area: '',
        data_inicio: '',
        data_realizado: '',
        data_prazo: '',
        cliente_id: '',
        funcionario_id: '',
      },
    },
  ])(
    'toProcessFormData converte corretamente $cenario',
    ({ input, expected }) => {
      expect(toProcessFormData(input)).toEqual(expected);
    }
  );
});

describe('filtros e listagem de processos', () => {
  it.each([
    {
      cenario: 'múltiplos filtros válidos preenchidos',
      filters: {
        busca: '  0061234  ',
        status: 'Ativo',
        responsavelId: '7',
        prazoInicio: '2026-09-01',
        prazoFim: '',
        page: 2,
        pageSize: 5,
      },
      expected:
        'busca=0061234&status=Ativo&responsavel_id=7&prazo_inicio=2026-09-01&page=2&page_size=5',
    },
    {
      cenario: 'data em formato brasileiro e busca em branco',
      filters: { busca: '   ', prazoInicio: '31/12/2026', page: 1 },
      expected: 'prazo_inicio=2026-12-31&page=1',
    },
    {
      cenario: 'data inválida descartada automaticamente',
      filters: { prazoInicio: '31/02/2026', page: 1 },
      expected: 'page=1',
    },
  ])(
    'buildProcessQuery monta a query para $cenario',
    ({ filters, expected }) => {
      expect(buildProcessQuery(filters)).toBe(expected);
    }
  );

  it.each([
    {
      cenario: 'início posterior ao fim',
      start: '2026-09-10',
      end: '2026-09-01',
      expected: true,
    },
    {
      cenario: 'início igual ao fim',
      start: '2026-09-01',
      end: '2026-09-01',
      expected: false,
    },
    {
      cenario: 'início vazio',
      start: '',
      end: '2026-09-01',
      expected: false,
    },
  ])(
    'hasInvalidDateRange retorna $expected quando $cenario',
    ({ start, end, expected }) => {
      expect(hasInvalidDateRange(start, end)).toBe(expected);
    }
  );

  it('converte opções de responsável e indexa nomes pelo identificador textual', () => {
    const options = toResponsavelOptions([
      { funcionario_id: 3, nome: 'Ana Paula Ribeiro' },
    ]);
    expect(options).toEqual([{ value: '3', label: 'Ana Paula Ribeiro' }]);

    const names = toResponsavelNames(options);
    expect(names.get('3')).toBe('Ana Paula Ribeiro');
    expect(names.get('9')).toBeUndefined();
  });

  it.each([
    {
      cenario: 'processo completo com responsável mapeado',
      processo: {
        processo_id: 1,
        cnj: '0061234-56.2026.8.26.0100',
        titulo_proc: 'Ação Trabalhista',
        status: 'Ativo',
        tribunal: 'TRT2',
        area: 'Trabalhista',
        data_prazo: '2026-09-05T00:00:00',
        cliente_id: 4,
        responsavel_id: 3,
      },
      responsaveis: new Map([['3', 'Ana Paula Ribeiro']]),
      expected: {
        id: '0061234-56.2026.8.26.0100',
        titulo: 'Ação Trabalhista',
        cliente: 'Cliente nº 4',
        status: 'Ativo',
        tribunal: 'TRT2',
        area: 'Trabalhista',
        responsavel: 'Ana Paula Ribeiro',
        prazo: '2026-09-05',
      },
    },
    {
      cenario: 'processo sem cliente, responsável ou prazo (fallbacks)',
      processo: {
        cnj: null,
        titulo_proc: 'Caso',
        status: 'Pendente',
        tribunal: undefined,
        area: undefined,
        cliente_id: null,
        responsavel_id: null,
        data_prazo: null,
      },
      responsaveis: undefined,
      expected: {
        id: '',
        titulo: 'Caso',
        cliente: 'Não informado',
        status: 'Pendente',
        tribunal: undefined,
        area: undefined,
        responsavel: 'Não informado',
        prazo: '',
      },
    },
  ])(
    'toProcessView adapta corretamente $cenario',
    ({ processo, responsaveis, expected }) => {
      expect(toProcessView(processo, responsaveis)).toEqual(expected);
    }
  );

  it.each([
    {
      cenario: 'página completa da API',
      input: {
        itens: [{ cnj: '1', titulo_proc: 'A', status: 'Ativo' }],
        total: 6,
        page: 2,
        page_size: 5,
        total_pages: 2,
      },
      expected: {
        itens: [{ cnj: '1', titulo_proc: 'A', status: 'Ativo' }],
        total: 6,
        page: 2,
        pageSize: 5,
        totalPages: 2,
      },
    },
    {
      cenario: 'página vazia/incompleta com valores padrão',
      input: {},
      expected: {
        itens: [],
        total: 0,
        page: 1,
        pageSize: 0,
        totalPages: 1,
      },
    },
  ])('toProcessPage converte $cenario', ({ input, expected }) => {
    expect(toProcessPage(input)).toEqual(expected);
  });
});

describe('calculateDaysSince', () => {
  it('calcula dias decorridos a partir de uma data no passado', () => {
    const now = new Date('2026-10-30T12:00:00.000Z');
    expect(calculateDaysSince('2026-10-15', now)).toBe(15);
    expect(calculateDaysSince('10/10/2026', now)).toBe(20);
  });

  it('retorna 0 para datas iguais a hoje ou no futuro', () => {
    const now = new Date('2026-10-30T12:00:00.000Z');
    expect(calculateDaysSince('2026-10-30', now)).toBe(0);
    expect(calculateDaysSince('2026-11-05', now)).toBe(0);
  });

  it('retorna null para valores vazios ou inválidos', () => {
    expect(calculateDaysSince(null)).toBeNull();
    expect(calculateDaysSince('')).toBeNull();
    expect(calculateDaysSince('data-invalida')).toBeNull();
  });
});

describe('sortCriticalProcesses', () => {
  it('ordena por data de referência mais antiga primeiro (dias sem movimentação decrescente)', () => {
    const p1 = { processo_id: 1, data_realizado: '2026-10-10' };
    const p2 = { processo_id: 2, data_realizado: '2026-09-01' };
    const p3 = { processo_id: 3, data_realizado: '2026-10-01' };

    const sorted = sortCriticalProcesses([p1, p2, p3]);
    expect(sorted.map((p) => p.processo_id)).toEqual([2, 3, 1]);
  });

  it('usa data_inicio como referência quando data_realizado for ausente', () => {
    const p1 = { processo_id: 1, data_realizado: '2026-10-10' };
    const p2 = {
      processo_id: 2,
      data_realizado: null,
      data_inicio: '2026-08-01',
    };

    const sorted = sortCriticalProcesses([p1, p2]);
    expect(sorted.map((p) => p.processo_id)).toEqual([2, 1]);
  });

  it('usa processo_id decrescente como desempate', () => {
    const p1 = { processo_id: 10, data_realizado: '2026-10-01' };
    const p2 = { processo_id: 20, data_realizado: '2026-10-01' };

    const sorted = sortCriticalProcesses([p1, p2]);
    expect(sorted.map((p) => p.processo_id)).toEqual([20, 10]);
  });

  it('posiciona processos sem nenhuma data no final', () => {
    const p1 = { processo_id: 1, data_realizado: null, data_inicio: null };
    const p2 = { processo_id: 2, data_realizado: '2026-10-01' };

    const sorted = sortCriticalProcesses([p1, p2]);
    expect(sorted.map((p) => p.processo_id)).toEqual([2, 1]);
  });
});

describe('enrichProcess', () => {
  it('retorna null se o processo for nulo ou indefinido', () => {
    expect(enrichProcess(null)).toBeNull();
    expect(enrichProcess(undefined)).toBeNull();
  });

  it('resolve cliente e responsável a partir dos mapas fornecidos', () => {
    const clients = new Map([[1, 'João Santos']]);
    const employees = new Map([[2, 'Alexandre Carreiro']]);
    const raw = {
      processo_id: 10,
      titulo: 'Processo X',
      cliente_id: 1,
      funcionario_id: 2,
    };

    const enriched = enrichProcess(raw, clients, employees);
    expect(enriched.cliente).toBe('João Santos');
    expect(enriched.responsavel).toBe('Alexandre Carreiro');
  });

  it('usa identificador numérico como fallback quando não encontra nos mapas', () => {
    const raw = {
      processo_id: 10,
      titulo: 'Processo X',
      cliente_id: 99,
      funcionario_id: 88,
    };

    const enriched = enrichProcess(raw);
    expect(enriched.cliente).toBe('Cliente #99');
    expect(enriched.responsavel).toBe('Responsável #88');
  });

  it('usa textos descritivos quando IDs forem nulos', () => {
    const raw = {
      processo_id: 10,
      titulo: 'Processo X',
      cliente_id: null,
      funcionario_id: null,
    };

    const enriched = enrichProcess(raw);
    expect(enriched.cliente).toBe('Sem cliente');
    expect(enriched.responsavel).toBe('Sem responsável');
  });
});
