import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarFinancas,
  atualizarLancamento,
  criarCategoria,
  criarFinancas,
  criarLancamento,
  excluirCategoria,
  excluirFinancas,
  excluirLancamento,
  listarCategorias,
  listarFinancas,
  listarLancamentos,
  mudarStatusLancamento,
  obterResumoFinancas,
} from './financas';

const respostaJson = (dados, configuracao = {}) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(dados),
  ...configuracao,
});

const respostaComErro = (detail) => ({
  ok: false,
  json: vi.fn().mockResolvedValue({ detail }),
});

const respostaComErroSemJson = () => ({
  ok: false,
  json: vi.fn().mockRejectedValue(new Error('Resposta inválida')),
});

describe('serviço de finanças', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 10));
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('listarFinancas', () => {
    it('retorna os lançamentos mapeados recebidos pela API', async () => {
      const lancamentosBackend = [
        {
          lancamento_id: 1,
          titulo: 'Honorários',
          valor: 5000,
          tipo: 'e',
          data_vencimento: '2026-08-05',
          categoria: 'Honorários',
          status: 'Realizado',
        },
        {
          lancamento_id: 2,
          titulo: 'Custas',
          valor: 250,
          tipo: 's',
          data_vencimento: '2026-08-10',
          categoria: 'Custas',
          status: 'Pendente',
        },
      ];
      fetch.mockResolvedValue(respostaJson(lancamentosBackend));

      const resultado = await listarFinancas();
      expect(resultado).toHaveLength(2);
      expect(resultado[0].id).toBe(1);
      expect(resultado[0].tipo).toBe('entrada');
      expect(resultado[0].status).toBe('realizado');
      expect(resultado[1].id).toBe(2);
      expect(resultado[1].tipo).toBe('saida');
      expect(resultado[1].status).toBe('pendente');

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/lancamentos/', {
        cache: 'no-store',
      });
    });

    it.each([
      ['resposta HTTP inválida', () => respostaComErro('Falha interna')],
      ['falha de rede', () => Promise.reject(new Error('NetworkError'))],
      [
        'JSON inválido',
        () =>
          Promise.resolve({
            ok: true,
            json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
          }),
      ],
    ])(
      'retorna uma lista vazia em caso de %s',
      async (_descricao, resposta) => {
        fetch.mockReturnValueOnce(resposta());

        await expect(listarFinancas()).resolves.toEqual([]);
      }
    );

    it('possui o alias listarLancamentos apontando para listarFinancas', () => {
      expect(listarLancamentos).toBe(listarFinancas);
    });
  });

  describe('criarFinancas', () => {
    const novoItem = {
      tipo: 'entrada',
      titulo: 'Honorários Iniciais',
      valor: 5000,
      data_vencimento: '2026-10-15',
      categoria: 'Honorários',
    };

    it('envia os dados com POST e retorna o lançamento cadastrado formatado', async () => {
      const respostaApi = {
        lancamento_id: 10,
        tipo: 'e',
        titulo: 'Honorários Iniciais',
        valor: 5000,
        data_vencimento: '2026-10-15',
        categoria: 'Honorários',
        status: 'Pendente',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const criado = await criarFinancas(novoItem);
      expect(criado.id).toBe(10);
      expect(criado.tipo).toBe('entrada');
      expect(criado.status).toBe('pendente');
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/lancamentos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'e',
          titulo: 'Honorários Iniciais',
          descricao: null,
          valor: 5000,
          data_vencimento: '2026-10-15',
          data_pagamento: null,
          categoria: 'Honorários',
          categoria_id: null,
          cliente_id: null,
          status: 'Pendente',
          recorrente: false,
        }),
      });
    });

    it('lança erro com a mensagem retornada pela API em caso de falha', async () => {
      fetch.mockResolvedValue(respostaComErro('Dados inválidos.'));

      await expect(criarFinancas(novoItem)).rejects.toThrow('Dados inválidos.');
    });

    it('formata adequadamente erros 422 retornados em formato de array pelo FastAPI', async () => {
      fetch.mockResolvedValue(
        respostaComErro([
          {
            loc: ['body', 'data_vencimento'],
            msg: 'Campo obrigatório',
            type: 'value_error.missing',
          },
        ])
      );

      await expect(criarFinancas(novoItem)).rejects.toThrow(
        'data_vencimento: Campo obrigatório'
      );
    });

    it('lança erro padrão quando a resposta de falha não traz detalhe estruturado', async () => {
      fetch.mockResolvedValue(respostaComErroSemJson());

      await expect(criarFinancas(novoItem)).rejects.toThrow(
        'Não foi possível cadastrar o lançamento.'
      );
    });

    it('possui o alias criarLancamento apontando para criarFinancas', () => {
      expect(criarLancamento).toBe(criarFinancas);
    });
  });

  describe('atualizarFinancas', () => {
    const dadosAtualizados = {
      id: 1,
      tipo: 'entrada',
      titulo: 'Honorários Atualizados',
      valor: 7000,
      data_vencimento: '2026-10-15',
      categoria: 'Honorários',
    };

    it('envia os dados com PUT e retorna o lançamento atualizado', async () => {
      const respostaApi = {
        lancamento_id: 1,
        tipo: 'e',
        titulo: 'Honorários Atualizados',
        valor: 7000,
        data_vencimento: '2026-10-15',
        categoria: 'Honorários',
        status: 'Pendente',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const atualizado = await atualizarFinancas(1, dadosAtualizados);
      expect(atualizado.id).toBe(1);
      expect(atualizado.titulo).toBe('Honorários Atualizados');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/lancamentos/1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tipo: 'e',
            titulo: 'Honorários Atualizados',
            descricao: null,
            valor: 7000,
            data_vencimento: '2026-10-15',
            data_pagamento: null,
            categoria: 'Honorários',
            categoria_id: null,
            cliente_id: null,
            status: 'Pendente',
            recorrente: false,
          }),
        }
      );
    });

    it('atualiza com sucesso data_vencimento e data_pagamento enviando payload correto à API', async () => {
      const dadosComDatas = {
        id: 5,
        tipo: 'entrada',
        titulo: 'Honorários Atualizados',
        valor: 4500,
        data_vencimento: '2026-10-25',
        data_pagamento: '2026-10-20',
        categoria: 'Honorários',
        status: 'Realizado',
      };
      const respostaApi = {
        lancamento_id: 5,
        tipo: 'e',
        titulo: 'Honorários Atualizados',
        valor: 4500,
        data_vencimento: '2026-10-25',
        data_pagamento: '2026-10-20',
        categoria: 'Honorários',
        status: 'Realizado',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const atualizado = await atualizarFinancas(5, dadosComDatas);
      expect(atualizado.id).toBe(5);
      expect(atualizado.data_vencimento).toBe('2026-10-25');
      expect(atualizado.data_pagamento).toBe('2026-10-20');
      expect(atualizado.dataVencimento).toBe('25/10/2026');
      expect(atualizado.dataPagamento).toBe('20/10/2026');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/lancamentos/5',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tipo: 'e',
            titulo: 'Honorários Atualizados',
            descricao: null,
            valor: 4500,
            data_vencimento: '2026-10-25',
            data_pagamento: '2026-10-20',
            categoria: 'Honorários',
            categoria_id: null,
            cliente_id: null,
            status: 'Realizado',
            recorrente: false,
          }),
        }
      );
    });

    it('lança erro com a mensagem da API quando a atualização falha', async () => {
      fetch.mockResolvedValue(respostaComErro('Lançamento não encontrado.'));

      await expect(atualizarFinancas(99, dadosAtualizados)).rejects.toThrow(
        'Lançamento não encontrado.'
      );
    });

    it('lança erro padrão quando a resposta com erro não possui JSON legível', async () => {
      fetch.mockResolvedValue(respostaComErroSemJson());

      await expect(atualizarFinancas(1, dadosAtualizados)).rejects.toThrow(
        'Não foi possível atualizar o lançamento.'
      );
    });

    it('possui o alias atualizarLancamento apontando para atualizarFinancas', () => {
      expect(atualizarLancamento).toBe(atualizarFinancas);
    });
  });

  describe('excluirFinancas', () => {
    it('executa a exclusão via DELETE no endpoint esperado', async () => {
      fetch.mockResolvedValue({ ok: true });

      await expect(excluirFinancas(3)).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/lancamentos/3',
        {
          method: 'DELETE',
        }
      );
    });

    it('lança erro caso a exclusão retorne falha HTTP com detalhe', async () => {
      fetch.mockResolvedValue(respostaComErro('Não autorizado.'));

      await expect(excluirFinancas(3)).rejects.toThrow('Não autorizado.');
    });

    it('lança erro padrão se a exclusão falhar sem JSON legível', async () => {
      fetch.mockResolvedValue(respostaComErroSemJson());

      await expect(excluirFinancas(3)).rejects.toThrow(
        'Não foi possível excluir o lançamento.'
      );
    });

    it('possui o alias excluirLancamento apontando para excluirFinancas', () => {
      expect(excluirLancamento).toBe(excluirFinancas);
    });
  });

  describe('mudarStatusLancamento', () => {
    it('envia status formatado via PATCH e retorna o lançamento atualizado', async () => {
      const respostaApi = {
        lancamento_id: 1,
        tipo: 'e',
        status: 'Realizado',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const atualizado = await mudarStatusLancamento(1, 'realizado');
      expect(atualizado.id).toBe(1);
      expect(atualizado.status).toBe('realizado');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/lancamentos/1/alternar-status',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('suporta passar o payload já como objeto', async () => {
      const respostaApi = {
        lancamento_id: 2,
        tipo: 's',
        status: 'Atrasado',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const res = await mudarStatusLancamento(2, { status: 'atrasado' });
      expect(res.id).toBe(2);
      expect(res.status).toBe('atrasado');
    });

    it('lança erro com mensagem da API quando a requisição falha', async () => {
      fetch.mockResolvedValue(respostaComErro('Erro de validação.'));

      await expect(mudarStatusLancamento(1, 'realizado')).rejects.toThrow(
        'Erro de validação.'
      );
    });

    it('lança erro padrão se o erro não contiver JSON legível', async () => {
      fetch.mockResolvedValue(respostaComErroSemJson());

      await expect(mudarStatusLancamento(1, 'realizado')).rejects.toThrow(
        'Não foi possível atualizar o status do lançamento.'
      );
    });
  });
  it('cobre fallback branch em buscarFinancas (retorna [] se não for array)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) });
    const res = await listarLancamentos();
    expect(res).toEqual([]);
  });

  it('cobre branch em mudarStatusLancamento (status como objeto sem .status)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await mudarStatusLancamento(1, {}); // Passando obj vazio sem .status
    expect(fetch).toHaveBeenCalled();
  });

  describe('filtros por categoria em listarFinancas e obterResumoFinancas', () => {
    it('filtra por categoria existente mapeando para categoria_id na API', async () => {
      // Mock de /categorias-lancamento
      fetch.mockResolvedValueOnce(
        respostaJson([{ categoria_id: 10, nome_categoria: 'Consultoria' }])
      );
      // Mock de /lancamentos/
      fetch.mockResolvedValueOnce(
        respostaJson([
          {
            lancamento_id: 1,
            categoria_id: 10,
            categoria: 'Consultoria',
            titulo: 'Item 1',
          },
        ])
      );

      const res = await listarFinancas({ categoria: 'Consultoria' });
      expect(res).toHaveLength(1);
      expect(res[0].categoria).toBe('Consultoria');
    });

    it('filtra lançamentos de categoria Outros quando não há id cadastrado no backend', async () => {
      // Mock de /categorias-lancamento retornando vazio
      fetch.mockResolvedValueOnce(respostaJson([]));
      // Mock de /lancamentos/ retornando itens mistos
      fetch.mockResolvedValueOnce(
        respostaJson([
          { lancamento_id: 1, categoria_id: 1, categoria: 'Honorários' },
          { lancamento_id: 2, categoria_id: null, categoria: null },
          { lancamento_id: 3, categoria: 'Outros' },
        ])
      );

      const res = await listarFinancas({
        categoria: 'Outros',
        page: 1,
        page_size: 5,
      });

      expect(res.itens).toHaveLength(2);
      expect(res.total).toBe(2);
      expect(res.itens[0].id).toBe(2);
      expect(res.itens[1].id).toBe(3);
    });

    it('calcula o resumo de finanças para categoria Outros', async () => {
      // Mock de /categorias-lancamento dentro de listarFinancas
      fetch.mockResolvedValueOnce(respostaJson([]));
      // Mock de /lancamentos/ dentro de listarFinancas
      fetch.mockResolvedValueOnce(
        respostaJson([
          {
            lancamento_id: 1,
            categoria: 'Outros',
            tipo: 'e',
            valor: 1000,
            status: 'Realizado',
          },
          {
            lancamento_id: 2,
            categoria: 'Outros',
            tipo: 's',
            valor: 300,
            status: 'Pendente',
          },
        ])
      );

      const resumo = await obterResumoFinancas({ categoria: 'Outros' });
      expect(resumo).toBeDefined();
      expect(resumo.realizado.total_entradas).toBe(1000);
      expect(resumo.pendente.total_saidas).toBe(300);
    });

    it('retorna todos os lançamentos com categoria Outros mesmo com categoria Outros cadastrada no backend e nomes/descrições idênticos', async () => {
      // Mock de /categorias-lancamento retornando categoria "Outros" com id 5 e "Honorários" com id 1
      fetch.mockResolvedValueOnce(
        respostaJson([
          { categoria_id: 1, nome_categoria: 'Honorários' },
          { categoria_id: 5, nome_categoria: 'Outros' },
        ])
      );
      // Mock de /lancamentos/
      fetch.mockResolvedValueOnce(
        respostaJson([
          {
            lancamento_id: 1,
            categoria_id: 1,
            titulo: 'Honorários João',
            descricao: null,
          },
          {
            lancamento_id: 2,
            categoria_id: null,
            titulo: 'Lançamento Teste',
            descricao: null,
          },
          {
            lancamento_id: 3,
            categoria_id: null,
            titulo: 'Lançamento Teste',
            descricao: null,
          },
          {
            lancamento_id: 4,
            categoria_id: 5,
            titulo: 'Lançamento Teste',
            descricao: null,
          },
          {
            lancamento_id: 5,
            categoria_id: 888,
            categoria: 'Outros',
            titulo: 'Lançamento Teste',
            descricao: null,
          },
        ])
      );

      const res = await listarFinancas({
        categoria: 'Outros',
        page: 1,
        page_size: 5,
      });

      expect(res.itens).toHaveLength(4);
      expect(res.total).toBe(4);
      expect(res.itens.map((i) => i.id)).toEqual([2, 3, 4, 5]);
      expect(res.itens[0].titulo).toBe('Lançamento Teste');
      expect(res.itens[1].titulo).toBe('Lançamento Teste');
      expect(res.itens[2].titulo).toBe('Lançamento Teste');
      expect(res.itens[3].titulo).toBe('Lançamento Teste');
    });
  });

  describe('testes parametrizados de filtros e paginação em listarFinancas', () => {
    it.each([
      [
        'filtros de data (inicio e fim)',
        { inicio: '2026-01-01', fim: '2026-01-31' },
        ['inicio=2026-01-01', 'fim=2026-01-31'],
      ],
      [
        'filtros de tipo e situação',
        { tipo: 'entrada', situacao: 'pendente' },
        ['tipo=entrada', 'status=pendente'],
      ],
      [
        'filtros de categoria_id e cliente_id',
        { categoria_id: 3, cliente_id: 7 },
        ['categoria_id=3', 'cliente_id=7'],
      ],
      [
        'filtros de paginação (page e page_size)',
        { page: 2, page_size: 10 },
        ['page=2', 'page_size=10'],
      ],
      [
        'todos os filtros combinados',
        {
          inicio: '2026-02-01',
          fim: '2026-02-28',
          tipo: 'saida',
          situacao: 'realizado',
          categoria_id: 5,
          cliente_id: 12,
          page: 3,
          page_size: 20,
        },
        [
          'inicio=2026-02-01',
          'fim=2026-02-28',
          'tipo=saida',
          'status=realizado',
          'categoria_id=5',
          'cliente_id=12',
          'page=3',
          'page_size=20',
        ],
      ],
    ])(
      'monta os query parameters corretamente para %s',
      async (_cenario, filters, expectedParams) => {
        fetch.mockResolvedValueOnce(respostaJson([])); // /categorias-lancamento
        fetch.mockResolvedValueOnce(
          respostaJson(filters.page ? { itens: [], total: 0 } : [])
        ); // /lancamentos/

        await listarFinancas(filters);

        const chamadaLancamentos = fetch.mock.calls[1][0];
        expectedParams.forEach((param) => {
          expect(chamadaLancamentos).toContain(param);
        });
      }
    );

    it.each([
      [
        'categoria existente no banco',
        'Honorários',
        [{ categoria_id: 15, nome_categoria: 'Honorários' }],
        'categoria_id=15',
      ],
      [
        'categoria com case insensitive',
        'despesas',
        [{ id: 22, nome: 'Despesas' }],
        'categoria_id=22',
      ],
      [
        'categoria inexistente no mapa',
        'Inexistente',
        [{ categoria_id: 15, nome_categoria: 'Honorários' }],
        null,
      ],
    ])(
      'resolve categoria textual para ID na requisição: %s',
      async (_cenario, categoria, categoriasMock, expectedParam) => {
        fetch.mockResolvedValueOnce(respostaJson(categoriasMock));
        fetch.mockResolvedValueOnce(respostaJson([]));

        await listarFinancas({ categoria });

        const url = fetch.mock.calls[1][0];
        if (expectedParam) {
          expect(url).toContain(expectedParam);
        } else {
          expect(url).not.toContain('categoria_id=');
        }
      }
    );

    it.each([
      [
        'sucesso não paginado com mapeamento de categoria via catMap',
        [{ categoria_id: 15, nome_categoria: 'Honorários' }],
        [{ lancamento_id: 1, categoria_id: 15, titulo: 'Proc A' }],
        (res) => {
          expect(res).toHaveLength(1);
          expect(res[0].categoria).toBe('Honorários');
        },
      ],
      [
        'sucesso não paginado com resposta não-array',
        [],
        respostaJson({ erro: 'formato inesperado' }),
        (res) => {
          expect(res).toEqual([]);
        },
      ],
      [
        'falha HTTP (!response.ok) no modo não paginado',
        [],
        { ok: false, status: 500 },
        (res) => {
          expect(res).toEqual([]);
        },
      ],
    ])(
      'cenários não paginados de listarFinancas: %s',
      async (_cenario, categoriasMock, lancamentosMock, assercoes) => {
        fetch.mockResolvedValueOnce(respostaJson(categoriasMock));
        fetch.mockResolvedValueOnce(
          lancamentosMock.ok !== undefined
            ? lancamentosMock
            : respostaJson(lancamentosMock)
        );

        const res = await listarFinancas();
        assercoes(res);
      }
    );

    it.each([
      [
        'sucesso com mapeamento de categoria via catMap',
        { page: 1, page_size: 5 },
        [{ categoria_id: 10, nome_categoria: 'Consultoria' }],
        respostaJson({
          itens: [
            { lancamento_id: 1, categoria_id: 10, titulo: 'Contrato A' },
            { lancamento_id: 2, categoria_id: null, titulo: 'Contrato B' },
          ],
          total: 2,
          page: 1,
          page_size: 5,
        }),
        (res) => {
          expect(res.total).toBe(2);
          expect(res.itens).toHaveLength(2);
          expect(res.itens[0].categoria).toBe('Consultoria');
          expect(res.itens[1].categoria).toBe('Outros');
        },
      ],
      [
        'sucesso quando dados.itens não é array',
        { page: 1 },
        [],
        respostaJson({ itens: null, total: 0 }),
        (res) => {
          expect(res.itens).toEqual([]);
          expect(res.total).toBe(0);
        },
      ],
      [
        'resposta HTTP com erro (response.ok: false)',
        { page: 2 },
        [],
        { ok: false, status: 500 },
        (res) => {
          expect(res).toEqual({ itens: [], total: 0 });
        },
      ],
      [
        'falha de rede / exceção na requisição',
        { page: 3 },
        [],
        new Error('Falha de conexão'),
        (res) => {
          expect(res).toEqual({ itens: [], total: 0 });
        },
      ],
    ])(
      'cenários paginados de listarFinancas: %s',
      async (_cenario, filters, categorias, mockResposta, assercoes) => {
        fetch.mockResolvedValueOnce(respostaJson(categorias));
        if (mockResposta instanceof Error) {
          fetch.mockRejectedValueOnce(mockResposta);
        } else {
          fetch.mockResolvedValueOnce(mockResposta);
        }

        const res = await listarFinancas(filters);
        assercoes(res);
      }
    );

    describe('testes parametrizados de listarFinancas para categoria Outros', () => {
      it.each([
        [
          'com query parameters adicionais (inicio, tipo) e token de autenticação',
          {
            categoria: 'Outros',
            inicio: '2026-01-01',
            tipo: 'entrada',
          },
          'token-outros-xyz',
          respostaJson([
            { lancamento_id: 1, categoria_id: null, titulo: 'Outro 1' },
          ]),
          (res, fetchCalls) => {
            expect(Array.isArray(res)).toBe(true);
            expect(res).toHaveLength(1);
            const chamadaLancamentos = fetchCalls[1];
            expect(chamadaLancamentos[0]).toContain(
              '?inicio=2026-01-01&tipo=entrada'
            );
            expect(chamadaLancamentos[1].headers.Authorization).toBe(
              'Bearer token-outros-xyz'
            );
          },
        ],
        [
          'sem filtros adicionais e sem token',
          { categoria: 'Outros' },
          null,
          respostaJson([]),
          (res, fetchCalls) => {
            expect(res).toEqual([]);
            const chamadaLancamentos = fetchCalls[1];
            expect(chamadaLancamentos[0]).toBe(
              'http://localhost:8000/lancamentos/'
            );
            expect(
              chamadaLancamentos[1]?.headers?.Authorization
            ).toBeUndefined();
          },
        ],
        [
          'falha HTTP (!response.ok) com paginação ativa (filters.page)',
          { categoria: 'Outros', page: 1 },
          null,
          { ok: false, status: 500 },
          (res) => {
            expect(res).toEqual({ itens: [], total: 0 });
          },
        ],
        [
          'falha HTTP (!response.ok) sem paginação',
          { categoria: 'Outros' },
          null,
          { ok: false, status: 500 },
          (res) => {
            expect(res).toEqual([]);
          },
        ],
        [
          'resposta com corpo que não é array',
          { categoria: 'Outros' },
          null,
          respostaJson({ mensagem: 'não é array' }),
          (res) => {
            expect(res).toEqual([]);
          },
        ],
        [
          'paginação com valores de page e page_size inválidos/omitidos (testa fallbacks || 1 e || 5)',
          { categoria: 'Outros', page: 'invalido' },
          null,
          respostaJson([]),
          (res) => {
            expect(res.page).toBe(1);
            expect(res.page_size).toBe(5);
            expect(res.total_pages).toBe(1);
            expect(res.itens).toEqual([]);
            expect(res.total).toBe(0);
          },
        ],
      ])(
        'cenário de requisição e resposta para categoria Outros: %s',
        async (_cenario, filters, token, mockResposta, assercoes) => {
          if (token) {
            localStorage.setItem('token', token);
          }
          fetch.mockResolvedValueOnce(respostaJson([])); // /categorias-lancamento
          fetch.mockResolvedValueOnce(mockResposta); // /lancamentos/

          const res = await listarFinancas(filters);
          assercoes(res, fetch.mock.calls);
        }
      );

      it.each([
        [
          'item sem categoria_id',
          { lancamento_id: 1, categoria_id: null },
          [],
          true,
        ],
        [
          'item com categoria_id igual a outrosCatId',
          { lancamento_id: 2, categoria_id: 7 },
          [{ id: 7, nome: 'Outros' }],
          true,
        ],
        [
          'item com categoria_id mapeado para nome Outros no catMap (sem item.categoria)',
          { lancamento_id: 3, categoria_id: 8, categoria: null },
          [{ id: 8, nome: 'outros' }],
          true,
        ],
        [
          'item com categoria_id mapeado para Honorários no catMap (sem categoria na API)',
          { lancamento_id: 4, categoria_id: 99, categoria: null },
          [{ id: 99, nome: 'Honorários' }],
          false,
        ],
        [
          'item com categoria diferente de Outros',
          { lancamento_id: 5, categoria_id: 10, categoria: 'Honorários' },
          [{ id: 10, nome: 'Honorários' }],
          false,
        ],
      ])(
        'filtra item corretamente no predicado de Outros: %s (espera incluir = %s)',
        async (_cenario, item, mockCategorias, esperaIncluir) => {
          fetch.mockResolvedValueOnce(respostaJson(mockCategorias));
          fetch.mockResolvedValueOnce(respostaJson([item]));

          const res = await listarFinancas({ categoria: 'Outros' });
          if (esperaIncluir) {
            expect(res).toHaveLength(1);
            expect(res[0].id).toBe(item.lancamento_id);
          } else {
            expect(res).toHaveLength(0);
          }
        }
      );
    });
  });

  describe('testes parametrizados de obterResumoFinancas', () => {
    it.each([
      [
        'filtro com datas e situação',
        { inicio: '2026-01-01', fim: '2026-01-31', situacao: 'realizado' },
        ['inicio=2026-01-01', 'fim=2026-01-31', 'status=realizado'],
        null,
      ],
      [
        'filtro com tipo e categoria_id direta',
        { tipo: 'entrada', categoria_id: 7 },
        ['tipo=entrada', 'categoria_id=7'],
        null,
      ],
      [
        'filtro com categoria textual mapeada para categoria_id',
        { categoria: 'Consultoria' },
        ['categoria_id=4'],
        [{ categoria_id: 4, nome_categoria: 'Consultoria' }],
      ],
      [
        'filtro com categoria textual com campo .id e .nome',
        { categoria: 'Perícia' },
        ['categoria_id=9'],
        [{ id: 9, nome: 'Perícia' }],
      ],
      [
        'filtro com categoria textual não encontrada',
        { categoria: 'Desconhecida' },
        [],
        [{ id: 1, nome: 'Honorários' }],
      ],
      [
        'filtro com erro na busca de categorias',
        { categoria: 'Qualquer' },
        [],
        'ERRO_CATEGORIA',
      ],
      [
        'filtro com resposta HTTP não-ok em categorias',
        { categoria: 'Qualquer' },
        [],
        { ok: false, status: 404 },
      ],
      [
        'filtro com categoria e token de autorização presente',
        { categoria: 'Consultoria' },
        ['categoria_id=4'],
        [{ categoria_id: 4, nome_categoria: 'Consultoria' }],
        'token-resumo-123',
      ],
      [
        'filtro com categoria quando objeto possui nome e categoria_id sem nome_categoria',
        { categoria: 'Mediação' },
        ['categoria_id=14'],
        [{ categoria_id: 14, nome: 'Mediação' }],
      ],
      [
        'filtro com categoria quando categoria no banco tem campos nulos',
        { categoria: 'Qualquer' },
        [],
        [{ id: 99, nome_categoria: null, nome: null }],
      ],
    ])(
      'monta query correta para %s',
      async (
        _cenario,
        filters,
        expectedParams,
        mockCategorias,
        tokenOpcional
      ) => {
        if (tokenOpcional) {
          localStorage.setItem('token', tokenOpcional);
        }
        if (mockCategorias === 'ERRO_CATEGORIA') {
          fetch.mockRejectedValueOnce(new Error('Falha ao obter categorias'));
        } else if (mockCategorias) {
          fetch.mockResolvedValueOnce(
            mockCategorias.ok !== undefined
              ? mockCategorias
              : respostaJson(mockCategorias)
          );
        }
        const mockResumo = {
          realizado: { total_entradas: 100, total_saidas: 0, quantidade: 1 },
          pendente: { total_entradas: 0, total_saidas: 50, quantidade: 1 },
          atrasado: { total_entradas: 0, total_saidas: 0, quantidade: 0 },
        };
        fetch.mockResolvedValueOnce(respostaJson(mockResumo));

        const res = await obterResumoFinancas(filters);
        expect(res).toEqual(mockResumo);

        const resumoUrl = fetch.mock.calls[fetch.mock.calls.length - 1][0];
        expectedParams.forEach((param) => {
          expect(resumoUrl).toContain(param);
        });
        if (
          filters.categoria &&
          mockCategorias &&
          mockCategorias !== 'ERRO_CATEGORIA' &&
          expectedParams.length === 0
        ) {
          expect(resumoUrl).not.toContain('categoria_id=');
        }
      }
    );

    it.each([
      [
        'resposta HTTP de erro (response.ok: false)',
        { ok: false, status: 500 },
      ],
      ['falha de rede / exceção no fetch', new Error('Falha de rede')],
      [
        'JSON inválido na resposta',
        {
          ok: true,
          json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
        },
      ],
    ])('retorna null em caso de %s', async (_cenario, mockResposta) => {
      if (mockResposta instanceof Error) {
        fetch.mockRejectedValueOnce(mockResposta);
      } else {
        fetch.mockResolvedValueOnce(mockResposta);
      }

      const res = await obterResumoFinancas({ tipo: 'entrada' });
      expect(res).toBeNull();
    });

    it.each([
      [
        'itens com status atrasado, realizado, pendente e status desconhecido',
        [
          { status: 'Atrasado', tipo: 'saida', valor: 200 },
          { status: 'realizado', tipo: 'entrada', valor: 800 },
          { status: 'pendente', tipo: 'entrada', valor: 300 },
          { status: 'outro_qualquer', tipo: 'saida', valor: 150 },
          { status: 'realizado', tipo: 'saida', valor: 'invalido' },
          { status: 'pendente', tipo: 'entrada', valor: 'invalido' },
        ],
        {
          realizado: { quantidade: 2, total_entradas: 800, total_saidas: 0 },
          pendente: { quantidade: 3, total_entradas: 300, total_saidas: 150 },
          atrasado: { quantidade: 1, total_entradas: 0, total_saidas: 200 },
        },
      ],
      [
        'lista vazia de itens',
        [],
        {
          realizado: { quantidade: 0, total_entradas: 0, total_saidas: 0 },
          pendente: { quantidade: 0, total_entradas: 0, total_saidas: 0 },
          atrasado: { quantidade: 0, total_entradas: 0, total_saidas: 0 },
        },
      ],
    ])(
      'calcula resumo de Outros de forma parametrizada: %s',
      async (_cenario, mockDados, esperado) => {
        fetch.mockResolvedValueOnce(respostaJson([])); // /categorias-lancamento
        fetch.mockResolvedValueOnce(respostaJson(mockDados));

        const resumo = await obterResumoFinancas({ categoria: 'Outros' });
        expect(resumo).toEqual(esperado);
      }
    );
  });

  describe('testes parametrizados de categorias de lançamento (listar, criar, excluir)', () => {
    describe('listarCategorias', () => {
      it.each([
        [
          'sucesso com retorno de categorias',
          respostaJson([{ categoria_id: 1, nome_categoria: 'Custas' }]),
          [{ categoria_id: 1, nome_categoria: 'Custas' }],
        ],
        ['falha HTTP retornando lista vazia', { ok: false, status: 500 }, []],
      ])(
        'cenário de listarCategorias: %s',
        async (_cenario, mockResposta, esperado) => {
          fetch.mockResolvedValueOnce(mockResposta);
          const res = await listarCategorias();
          expect(res).toEqual(esperado);
          expect(fetch).toHaveBeenCalledWith(
            'http://localhost:8000/categorias-lancamento',
            {
              cache: 'no-store',
            }
          );
        }
      );
    });

    describe('criarCategoria e excluirCategoria', () => {
      it.each([
        [
          'criarCategoria sucesso',
          () => criarCategoria('Perícia Técnica'),
          'POST',
          'http://localhost:8000/categorias-lancamento',
          { nome_categoria: 'Perícia Técnica' },
          respostaJson({ categoria_id: 99, nome_categoria: 'Perícia Técnica' }),
          { categoria_id: 99, nome_categoria: 'Perícia Técnica' },
        ],
        [
          'excluirCategoria sucesso',
          () => excluirCategoria(12),
          'DELETE',
          'http://localhost:8000/categorias-lancamento/12',
          undefined,
          { ok: true },
          undefined,
        ],
      ])(
        'executa operação com sucesso: %s',
        async (
          _cenario,
          chamada,
          metodo,
          urlEsperada,
          bodyEsperado,
          mockResposta,
          resultadoEsperado
        ) => {
          fetch.mockResolvedValueOnce(mockResposta);
          const res = await chamada();
          expect(res).toEqual(resultadoEsperado);
          expect(fetch).toHaveBeenCalledWith(
            urlEsperada,
            expect.objectContaining({
              method: metodo,
              ...(bodyEsperado && { body: JSON.stringify(bodyEsperado) }),
            })
          );
        }
      );

      it.each([
        [
          'criarCategoria com mensagem de erro da API',
          () => criarCategoria('Duplicada'),
          respostaComErro('Categoria já existente.'),
          'Categoria já existente.',
        ],
        [
          'criarCategoria com falha sem JSON legível (erro padrão)',
          () => criarCategoria('Nova'),
          respostaComErroSemJson(),
          'Não foi possível criar a categoria.',
        ],
        [
          'excluirCategoria com mensagem de erro da API',
          () => excluirCategoria(4),
          respostaComErro('Categoria possui lançamentos vinculados.'),
          'Categoria possui lançamentos vinculados.',
        ],
        [
          'excluirCategoria com falha sem JSON legível (erro padrão)',
          () => excluirCategoria(4),
          respostaComErroSemJson(),
          'Não foi possível excluir a categoria.',
        ],
      ])(
        'trata erros da API e mensagens padrão: %s',
        async (_cenario, chamada, mockResposta, erroEsperado) => {
          fetch.mockResolvedValueOnce(mockResposta);
          await expect(chamada()).rejects.toThrow(erroEsperado);
        }
      );
    });
  });

  describe('testes parametrizados de envio do token de autorização', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'meu-token-secreto');
    });

    it.each([
      [
        'listarFinancas',
        () => listarFinancas(),
        'http://localhost:8000/lancamentos/',
        respostaJson([]),
      ],
      [
        'listarFinancas (paginado)',
        () => listarFinancas({ page: 1 }),
        'http://localhost:8000/lancamentos/paginado?page=1',
        respostaJson({ itens: [], total: 0 }),
      ],
      [
        'obterResumoFinancas',
        () => obterResumoFinancas(),
        'http://localhost:8000/lancamentos/resumo',
        respostaJson({}),
      ],
      [
        'criarFinancas',
        () =>
          criarFinancas({
            titulo: 'Honorários',
            valor: 100,
            data_vencimento: '2026-10-10',
          }),
        'http://localhost:8000/lancamentos/',
        respostaJson({ lancamento_id: 1, valor: 100 }),
      ],
      [
        'atualizarFinancas',
        () =>
          atualizarFinancas(1, {
            titulo: 'Atualizado',
            valor: 200,
            data_vencimento: '2026-10-10',
          }),
        'http://localhost:8000/lancamentos/1',
        respostaJson({ lancamento_id: 1 }),
      ],
      [
        'excluirFinancas',
        () => excluirFinancas(1),
        'http://localhost:8000/lancamentos/1',
        { ok: true },
      ],
      [
        'mudarStatusLancamento',
        () => mudarStatusLancamento(1, 'realizado'),
        'http://localhost:8000/lancamentos/1/alternar-status',
        respostaJson({ lancamento_id: 1, status: 'Realizado' }),
      ],
      [
        'listarCategorias',
        () => listarCategorias(),
        'http://localhost:8000/categorias-lancamento',
        respostaJson([]),
      ],
      [
        'criarCategoria',
        () => criarCategoria('Nova Cat'),
        'http://localhost:8000/categorias-lancamento',
        respostaJson({ categoria_id: 1, nome_categoria: 'Nova Cat' }),
      ],
      [
        'excluirCategoria',
        () => excluirCategoria(1),
        'http://localhost:8000/categorias-lancamento/1',
        { ok: true },
      ],
    ])(
      'envia header Authorization no método %s',
      async (_nome, operacao, urlEsperada, mockResposta) => {
        fetch.mockImplementation(async (url) => {
          if (url.includes('/categorias-lancamento') && url !== urlEsperada) {
            return respostaJson([]);
          }
          return mockResposta;
        });

        await operacao();

        const chamadaPrincipal = fetch.mock.calls.find((call) =>
          call[0].startsWith(urlEsperada)
        );
        expect(chamadaPrincipal).toBeDefined();
        const config = chamadaPrincipal[1] || {};
        const headers = config.headers || {};
        expect(headers.Authorization || headers['Authorization']).toBe(
          'Bearer meu-token-secreto'
        );
      }
    );
  });
});
