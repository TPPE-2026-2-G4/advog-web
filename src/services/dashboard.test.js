import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';
import { obterResumoAtividades } from './dashboard';

vi.mock('@/utils/authSession', () => ({
  getAccessToken: vi.fn(),
}));

const respostaJson = (dados, overrides = {}) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(dados),
  ...overrides,
});

describe('serviço de dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('token-admin');
  });

  it('busca o resumo de atividades com token e sem cache', async () => {
    const resumo = {
      escopo: 'usuario',
      pendentes: 1,
      em_execucao: 2,
      concluidas: 3,
      atrasadas: 4,
    };
    fetch.mockResolvedValue(respostaJson(resumo));

    await expect(obterResumoAtividades()).resolves.toEqual(resumo);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/dashboard/atividades/resumo`,
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: expect.stringContaining('token-admin'),
        },
        cache: 'no-store',
      })
    );
  });

  it('lança erro e não consulta a API quando não há token', async () => {
    getAccessToken.mockReturnValue(null);

    await expect(obterResumoAtividades()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('informa sessão expirada quando a API responde 401', async () => {
    fetch.mockResolvedValue(respostaJson({}, { ok: false, status: 401 }));

    await expect(obterResumoAtividades()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
  });

  it('usa o detail da API quando disponível', async () => {
    fetch.mockResolvedValue(
      respostaJson({ detail: 'Falha interna' }, { ok: false, status: 500 })
    );

    await expect(obterResumoAtividades()).rejects.toThrow('Falha interna');
  });

  it('usa mensagem padrão se o detail não for texto ou o corpo não for JSON', async () => {
    fetch.mockResolvedValueOnce(
      respostaJson({ detail: [{ msg: 'x' }] }, { ok: false, status: 422 })
    );
    fetch.mockResolvedValueOnce(
      respostaJson(null, {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
      })
    );

    await expect(obterResumoAtividades()).rejects.toThrow(
      'Não foi possível carregar o resumo de atividades.'
    );
    await expect(obterResumoAtividades()).rejects.toThrow(
      'Não foi possível carregar o resumo de atividades.'
    );
  });

  it('converte falha de rede em erro com mensagem padrão', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(obterResumoAtividades()).rejects.toThrow(
      'Não foi possível carregar o resumo de atividades.'
    );
  });
});
