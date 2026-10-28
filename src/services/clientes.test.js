import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
  obterCliente,
} from './clientes';
import { getAccessToken } from '@/utils/authSession';

vi.mock('@/utils/authSession', () => ({
  getAccessToken: vi.fn(),
}));

const mockFetchResponse = (dados, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(dados),
});

describe('serviço de clientes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('test-token-123');
  });

  describe('listarClientes', () => {
    it.each([
      {
        cenario: 'com filtros de busca, responsável e etapa',
        filtros: { busca: 'João', responsavel_id: 2, etapa_id: 4 },
        urlEsperada:
          'http://localhost:8000/clientes/?busca=Jo%C3%A3o&responsavel_id=2&etapa_id=4',
        mockClientes: [{ cliente_id: 1, nome: 'João Santos' }],
      },
      {
        cenario: 'sem filtros adicionais',
        filtros: undefined,
        urlEsperada: 'http://localhost:8000/clientes/',
        mockClientes: [],
      },
    ])(
      'chama API $cenario e retorna lista com token de autenticação',
      async ({ filtros, urlEsperada, mockClientes }) => {
        fetch.mockResolvedValue(mockFetchResponse(mockClientes));

        const res = await listarClientes(filtros);
        expect(res).toEqual(mockClientes);
        expect(fetch).toHaveBeenCalledWith(
          urlEsperada,
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token-123',
            }),
          })
        );
      }
    );

    it.each([
      {
        cenario: 'detail como string direta (403)',
        respostaMock: mockFetchResponse({ detail: 'Erro de permissão' }, 403),
        mensagemEsperada: 'Erro de permissão',
      },
      {
        cenario: 'array de validação do Pydantic com campo msg (422)',
        respostaMock: mockFetchResponse(
          { detail: [{ msg: 'Campo inválido' }, { msg: 'Valor incorreto' }] },
          422
        ),
        mensagemEsperada: 'Campo inválido Valor incorreto',
      },
      {
        cenario: 'array de validação usando campo message (422)',
        respostaMock: mockFetchResponse(
          { detail: [{ message: 'Campo obrigatório' }] },
          422
        ),
        mensagemEsperada: 'Campo obrigatório',
      },
      {
        cenario: 'erro de email do Pydantic traduzido para português (422)',
        respostaMock: mockFetchResponse(
          {
            detail: [
              {
                msg: 'value is not a valid email address: The email address is not valid. It must have exactly one @-sign.',
              },
            ],
          },
          422
        ),
        mensagemEsperada: 'Informe um e-mail válido.',
      },
      {
        cenario: 'erro de campo obrigatório traduzido para português (422)',
        respostaMock: mockFetchResponse({ detail: 'Field required' }, 422),
        mensagemEsperada: 'Preencha todos os campos obrigatórios.',
      },
      {
        cenario: 'body da resposta ilegível retornando mensagem padrão',
        respostaMock: {
          ok: false,
          json: vi.fn().mockRejectedValue(new Error('fail')),
        },
        mensagemEsperada: 'Não foi possível carregar a lista de clientes.',
      },
    ])(
      'lança erro apropriado quando $cenario',
      async ({ respostaMock, mensagemEsperada }) => {
        fetch.mockResolvedValue(respostaMock);
        await expect(listarClientes()).rejects.toThrow(mensagemEsperada);
      }
    );

    it.each([
      {
        cenario: 'resposta da API não for ok (401)',
        setupFetch: () =>
          fetch.mockResolvedValue(
            mockFetchResponse({ detail: 'Não autenticado' }, 401)
          ),
      },
      {
        cenario: 'fetch falhar com erro de rede',
        setupFetch: () => fetch.mockRejectedValue(new Error('ECONNREFUSED')),
      },
    ])('retorna array vazio no SSR quando $cenario', async ({ setupFetch }) => {
      const originalWindow = globalThis.window;
      delete globalThis.window;
      try {
        setupFetch();
        const res = await listarClientes();
        expect(res).toEqual([]);
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });

  describe('operações de leitura e escrita por cliente (obter, criar, atualizar, excluir)', () => {
    it('obterCliente retorna dados do cliente por id', async () => {
      const mockCliente = { cliente_id: 1, nome: 'Maria Oliveira' };
      fetch.mockResolvedValue(mockFetchResponse(mockCliente));

      const res = await obterCliente(1);
      expect(res).toEqual(mockCliente);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/1',
        expect.anything()
      );
    });

    it('criarCliente envia dados via POST e retorna cliente criado', async () => {
      const novo = { nome: 'Novo Cliente', email: 'novo@teste.com' };
      fetch.mockResolvedValue(
        mockFetchResponse({ cliente_id: 10, ...novo }, 201)
      );

      const res = await criarCliente(novo);
      expect(res.cliente_id).toBe(10);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(novo),
        })
      );
    });

    it('atualizarCliente envia dados via PUT e retorna cliente atualizado', async () => {
      const editado = { nome: 'Nome Editado' };
      fetch.mockResolvedValue(mockFetchResponse({ cliente_id: 5, ...editado }));

      const res = await atualizarCliente(5, editado);
      expect(res.nome).toBe('Nome Editado');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/5',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(editado),
        })
      );
    });

    it('excluirCliente envia requisição DELETE e retorna true com sucesso', async () => {
      fetch.mockResolvedValue(mockFetchResponse(null, 204));

      const res = await excluirCliente(3);
      expect(res).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/3',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it.each([
      {
        operacao: 'obterCliente inexistente (404)',
        executar: () => obterCliente(999),
        resposta: mockFetchResponse({ detail: 'Cliente não encontrado' }, 404),
        erroEsperado: 'Cliente não encontrado',
      },
      {
        operacao: 'criarCliente com email duplicado (400)',
        executar: () => criarCliente({}),
        resposta: mockFetchResponse({ detail: 'Email já cadastrado' }, 400),
        erroEsperado: 'Email já cadastrado',
      },
      {
        operacao: 'atualizarCliente sem detail no erro (500)',
        executar: () => atualizarCliente(5, {}),
        resposta: mockFetchResponse({}, 500),
        erroEsperado: 'Não foi possível atualizar o cliente.',
      },
      {
        operacao: 'excluirCliente com falha (400)',
        executar: () => excluirCliente(3),
        resposta: mockFetchResponse({ detail: 'Falha ao deletar' }, 400),
        erroEsperado: 'Falha ao deletar',
      },
    ])(
      'lança erro em $operacao',
      async ({ executar, resposta, erroEsperado }) => {
        fetch.mockResolvedValue(resposta);
        await expect(executar()).rejects.toThrow(erroEsperado);
      }
    );
  });
});
