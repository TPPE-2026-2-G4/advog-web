import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarFuncionarios } from '@/services/funcionarios';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  getProcessosData,
  listarProcessos,
} from './processos';

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

const processData = {
  id: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
  cliente: 'Maria',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana',
  prazo: '2026-10-05',
  diasRestantes: 8,
};

const authorization = { Authorization: 'Bearer token-jwt' };

const jsonResponse = (data, overrides = {}) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(data),
  ...overrides,
});

const errorResponse = (detail, status = 400) => ({
  ok: false,
  status,
  json: vi.fn().mockResolvedValue({ detail }),
});

describe('serviço de processos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', 'token-jwt');
  });

  it('lista processos sem usar cache', async () => {
    const page = { itens: [processData], total: 1, page: 1, page_size: 5 };
    fetch.mockResolvedValue(jsonResponse(page));

    await expect(listarProcessos()).resolves.toEqual(page);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/processos/', {
      cache: 'no-store',
      headers: authorization,
    });
  });

  it('envia filtros e página preenchidos na query string', async () => {
    fetch.mockResolvedValue(jsonResponse({ itens: [], total: 0 }));

    await listarProcessos({
      busca: '0061234',
      status: 'Ativo',
      responsavelId: '3',
      prazoInicio: '2026-09-01',
      prazoFim: '2026-09-30',
      page: 2,
      pageSize: 5,
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/processos/?busca=0061234&status=Ativo&responsavel_id=3&prazo_inicio=2026-09-01&prazo_fim=2026-09-30&page=2&page_size=5',
      { cache: 'no-store', headers: authorization }
    );
  });

  it('envia o cadastro por POST', async () => {
    fetch.mockResolvedValue(jsonResponse(processData, { status: 201 }));

    await expect(criarProcesso(processData)).resolves.toEqual(processData);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/processos/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authorization },
      body: JSON.stringify(processData),
    });
  });

  it('envia a edição por PATCH com identificador codificado', async () => {
    fetch.mockResolvedValue(jsonResponse(processData));

    await atualizarProcesso('processo/com barra', { status: 'Concluído' });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/processos/processo%2Fcom%20barra',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authorization },
        body: JSON.stringify({ status: 'Concluído' }),
      }
    );
  });

  it('aceita a resposta sem conteúdo da exclusão', async () => {
    const response = jsonResponse(null, { status: 204 });
    fetch.mockResolvedValue(response);

    await expect(excluirProcesso(processData.id)).resolves.toBeUndefined();
    expect(response.json).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:8000/processos/${processData.id}`,
      { method: 'DELETE', headers: authorization }
    );
  });

  it.each([
    [
      'a mensagem 404 da API',
      () => errorResponse('Processo não encontrado', 404),
      'Processo não encontrado',
    ],
    [
      'a mensagem 409 da API',
      () => errorResponse('Processo já cadastrado', 409),
      'Processo já cadastrado',
    ],
    [
      'um erro de validação 422',
      () =>
        errorResponse(
          [
            {
              type: 'missing',
              loc: ['body', 'cliente_id'],
              msg: 'Field required',
            },
            {
              type: 'string_pattern_mismatch',
              loc: ['body', 'cnj'],
              msg: 'String should match pattern',
            },
          ],
          422
        ),
      'Cliente: campo obrigatório. Número do processo: String should match pattern',
    ],
  ])('propaga %s', async (_description, response, expectedMessage) => {
    fetch.mockResolvedValue(response());

    await expect(criarProcesso(processData)).rejects.toThrow(expectedMessage);
  });

  it.each([
    ['falha de rede', () => Promise.reject(new Error('NetworkError'))],
    [
      'resposta de erro sem JSON',
      () =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
        }),
    ],
    [
      'resposta de sucesso sem JSON',
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
        }),
    ],
  ])('usa mensagem padrão para %s', async (_description, response) => {
    fetch.mockReturnValue(response());

    await expect(listarProcessos()).rejects.toThrow(
      'Não foi possível carregar os processos.'
    );
  });

  it('não faz a requisição sem token de acesso', async () => {
    sessionStorage.clear();

    await expect(listarProcessos()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('informa falta de permissão em respostas 403', async () => {
    fetch.mockResolvedValue(errorResponse('Forbidden', 403));

    await expect(excluirProcesso('1')).rejects.toThrow(
      'Você não possui permissão para realizar esta ação.'
    );
  });

  it('ignora itens inválidos em uma lista de validação', async () => {
    fetch.mockResolvedValue(errorResponse([{}], 422));

    await expect(criarProcesso(processData)).rejects.toThrow(
      'Não foi possível cadastrar o processo.'
    );
  });

  describe('getProcessosData', () => {
    it('carrega a primeira página e as opções de responsável', async () => {
      fetch.mockResolvedValue(
        jsonResponse({
          itens: [{ processo_id: 1 }],
          total: 1,
          page: 1,
          page_size: 5,
          total_pages: 1,
        })
      );
      listarFuncionarios.mockResolvedValue([
        { funcionario_id: 3, nome: 'Ana Paula Ribeiro' },
      ]);

      await expect(getProcessosData()).resolves.toEqual({
        initialPage: {
          itens: [{ processo_id: 1 }],
          total: 1,
          page: 1,
          pageSize: 5,
          totalPages: 1,
        },
        responsaveis: [{ value: '3', label: 'Ana Paula Ribeiro' }],
        initialError: '',
      });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/processos/?page=1&page_size=5',
        { cache: 'no-store', headers: authorization }
      );
    });

    it('devolve a página vazia e a mensagem quando a API falha', async () => {
      fetch.mockResolvedValue(errorResponse('API indisponível', 500));
      listarFuncionarios.mockResolvedValue([]);

      await expect(getProcessosData()).resolves.toEqual({
        initialPage: {
          itens: [],
          total: 0,
          page: 1,
          pageSize: 5,
          totalPages: 1,
        },
        responsaveis: [],
        initialError: 'API indisponível',
      });
    });

    it('usa a mensagem padrão para rejeições que não são erros', async () => {
      fetch.mockResolvedValue(jsonResponse({ itens: [] }));
      listarFuncionarios.mockRejectedValue('falha');

      const { initialError } = await getProcessosData();

      expect(initialError).toBe('Não foi possível carregar os processos.');
    });
  });
});
