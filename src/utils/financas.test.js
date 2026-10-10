import { describe, expect, it } from 'vitest';
import {
  calcularResumoFinanceiro,
  formatCurrency,
  formatDateToBr,
  formatDateToIso,
  formatStatusLabel,
  getStatusConcluido,
  isStatusConcluido,
  parseApiError,
  toApiLancamento,
  toLancamento,
  verificarStatusPorVencimento,
} from './financas';

describe('financas utils', () => {
  test.each([
    [5000, 'R$ 5.000,00'],
    [250.5, 'R$ 250,50'],
    [0, 'R$ 0,00'],
    [null, 'R$ 0,00'],
    [undefined, 'R$ 0,00'],
    ['abc', 'R$ 0,00'],
    [10.5, 'R$ 10,50'],
  ])('formatCurrency(%s) deve retornar %s', (value, expected) => {
    expect(formatCurrency(value)).toBe(expected);
  });

  describe('calcularResumoFinanceiro', () => {
    test.each([
      [
        [
          { tipo: 'entrada', valor: 1000 },
          { tipo: 'entrada', valor: 500 },
          { tipo: 'saida', valor: 300 },
        ],
        { totalEntradas: 1500, totalSaidas: 300, saldo: 1200 },
      ],
      [
        [
          { tipo: 'entrada', valor: 'abc' },
          { tipo: 'outro', valor: 100 },
        ],
        { totalEntradas: 0, totalSaidas: 0, saldo: 0 },
      ],
      [[], { totalEntradas: 0, totalSaidas: 0, saldo: 0 }],
    ])(
      'calcularResumoFinanceiro(%j) deve retornar %j',
      (lancamentos, expected) => {
        expect(calcularResumoFinanceiro(lancamentos)).toEqual(expected);
      }
    );
  });

  describe('formatDate helpers', () => {
    test.each([
      ['2026-09-15', '15/09/2026'],
      ['15/09/2026', '15/09/2026'],
      ['', ''],
      ['2026-08', '2026-08'],
    ])('formatDateToBr(%s) deve retornar %s', (input, expected) => {
      expect(formatDateToBr(input)).toBe(expected);
    });

    test.each([
      ['15/09/2026', '2026-09-15'],
      ['2026-09-15', '2026-09-15'],
      ['', ''],
    ])('formatDateToIso(%s) deve retornar %s', (input, expected) => {
      expect(formatDateToIso(input)).toBe(expected);
    });
  });

  describe('verificarStatusPorVencimento', () => {
    const hoje = new Date(2026, 8, 15); // 15 de setembro de 2026

    it('retorna atrasado se a data de vencimento for anterior à data de referência', () => {
      const item = { dataVencimentoIso: '2026-09-10' };
      expect(verificarStatusPorVencimento(item, hoje)).toBe('atrasado');

      const itemBr = { dataVencimento: '10/09/2026' };
      expect(verificarStatusPorVencimento(itemBr, hoje)).toBe('atrasado');
    });

    it('retorna pendente se a data de vencimento for hoje ou futura', () => {
      const itemHoje = { dataVencimentoIso: '2026-09-15' };
      expect(verificarStatusPorVencimento(itemHoje, hoje)).toBe('pendente');

      const itemFuturo = { dataVencimentoIso: '2026-09-20' };
      expect(verificarStatusPorVencimento(itemFuturo, hoje)).toBe('pendente');
    });

    it('utiliza dataIso ou data caso dataVencimento não esteja definida', () => {
      const item = { dataIso: '2026-09-01' };
      expect(verificarStatusPorVencimento(item, hoje)).toBe('atrasado');
    });

    it('retorna pendente se o item não possuir nenhuma data válida', () => {
      expect(verificarStatusPorVencimento({})).toBe('pendente');
      expect(verificarStatusPorVencimento(null)).toBe('pendente');
    });
  });

  describe('status helpers (isStatusConcluido, getStatusConcluido, formatStatusLabel)', () => {
    test.each([
      ['realizado', true],
      ['REALIZADO', true],
      ['pendente', false],
      ['atrasado', false],
      [null, false],
    ])('isStatusConcluido(%s) deve retornar %s', (status, expected) => {
      expect(isStatusConcluido(status)).toBe(expected);
    });

    it('getStatusConcluido retorna recebido para entrada e realizado para saida', () => {
      expect(getStatusConcluido('entrada')).toBe('realizado');
      expect(getStatusConcluido('ENTRADA')).toBe('realizado');
      expect(getStatusConcluido('saida')).toBe('realizado');
      expect(getStatusConcluido('SAIDA')).toBe('realizado');
    });

    it('formatStatusLabel formata corretamente o label baseado no tipo e status', () => {
      expect(formatStatusLabel('realizado', 'entrada')).toBe('Realizado');
      expect(formatStatusLabel('realizado', 'entrada')).toBe('Realizado');
      expect(formatStatusLabel('realizado', 'saida')).toBe('Realizado');
      expect(formatStatusLabel('realizado', 'saida')).toBe('Realizado');
      expect(formatStatusLabel('atrasado', 'entrada')).toBe('Atrasado');
      expect(formatStatusLabel('atrasado', 'saida')).toBe('Atrasado');
      expect(formatStatusLabel('pendente', 'entrada')).toBe('Pendente');
      expect(formatStatusLabel('pendente', 'saida')).toBe('Pendente');
    });
  });

  describe('parseApiError', () => {
    it('retorna mensagem padrão para erro nulo ou vazio', () => {
      expect(parseApiError(null)).toBe('Ocorreu um erro na requisição.');
      expect(parseApiError(undefined, 'Erro padrão')).toBe('Erro padrão');
    });

    it('retorna string de detalhe diretamente', () => {
      expect(parseApiError({ detail: 'Detalhe direto' })).toBe(
        'Detalhe direto'
      );
      expect(parseApiError('Erro em texto')).toBe('Erro em texto');
    });

    it('formata array de validação do FastAPI 422 legivelmente', () => {
      const pydanticError = {
        detail: [
          { loc: ['body', 'data_vencimento'], msg: 'field required' },
          { loc: ['body', 'valor'], msg: 'value is not a valid float' },
        ],
      };
      expect(parseApiError(pydanticError)).toBe(
        'data_vencimento: field required; valor: value is not a valid float'
      );
    });

    it('retorna JSON serializado caso detail seja objeto', () => {
      expect(parseApiError({ detail: { custom: 'erro' } })).toBe(
        '{"custom":"erro"}'
      );
    });
  });

  describe('toLancamento e toApiLancamento', () => {
    it('converte resposta da API para modelo do frontend', () => {
      const apiItem = {
        lancamento_id: 15,
        tipo: 's',
        titulo: 'Aluguel',
        descricao: 'Sala comercial',
        valor: 2000,
        data_vencimento: '2026-10-01',
        data_pagamento: null,
        categoria: 'Despesas',
        status: 'Realizado',
        recorrente: true,
      };

      const front = toLancamento(apiItem);
      expect(front.id).toBe(15);
      expect(front.lancamento_id).toBe(15);
      expect(front.tipo).toBe('saida');
      expect(front.status).toBe('realizado');
      expect(front.data).toBe('01/10/2026');
      expect(front.dataIso).toBe('2026-10-01');
      expect(front.dataVencimento).toBe('01/10/2026');
      expect(front.recorrente).toBe(true);
    });

    it('retorna null para item nulo em toLancamento', () => {
      expect(toLancamento(null)).toBeNull();
    });

    it('converte dados do formulário frontend para payload da API', () => {
      const frontItem = {
        tipo: 'saida',
        titulo: '  Internet  ',
        descricao: '  Mensalidade  ',
        valor: '150.50',
        dataVencimentoIso: '2026-10-10',
        categoria: 'Despesas',
        status: 'pendente',
      };

      const apiPayload = toApiLancamento(frontItem);
      expect(apiPayload.tipo).toBe('s');
      expect(apiPayload.titulo).toBe('Internet');
      expect(apiPayload.descricao).toBe('Mensalidade');
      expect(apiPayload.valor).toBe(150.5);
      expect(apiPayload.data_vencimento).toBe('2026-10-10');
      expect(apiPayload.status).toBe('Pendente');
      expect(apiPayload.recorrente).toBe(false);
    });

    it('converte resposta da API com data_pagamento para modelo do frontend', () => {
      const apiItem = {
        lancamento_id: 16,
        tipo: 'e',
        titulo: 'Consultoria',
        valor: 3500,
        data_vencimento: '2026-10-15',
        data_pagamento: '2026-10-10',
        categoria: 'Honorários',
        status: 'Realizado',
        recorrente: false,
      };

      const front = toLancamento(apiItem);
      expect(front.id).toBe(16);
      expect(front.data).toBe('10/10/2026');
      expect(front.dataIso).toBe('2026-10-10');
      expect(front.dataPagamento).toBe('10/10/2026');
      expect(front.dataPagamentoIso).toBe('2026-10-10');
      expect(front.data_pagamento).toBe('2026-10-10');
      expect(front.dataVencimento).toBe('15/10/2026');
      expect(front.dataVencimentoIso).toBe('2026-10-15');
      expect(front.data_vencimento).toBe('2026-10-15');
    });

    it('converte dados com data_pagamento e data_vencimento atualizados para payload da API', () => {
      const frontItem = {
        id: 16,
        tipo: 'entrada',
        titulo: 'Consultoria Atualizada',
        valor: 4000,
        dataPagamentoIso: '2026-10-12',
        dataVencimentoIso: '2026-10-18',
        categoria: 'Honorários',
        status: 'Realizado',
      };

      const apiPayload = toApiLancamento(frontItem);
      expect(apiPayload.data_pagamento).toBe('2026-10-12');
      expect(apiPayload.data_vencimento).toBe('2026-10-18');
    });

    it('formata datas em formato brasileiro para ISO no payload da API', () => {
      const frontItem = {
        tipo: 'saida',
        titulo: 'Aluguel',
        valor: 2500,
        dataPagamento: '05/11/2026',
        dataVencimento: '10/11/2026',
        categoria: 'Despesas',
        status: 'Realizado',
      };

      const apiPayload = toApiLancamento(frontItem);
      expect(apiPayload.data_pagamento).toBe('2026-11-05');
      expect(apiPayload.data_vencimento).toBe('2026-11-10');
    });

    it('retorna objeto vazio para item nulo em toApiLancamento', () => {
      expect(toApiLancamento(null)).toEqual({});
    });
  });
  describe('parseApiError branches', () => {
    it('cobre fallback stringify em detail array (quando não tem msg)', () => {
      const err = { detail: [{ noMsg: true }] };
      const msg = parseApiError(err);
      expect(msg).toContain('noMsg');
    });

    it('cobre fallback detail como objeto', () => {
      const err = { detail: { chave: 'valor' } };
      const msg = parseApiError(err);
      expect(msg).toContain('valor');
    });

    it('cobre error.message sendo string', () => {
      const err = { message: 'Erro simples em string' };
      const msg = parseApiError(err);
      expect(msg).toBe('Erro simples em string');
    });

    it('cobre defaultMessage', () => {
      const err = {};
      const msg = parseApiError(err);
      expect(msg).toBe('Ocorreu um erro na requisição.');
    });
  });

  describe('mais branches para 100% de cobertura', () => {
    it('cobre detail array vazio após map/filter', () => {
      const err = { detail: [() => {}] };
      const msg = parseApiError(err);
      expect(msg).toBe('[null]');
    });

    it('cobre fallbacks de toApiLancamento (titulo, valor, categoria)', () => {
      const apiObj = toApiLancamento({ tipo: 'Entrada' });
      expect(apiObj.titulo).toBe('');
      expect(apiObj.valor).toBe(0);
      expect(apiObj.categoria).toBe('Honorários');
    });

    it('cobre rawPagamento fallback em toApiLancamento', () => {
      // para formatDateToIso(rawPagamento) ser falsy e usar || rawPagamento
      const apiObj = toApiLancamento({ dataPagamento: 'T' });
      expect(apiObj.data_pagamento).toBe('T');
    });
  });

  it('cobre rawVencimento fallback em toApiLancamento', () => {
    // para formatDateToIso(rawVencimento) ser falsy e usar || rawVencimento
    const apiObj = toApiLancamento({ dataVencimento: 'T' });
    expect(apiObj.data_vencimento).toBe('T');
  });

  it('cobre data_pagamento em toApiLancamento', () => {
    // item.dataPagamentoIso e item.dataPagamento ausentes, mas item.data_pagamento presente
    const apiObj = toApiLancamento({ data_pagamento: '2026-10-10' });
    expect(apiObj.data_pagamento).toBe('2026-10-10');
  });

  it('cobre toLancamento fallbacks (vencimento e categoria)', () => {
    // para dataVencimentoIso || dataIso, etc.
    const front = toLancamento({ data: '2026-10-10' }); // sem vencimento explicit
    expect(front.dataVencimentoIso).toBe('2026-10-10');
    expect(front.categoria).toBe('Outros');
  });

  it('cobre number e undefined em formatCurrency', () => {
    expect(formatCurrency(10.5)).toContain('10,50');
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
  });

  it('cobre fallback de loc vazio e fallback parseApiError msg', () => {
    const err = { detail: [{ msg: 'Mensagem sem loc' }] };
    expect(parseApiError(err)).toBe('Mensagem sem loc');
  });

  it('cobre formatDateToBr partes faltantes', () => {
    // line 14: !year || !month || !day
    expect(formatDateToBr('2026-08')).toBe('2026-08');
  });

  it('cobre detail array com string', () => {
    // line 108: typeof d === 'string'
    expect(parseApiError({ detail: ['Erro direto'] })).toBe('Erro direto');
  });

  describe('toLancamento datas fallbacks', () => {
    test.each([
      [{ data_vencimento: '2026-10-10' }, '2026-10-10'],
      [{ dataVencimentoIso: '2026-10-11' }, '2026-10-11'],
      [{ dataVencimento: '12/10/2026' }, '2026-10-12'],
      [{ data: '2026-10-13' }, '2026-10-13'],
      [{}, ''],
    ])('toLancamento fallback vencimento %j -> %s', (apiItem, expectedIso) => {
      const front = toLancamento({ ...apiItem, tipo: 'entrada' });
      expect(front.dataVencimentoIso).toBe(expectedIso);
    });

    test.each([
      // Para forçar (vencimentoBr || dataBr) na linha 175
      // Para isso, rawVencimento deve ser falsy (vencimentoBr = ''), e dataBr deve ser truthy.
      // Se rawData for truthy e formatar br, mas rawPagamento for falsy.
      [{ data: '2026-11-11' }, '11/11/2026', '2026-11-11'],
      // Se data_pagamento presente
      [{ data_pagamento: '2026-12-12' }, '12/12/2026', '2026-12-12'],
    ])(
      'toLancamento fallbacks gerais %j -> %s, %s',
      (apiItem, expectedData, expectedDataIso) => {
        const front = toLancamento({ ...apiItem, tipo: 'entrada' });
        expect(front.data).toBe(expectedData);
        expect(front.dataIso).toBe(expectedDataIso);
      }
    );
  });
});
