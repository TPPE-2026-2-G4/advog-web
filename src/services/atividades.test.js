import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';
import {
  atualizarAtividade,
  buscarAtividade,
  criarAtividade,
  excluirAtividade,
  filtrarAtividades,
  listarProdutividadeEquipe,
  obterKanbanAtividades,
} from './atividades';

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

  it('executa operações de kanban e gerenciamento de atividades', async () => {
    const atividade = { atividade_id: 1, titulo: 'Petição' };
    fetch.mockResolvedValueOnce(respostaJson(atividade));
    await expect(buscarAtividade(1)).resolves.toEqual(atividade);

    fetch.mockResolvedValueOnce(respostaJson(atividade, { status: 201 }));
    await expect(criarAtividade({ titulo: 'Petição' })).resolves.toEqual(
      atividade
    );

    fetch.mockResolvedValueOnce(
      respostaJson({ ...atividade, titulo: 'Revisada' })
    );
    await expect(
      atualizarAtividade(1, { titulo: 'Revisada' })
    ).resolves.toEqual({ ...atividade, titulo: 'Revisada' });

    fetch.mockResolvedValueOnce(respostaJson(null, { status: 204 }));
    await expect(excluirAtividade(1)).resolves.toBeUndefined();

    fetch.mockResolvedValueOnce(respostaJson({}, { ok: false, status: 403 }));
    await expect(excluirAtividade(1)).rejects.toThrow(
      'Você não possui permissão para realizar esta ação.'
    );
  });
});

describe('obterKanbanAtividades', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('token-admin');
  });

  it('busca o kanban com token e sem cache', async () => {
    const kanban = { escopo: 'usuario', etapas: [] };
    fetch.mockResolvedValue(respostaJson(kanban));

    await expect(obterKanbanAtividades()).resolves.toEqual(kanban);

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/atividades/kanban`,
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

    await expect(obterKanbanAtividades()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Sessão expirada. Faça login novamente.'],
    [403, 'Você não possui permissão para visualizar as atividades.'],
    [500, 'Falha interna'],
  ])('lança a mensagem adequada para status %i', async (status, mensagem) => {
    fetch.mockResolvedValue(
      respostaJson({ detail: 'Falha interna' }, { ok: false, status })
    );

    await expect(obterKanbanAtividades()).rejects.toThrow(mensagem);
  });

  it('usa mensagem padrão se a resposta de erro não contém detail', async () => {
    fetch.mockResolvedValue(respostaJson({}, { ok: false, status: 500 }));

    await expect(obterKanbanAtividades()).rejects.toThrow(
      'Não foi possível carregar as atividades.'
    );
  });

  it('converte falha de rede em erro com mensagem padrão', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(obterKanbanAtividades()).rejects.toThrow(
      'Não foi possível carregar as atividades.'
    );
  });
});

describe('filtrarAtividades', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('token-admin');
  });

  it('monta a URL com todos os parâmetros presentes', async () => {
    const lista = [{ atividade_id: 1, titulo: 'Elaborar Petição' }];
    fetch.mockResolvedValue(respostaJson(lista));

    const filtros = {
      busca_textual: 'Petição Santos',
      funcionario_id: 3,
      prazo_fim: '2026-12-31',
      prazo_inicio: '2026-01-01',
      etapa_id: 2,
    };

    const resultado = await filtrarAtividades(filtros);

    expect(resultado).toEqual(lista);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/atividades/?busca_textual=Peti%C3%A7%C3%A3o+Santos&funcionario_id=3&prazo_fim=2026-12-31&prazo_inicio=2026-01-01&etapa_id=2`,
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer token-admin',
        },
        cache: 'no-store',
      })
    );
  });

  it('omite parâmetros vazios, nulos ou indefinidos na query string', async () => {
    fetch.mockResolvedValue(respostaJson([]));

    await filtrarAtividades({
      busca_textual: '   ',
      funcionario_id: '',
      prazo_fim: undefined,
      etapa_id: null,
    });

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/atividades/`,
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('lança erro se o usuário não tiver token de autenticação', async () => {
    getAccessToken.mockReturnValue(null);

    await expect(filtrarAtividades()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'Sessão expirada. Faça login novamente.'],
    [403, 'Você não possui permissão para visualizar estas atividades.'],
    [500, 'Erro interno no servidor'],
  ])('propaga mensagem adequada para status %i', async (status, detail) => {
    fetch.mockResolvedValue(respostaJson({ detail }, { ok: false, status }));

    await expect(filtrarAtividades({ busca_textual: 'teste' })).rejects.toThrow(
      detail
    );
  });

  it('usa mensagem de fallback quando a resposta de erro não contém detail', async () => {
    fetch.mockResolvedValue(respostaJson({}, { ok: false, status: 500 }));

    await expect(filtrarAtividades()).rejects.toThrow(
      'Não foi possível filtrar as atividades.'
    );
  });

  it('converte falha de rede em erro amigável', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(filtrarAtividades()).rejects.toThrow(
      'Não foi possível filtrar as atividades.'
    );
  });
});
