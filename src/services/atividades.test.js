import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';
import { listarProdutividadeEquipe } from './atividades';

vi.mock('@/utils/authSession', () => ({
  getAccessToken: vi.fn(),
}));

const respostaJson = (dados, overrides = {}) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(dados),
  ...overrides,
});

describe('serviço de atividades', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('token-admin');
  });

  it('busca a produtividade da equipe com token e sem cache', async () => {
    const produtividade = [{ funcionario_id: 1, total_atividades: 5 }];
    fetch.mockResolvedValue(respostaJson(produtividade));

    await expect(listarProdutividadeEquipe()).resolves.toEqual(produtividade);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/atividades/produtividade`,
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

    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Sessão expirada. Faça login novamente.'],
    [
      403,
      'Você não possui permissão para visualizar a produtividade da equipe.',
    ],
    [500, 'Falha ao carregar os dados.'],
  ])('lança a mensagem adequada para status %i', async (status, mensagem) => {
    fetch.mockResolvedValue(
      respostaJson({ detail: mensagem }, { ok: false, status })
    );

    await expect(listarProdutividadeEquipe()).rejects.toThrow(mensagem);
  });

  it('usa mensagem padrão se a resposta de erro não contém detail', async () => {
    fetch.mockResolvedValue(respostaJson({}, { ok: false, status: 500 }));

    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Não foi possível carregar a produtividade da equipe.'
    );
  });

  it('usa mensagem padrão se o corpo de erro não for JSON válido', async () => {
    fetch.mockResolvedValue(
      respostaJson(null, {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
      })
    );

    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Não foi possível carregar a produtividade da equipe.'
    );
  });

  it('converte falha de rede em erro com mensagem padrão', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(listarProdutividadeEquipe()).rejects.toThrow(
      'Não foi possível carregar a produtividade da equipe.'
    );
  });
});
