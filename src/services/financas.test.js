import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarFinancas,
  atualizarLancamento,
  criarFinancas,
  criarLancamento,
  excluirFinancas,
  excluirLancamento,
  listarFinancas,
  listarLancamentos,
  mudarStatusLancamento,
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
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('listarFinancas', () => {
    it('retorna os lançamentos mapeados recebidos pela API', async () => {
      const lancamentosBackend = [
        {
          lancamento_id: 1,
          titulo: 'Honorários',
          valor: 5000,
          tipo: 'Entrada',
          data_vencimento: '2026-08-05',
          categoria: 'Honorários',
          status: 'Pago',
        },
        {
          lancamento_id: 2,
          titulo: 'Custas',
          valor: 250,
          tipo: 'Saída',
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
      expect(resultado[0].status).toBe('pago');
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
        tipo: 'Entrada',
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
          tipo: 'Entrada',
          titulo: 'Honorários Iniciais',
          descricao: null,
          valor: 5000,
          data_vencimento: '2026-10-15',
          data_pagamento: null,
          categoria: 'Honorários',
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
        tipo: 'Entrada',
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
            tipo: 'Entrada',
            titulo: 'Honorários Atualizados',
            descricao: null,
            valor: 7000,
            data_vencimento: '2026-10-15',
            data_pagamento: null,
            categoria: 'Honorários',
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
        status: 'Recebido',
      };
      const respostaApi = {
        lancamento_id: 5,
        tipo: 'Entrada',
        titulo: 'Honorários Atualizados',
        valor: 4500,
        data_vencimento: '2026-10-25',
        data_pagamento: '2026-10-20',
        categoria: 'Honorários',
        status: 'Recebido',
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
            tipo: 'Entrada',
            titulo: 'Honorários Atualizados',
            descricao: null,
            valor: 4500,
            data_vencimento: '2026-10-25',
            data_pagamento: '2026-10-20',
            categoria: 'Honorários',
            status: 'Recebido',
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
        tipo: 'Entrada',
        status: 'Pago',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const atualizado = await mudarStatusLancamento(1, 'pago');
      expect(atualizado.id).toBe(1);
      expect(atualizado.status).toBe('pago');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/lancamentos/1/status',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'Pago' }),
        }
      );
    });

    it('suporta passar o payload já como objeto', async () => {
      const respostaApi = {
        lancamento_id: 2,
        tipo: 'Saída',
        status: 'Atrasado',
      };
      fetch.mockResolvedValue(respostaJson(respostaApi));

      const res = await mudarStatusLancamento(2, { status: 'atrasado' });
      expect(res.id).toBe(2);
      expect(res.status).toBe('atrasado');
    });

    it('lança erro com mensagem da API quando a requisição falha', async () => {
      fetch.mockResolvedValue(respostaComErro('Erro de validação.'));

      await expect(mudarStatusLancamento(1, 'recebido')).rejects.toThrow(
        'Erro de validação.'
      );
    });

    it('lança erro padrão se o erro não contiver JSON legível', async () => {
      fetch.mockResolvedValue(respostaComErroSemJson());

      await expect(mudarStatusLancamento(1, 'recebido')).rejects.toThrow(
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
});
