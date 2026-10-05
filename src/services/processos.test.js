import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from './processos';

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
  });

  it('lista processos sem usar cache', async () => {
    const page = { itens: [processData], total: 1, page: 1, page_size: 5 };
    fetch.mockResolvedValue(jsonResponse(page));

    await expect(listarProcessos()).resolves.toEqual(page);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/processos/', {
      cache: 'no-store',
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
      { cache: 'no-store' }
    );
  });

  it('envia o cadastro por POST', async () => {
    fetch.mockResolvedValue(jsonResponse(processData, { status: 201 }));

    await expect(criarProcesso(processData)).resolves.toEqual(processData);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/processos/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      { method: 'DELETE' }
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
              loc: ['body', 'cliente'],
              msg: 'Field required',
            },
            {
              type: 'string_pattern_mismatch',
              loc: ['body', 'id'],
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

  it('ignora itens inválidos em uma lista de validação', async () => {
    fetch.mockResolvedValue(errorResponse([{}], 422));

    await expect(criarProcesso(processData)).rejects.toThrow(
      'Não foi possível cadastrar o processo.'
    );
  });
});
