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
    it('chama API com filtros e retorna lista com token de autenticação', async () => {
      const mockClientes = [{ cliente_id: 1, nome: 'João Santos' }];
      fetch.mockResolvedValue(mockFetchResponse(mockClientes));

      const res = await listarClientes({
        busca: 'João',
        responsavel_id: 2,
        etapa_id: 4,
      });
      expect(res).toEqual(mockClientes);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/?busca=Jo%C3%A3o&responsavel_id=2&etapa_id=4',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('faz requisição sem filtros adicionais quando nenhum filtro é passado', async () => {
      fetch.mockResolvedValue(mockFetchResponse([]));
      await listarClientes();
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/',
        expect.anything()
      );
    });

    it('lança erro caso resposta retorne falha com detail string', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ detail: 'Erro de permissão' }, 403)
      );

      await expect(listarClientes()).rejects.toThrow('Erro de permissão');
    });

    it('lança erro com detalhes de array de validação do Pydantic', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse(
          { detail: [{ msg: 'Campo inválido' }, { msg: 'Valor incorreto' }] },
          422
        )
      );

      await expect(listarClientes()).rejects.toThrow(
        'Campo inválido Valor incorreto'
      );
    });

    it('lança erro com detalhes de validação usando campo message', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ detail: [{ message: 'Campo obrigatório' }] }, 422)
      );

      await expect(listarClientes()).rejects.toThrow('Campo obrigatório');
    });

    it('lança erro padrão caso o body da resposta não possa ser lido', async () => {
      fetch.mockResolvedValue({
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('fail')),
      });

      await expect(listarClientes()).rejects.toThrow(
        'Não foi possível carregar a lista de clientes.'
      );
    });

    it('retorna array vazio no SSR se a resposta não for ok', async () => {
      const originalWindow = globalThis.window;
      delete globalThis.window;
      try {
        fetch.mockResolvedValue(
          mockFetchResponse({ detail: 'Não autenticado' }, 401)
        );
        const res = await listarClientes();
        expect(res).toEqual([]);
      } finally {
        globalThis.window = originalWindow;
      }
    });

    it('retorna array vazio no SSR se fetch falhar com erro de rede', async () => {
      const originalWindow = globalThis.window;
      delete globalThis.window;
      try {
        fetch.mockRejectedValue(new Error('ECONNREFUSED'));
        const res = await listarClientes();
        expect(res).toEqual([]);
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });

  describe('obterCliente', () => {
    it('retorna dados do cliente por id', async () => {
      const mockCliente = { cliente_id: 1, nome: 'Maria Oliveira' };
      fetch.mockResolvedValue(mockFetchResponse(mockCliente));

      const res = await obterCliente(1);
      expect(res).toEqual(mockCliente);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/clientes/1',
        expect.anything()
      );
    });

    it('lança erro ao buscar cliente inexistente', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ detail: 'Cliente não encontrado' }, 404)
      );

      await expect(obterCliente(999)).rejects.toThrow('Cliente não encontrado');
    });
  });

  describe('criarCliente', () => {
    it('envia dados via POST e retorna cliente criado', async () => {
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

    it('lança erro caso criação falhe', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ detail: 'Email já cadastrado' }, 400)
      );

      await expect(criarCliente({})).rejects.toThrow('Email já cadastrado');
    });
  });

  describe('atualizarCliente', () => {
    it('envia dados via PUT e retorna cliente atualizado', async () => {
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

    it('lança erro caso atualização falhe', async () => {
      fetch.mockResolvedValue(mockFetchResponse({}, 500));

      await expect(atualizarCliente(5, {})).rejects.toThrow(
        'Não foi possível atualizar o cliente.'
      );
    });
  });

  describe('excluirCliente', () => {
    it('envia requisição DELETE e retorna true com sucesso', async () => {
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

    it('lança erro caso exclusão falhe', async () => {
      fetch.mockResolvedValue(
        mockFetchResponse({ detail: 'Falha ao deletar' }, 400)
      );

      await expect(excluirCliente(3)).rejects.toThrow('Falha ao deletar');
    });
  });
});
