import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from './processos';
import { getAccessToken } from '@/utils/authSession';

vi.mock('@/utils/authSession', () => ({
  getAccessToken: vi.fn(),
}));

const processData = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
  descricao: null,
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_inicio: null,
  data_realizado: null,
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: 10,
  funcionario_id: 5,
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
    getAccessToken.mockReturnValue('token-jwt');
  });

  it('lista processos sem usar cache', async () => {
    fetch.mockResolvedValue(jsonResponse([processData]));

    await expect(listarProcessos()).resolves.toEqual([processData]);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/processos/', {
      cache: 'no-store',
      headers: { Authorization: 'Bearer token-jwt' },
    });
  });

  it('envia o cadastro por POST', async () => {
    fetch.mockResolvedValue(jsonResponse(processData, { status: 201 }));

    await expect(criarProcesso(processData)).resolves.toEqual(processData);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/processos/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-jwt',
      },
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-jwt',
        },
        body: JSON.stringify({ status: 'Concluído' }),
      }
    );
  });

  it('aceita a resposta sem conteúdo da exclusão', async () => {
    const response = jsonResponse(null, { status: 204 });
    fetch.mockResolvedValue(response);

    await expect(
      excluirProcesso(processData.processo_id)
    ).resolves.toBeUndefined();
    expect(response.json).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:8000/processos/${processData.processo_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-jwt' },
      }
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

  it('ignora itens inválidos em uma lista de validação', async () => {
    fetch.mockResolvedValue(errorResponse([{}], 422));

    await expect(criarProcesso(processData)).rejects.toThrow(
      'Não foi possível cadastrar o processo.'
    );
  });

  it('exige sessão e traduz respostas de autorização', async () => {
    getAccessToken.mockReturnValueOnce(null);
    await expect(listarProcessos()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );

    fetch.mockResolvedValueOnce(errorResponse('Not authenticated', 401));
    await expect(listarProcessos()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );

    fetch.mockResolvedValueOnce(errorResponse('Forbidden', 403));
    await expect(criarProcesso(processData)).rejects.toThrow(
      'Você não possui permissão para realizar esta ação.'
    );
  });
});
