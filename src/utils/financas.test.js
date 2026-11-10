import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  agruparDespesasPorCategoria,
  agruparFluxoCaixaPorMes,
  calcularIndicadoresFinanceiros,
  calcularResumoFinanceiro,
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyNumber,
  formatDateToBr,
  formatDateToIso,
  formatStatusLabel,
  getStatusConcluido,
  isStatusConcluido,
  obterDataEfetivaIso,
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

  test.each([
    [13500, '13.500,00'],
    [250.5, '250,50'],
    [0, '0,00'],
    [null, '0,00'],
    [undefined, '0,00'],
    ['invalido', '0,00'],
  ])('formatCurrencyNumber(%s) deve retornar %s', (value, expected) => {
    expect(formatCurrencyNumber(value)).toBe(expected);
  });

  test.each([
    [0, 'R$ 0k'],
    [null, 'R$ 0k'],
    [undefined, 'R$ 0k'],
    ['abc', 'R$ 0k'],
    [5500, 'R$ 5.5k'],
    [11000, 'R$ 11k'],
    [16500, 'R$ 16.5k'],
    [22000, 'R$ 22k'],
    [450, 'R$ 450'],
  ])('formatCompactCurrency(%s) deve retornar %s', (value, expected) => {
    expect(formatCompactCurrency(value)).toBe(expected);
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

  describe('obterDataEfetivaIso', () => {
    it('prioriza data de pagamento para itens realizados e vencimento para não realizados', () => {
      expect(obterDataEfetivaIso(null)).toBe('');
      expect(
        obterDataEfetivaIso({
          status: 'realizado',
          data_vencimento: '2026-03-10',
          data_pagamento: '2026-11-07T14:00:00',
        })
      ).toBe('2026-11-07');
      expect(
        obterDataEfetivaIso({
          status: 'realizado',
          dataVencimento: '10/03/2026',
        })
      ).toBe('2026-03-10');
      expect(
        obterDataEfetivaIso({
          status: 'pendente',
          data_vencimento: '2026-03-10',
          data_pagamento: '2026-11-07',
        })
      ).toBe('2026-03-10');
      expect(
        obterDataEfetivaIso({
          status: 'atrasado',
          data: '15/04/2026',
        })
      ).toBe('2026-04-15');
    });
  });

  describe('calcularIndicadoresFinanceiros', () => {
    it('calcula indicadores em regime de caixa a partir do resumoBackend quando lancamentos está vazio', () => {
      const resumoBackend = {
        realizado: { total_entradas: 13500, total_saidas: 4230 },
        pendente: { total_entradas: 5200, total_saidas: 800 },
        atrasado: { total_entradas: 2000, total_saidas: 500 },
      };

      expect(calcularIndicadoresFinanceiros([], resumoBackend)).toEqual({
        receitaMes: 13500,
        despesasMes: 4230,
        saldoLiquido: 9270,
        aReceber: 7200,
      });
    });

    it('trata campos ausentes no resumoBackend usando 0 como fallback', () => {
      const resumoParcial = {
        realizado: {},
      };
      expect(calcularIndicadoresFinanceiros([], resumoParcial)).toEqual({
        receitaMes: 0,
        despesasMes: 0,
        saldoLiquido: 0,
        aReceber: 0,
      });
    });

    it('considera apenas entradas e despesas realizadas no mês de referência pela data_pagamento e soma A Receber pendente/atrasado', () => {
      const itens = [
        {
          tipo: 'entrada',
          valor: 5000,
          status: 'realizado',
          data_pagamento: '2026-11-05',
          data_vencimento: '2026-11-05',
        },
        {
          tipo: 'entrada',
          valor: 8500,
          status: 'Realizado',
          data_pagamento: '2026-11-12',
          data_vencimento: '2026-10-15',
        },
        {
          tipo: 'entrada',
          valor: 9999,
          status: 'realizado',
          data_pagamento: '2026-06-10',
          data_vencimento: '2026-06-10',
        },
        {
          tipo: 'entrada',
          valor: 4200,
          status: 'pendente',
          data_vencimento: '2026-11-20',
        },
        {
          tipo: 'entrada',
          valor: 3000,
          status: 'atrasado',
          data_vencimento: '2026-03-10',
        },
        {
          tipo: 'saida',
          valor: 4000,
          status: 'realizado',
          data_vencimento: '2026-03-10',
          data_pagamento: '2026-11-07',
        },
        {
          tipo: 'saida',
          valor: 230,
          status: 'realizado',
        },
        {
          tipo: 'saida',
          valor: 1500,
          status: 'realizado',
          data_pagamento: '2026-08-10',
        },
        {
          tipo: 'saida',
          valor: 900,
          status: 'pendente',
          data_vencimento: '2026-11-25',
        },
        { tipo: 'outro', valor: 'invalido', status: 'pendente' },
      ];

      expect(calcularIndicadoresFinanceiros(itens, null, '2026-11-07')).toEqual(
        {
          receitaMes: 13500,
          despesasMes: 4230,
          saldoLiquido: 9270,
          aReceber: 7200,
        }
      );
    });

    it('retorna zeros quando lancamentos não é um array', () => {
      expect(calcularIndicadoresFinanceiros(null)).toEqual({
        receitaMes: 0,
        despesasMes: 0,
        saldoLiquido: 0,
        aReceber: 0,
      });
    });
  });

  describe('agruparFluxoCaixaPorMes', () => {
    it('agrupa pontos do endpoint /lancamentos/grafico nos últimos N meses quando lancamentos está vazio', () => {
      const pontos = [
        { data: '2026-06-10', total_entradas: 12000, total_saidas: 4000 },
        { data: '2026-06-25', entradas: 3000, saidas: 500 },
        { data: '2026-08-05', total_entradas: 20000, total_saidas: 5500 },
        { data: '2026-08-06' },
        { data: 'invalida', entradas: 999, saidas: 999 },
        null,
      ];

      const serie = agruparFluxoCaixaPorMes(pontos, [], 3, '2026-08-31');
      expect(serie).toEqual([
        {
          key: '2026-06',
          label: 'Jun',
          entradas: 15000,
          saidas: 4500,
          saldo: 10500,
        },
        {
          key: '2026-07',
          label: 'Jul',
          entradas: 0,
          saidas: 0,
          saldo: 0,
        },
        {
          key: '2026-08',
          label: 'Ago',
          entradas: 20000,
          saidas: 5500,
          saldo: 14500,
        },
      ]);
    });

    it('filtra apenas lançamentos realizados e agrupa pela data_pagamento', () => {
      const lancamentos = [
        {
          data_vencimento: '2026-03-05',
          data_pagamento: '2026-07-10',
          tipo: 'entrada',
          valor: 8000,
          status: 'realizado',
        },
        {
          dataVencimentoIso: '2026-08-12',
          tipo: 'saida',
          valor: 2500,
          status: 'realizado',
        },
        {
          dataIso: '2026-08-15',
          tipo: 'entrada',
          valor: 9999,
          status: 'pendente',
        },
        {
          data_vencimento: '2026-08-20',
          tipo: 'entrada',
          valor: 'invalido',
          status: 'realizado',
        },
        { data: '15/08/2026', tipo: 'outro', valor: 100, status: 'realizado' },
        {
          data: 'invalida',
          tipo: 'entrada',
          valor: 500,
          status: 'realizado',
        },
        null,
      ];

      const serie = agruparFluxoCaixaPorMes([], lancamentos, 2, '2026-08-31');
      expect(serie).toEqual([
        {
          key: '2026-07',
          label: 'Jul',
          entradas: 8000,
          saidas: 0,
          saldo: 8000,
        },
        {
          key: '2026-08',
          label: 'Ago',
          entradas: 0,
          saidas: 2500,
          saldo: -2500,
        },
      ]);
    });

    it('aceita dataReferencia como instância de Date ou usa data atual quando não há referência válida', () => {
      const serieComDate = agruparFluxoCaixaPorMes(
        null,
        null,
        0,
        new Date('2026-05-15T12:00:00Z')
      );
      expect(serieComDate).toHaveLength(6);
      expect(serieComDate[5].key).toBe('2026-05');

      const serieRefInvalida = agruparFluxoCaixaPorMes([], [], 3, 'invalida');
      expect(serieRefInvalida).toHaveLength(3);
    });
  });

  describe('agruparDespesasPorCategoria', () => {
    it('soma apenas saídas realizadas maiores que zero, respeita período por data_pagamento e filtros de valor', () => {
      const lancamentos = [
        {
          tipo: 'entrada',
          categoria: 'Honorários',
          valor: 10000,
          status: 'realizado',
        },
        {
          tipo: 'saida',
          categoria: 'Despesas Operacionais',
          valor: 3000,
          status: 'realizado',
          data_vencimento: '2026-03-01',
          data_pagamento: '2026-11-05',
        },
        {
          tipo: 'saida',
          categoria: 'Despesas Operacionais',
          valor: 1000,
          status: 'realizado',
          data_pagamento: '2026-10-10',
        },
        {
          tipo: 'saida',
          categoria: 'Despesas Operacionais',
          valor: 7777,
          status: 'pendente',
          data_vencimento: '2026-11-10',
        },
        {
          tipo: 'saida',
          categoria: 'Fora do Período',
          valor: 5000,
          status: 'realizado',
          data_pagamento: '2025-01-10',
        },
        {
          tipo: 'saida',
          categoria: 'Custas',
          valor: 1000,
          status: 'realizado',
          data_pagamento: '2026-09-20',
        },
        {
          tipo: 'saida',
          categoria: '   ',
          valor: 500,
          status: 'realizado',
          data_pagamento: '2026-11-01',
        },
        {
          tipo: 'saida',
          categoria: 'Zero',
          valor: 0,
          status: 'realizado',
          data_pagamento: '2026-11-01',
        },
        null,
      ];

      const noPeriodo = agruparDespesasPorCategoria(lancamentos, {
        periodoMeses: 3,
        dataReferencia: '2026-11-07',
      });
      expect(noPeriodo).toHaveLength(3);
      expect(noPeriodo[0].categoria).toBe('Despesas Operacionais');
      expect(noPeriodo[0].valor).toBe(4000);
      expect(noPeriodo[1].categoria).toBe('Custas');
      expect(noPeriodo[1].valor).toBe(1000);
      expect(noPeriodo[2].categoria).toBe('Outros');
      expect(noPeriodo[2].valor).toBe(500);

      const filtradas = agruparDespesasPorCategoria(lancamentos, {
        valorMin: '800',
        valorMax: '2000',
        periodoMeses: 3,
        dataReferencia: '2026-11-07',
      });
      expect(filtradas).toHaveLength(2);
      expect(filtradas.reduce((acc, i) => acc + i.valor, 0)).toBe(2000);
    });

    it('retorna array vazio quando não há despesas realizadas ou quando entrada é inválida', () => {
      expect(agruparDespesasPorCategoria(null)).toEqual([]);
      expect(
        agruparDespesasPorCategoria([
          { tipo: 'entrada', valor: 500, status: 'realizado' },
          { tipo: 'saida', valor: 500, status: 'pendente' },
        ])
      ).toEqual([]);
    });
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

    it('formata array de validação do FastAPI 422 com mensagens amigáveis e fallback para outros campos', () => {
      const pydanticError = {
        detail: [
          {
            loc: ['body', 'categoria_id'],
            msg: 'Input should be a valid integer',
          },
          { loc: ['body', 'valor'], msg: 'value is not a valid float' },
          { loc: ['body', 'campo_extra'], msg: 'invalid field' },
        ],
      };
      expect(parseApiError(pydanticError)).toBe(
        'Por favor, selecione ou informe uma categoria.; Por favor, informe um valor válido maior que zero.; campo_extra: invalid field'
      );
    });

    it('retorna JSON serializado caso detail seja objeto', () => {
      expect(parseApiError({ detail: { custom: 'erro' } })).toBe(
        '{"custom":"erro"}'
      );
    });
  });

  describe('toLancamento e toApiLancamento', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

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
      const dataReferencia = new Date(2026, 9, 10);
      const frontItem = {
        tipo: 'saida',
        titulo: '  Internet  ',
        descricao: '  Mensalidade  ',
        valor: '150.50',
        dataVencimentoIso: '2026-10-10',
        categoria: 'Despesas',
        status: 'pendente',
      };

      const apiPayload = toApiLancamento(frontItem, dataReferencia);
      expect(apiPayload.tipo).toBe('s');
      expect(apiPayload.titulo).toBe('Internet');
      expect(apiPayload.descricao).toBe('Mensalidade');
      expect(apiPayload.valor).toBe(150.5);
      expect(apiPayload.data_vencimento).toBe('2026-10-10');
      expect(apiPayload.status).toBe('Pendente');
      expect(apiPayload.recorrente).toBe(false);
    });

    test.each([
      [
        'vencimento igual à data de referência',
        '2026-10-10',
        'pendente',
        'Pendente',
      ],
      [
        'vencimento posterior à data de referência',
        '2026-10-20',
        'pendente',
        'Pendente',
      ],
      [
        'vencimento anterior à data de referência',
        '2026-10-01',
        'pendente',
        'Atrasado',
      ],
      [
        'status realizado preservado mesmo com vencimento anterior',
        '2026-10-01',
        'realizado',
        'Realizado',
      ],
    ])(
      'calcula status correto no payload da API (%s)',
      (_cenario, dataVencimentoIso, statusEntrada, statusEsperado) => {
        const dataReferencia = new Date(2026, 9, 10);
        const apiPayload = toApiLancamento(
          {
            tipo: 'saida',
            dataVencimentoIso,
            status: statusEntrada,
          },
          dataReferencia
        );
        expect(apiPayload.status).toBe(statusEsperado);
      }
    );

    it('permite passar dataReferencia personalizada para toApiLancamento', () => {
      const frontItem = {
        tipo: 'entrada',
        dataVencimentoIso: '2026-10-10',
      };
      const pendente = toApiLancamento(frontItem, new Date('2026-10-01'));
      expect(pendente.status).toBe('Pendente');

      const atrasado = toApiLancamento(frontItem, new Date('2026-10-15'));
      expect(atrasado.status).toBe('Atrasado');
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
      const apiObj = toApiLancamento({ dataPagamento: 'T' });
      expect(apiObj.data_pagamento).toBe('T');
    });
  });

  it('cobre rawVencimento fallback em toApiLancamento', () => {
    const apiObj = toApiLancamento({ dataVencimento: 'T' });
    expect(apiObj.data_vencimento).toBe('T');
  });

  it('cobre data_pagamento em toApiLancamento', () => {
    const apiObj = toApiLancamento({ data_pagamento: '2026-10-10' });
    expect(apiObj.data_pagamento).toBe('2026-10-10');
  });

  it('cobre toLancamento fallbacks (vencimento e categoria)', () => {
    const front = toLancamento({ data: '2026-10-10' });
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
    expect(formatDateToBr('2026-08')).toBe('2026-08');
  });

  it('cobre detail array com string', () => {
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
      [{ data: '2026-11-11' }, '11/11/2026', '2026-11-11'],
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
