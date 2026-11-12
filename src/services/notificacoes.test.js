import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listarNotificacoes,
  marcarTodasNotificacoesComoLidas,
  marcarNotificacaoComoLida,
  obterContagemNaoLidas,
  obterContagemNotificacoes,
  NotificacoesApiError,
} from './notificacoes';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serviço de notificações', () => {
  beforeEach(() => {
    sessionStorage.setItem('access_token', 'token-teste');
  });

  it('lista notificações com o contrato de paginação da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: '1', tipo: 'ATRASO', link_destino: null }],
      })
    );

    await expect(
      listarNotificacoes({ apenasNaoLidas: true, offset: 20 })
    ).resolves.toEqual([{ id: '1', tipo: 'ATRASO', link_destino: null }]);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/notificacoes?limite=20&offset=20&apenas_nao_lidas=true'
      ),
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-teste',
        },
      })
    );
  });

  it('não requisita sem token de acesso', async () => {
    sessionStorage.clear();

    await expect(obterContagemNotificacoes()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trata falhas de rede com mensagem específica da operação', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('NetworkError'))
    );

    await expect(obterContagemNotificacoes()).rejects.toThrow(
      'Não foi possível carregar a contagem de notificações.'
    );
  });

  it.each([
    [401, 'Sessão expirada. Faça login novamente.'],
    [403, 'Você não possui permissão para realizar esta ação.'],
    [404, 'Notificação não encontrada.'],
    [429, 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.'],
  ])('usa mensagem específica para HTTP %s', async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ detail: 'Detalhe técnico da API' }),
      })
    );

    await expect(obterContagemNotificacoes()).rejects.toMatchObject({
      name: 'NotificacoesApiError',
      status,
      message,
    });
  });

  it('obtém a contagem de não lidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total_nao_lidas: 4 }),
      })
    );

    await expect(obterContagemNaoLidas()).resolves.toBe(4);
    await expect(obterContagemNotificacoes()).resolves.toBe(4);
  });

  it('rejeita resposta inválida da listagem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      })
    );

    await expect(listarNotificacoes()).rejects.toThrow(
      'Resposta inválida ao carregar as notificações.'
    );
  });

  it('marca uma notificação como lida com PATCH e normaliza a resposta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'id/1',
          tipo: 'TIPO_NOVO',
          link_destino: 42,
          lida: true,
        }),
      })
    );

    await expect(marcarNotificacaoComoLida('id/1')).resolves.toMatchObject({
      id: 'id/1',
      tipo: 'SISTEMA',
      link_destino: null,
      lida: true,
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/notificacoes/id%2F1/lida',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-teste',
        },
      })
    );
  });

  it('aceita respostas 204 sem tentar fazer parse de JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 })
    );

    await expect(marcarTodasNotificacoesComoLidas()).resolves.toBeUndefined();
  });

  it('mantém a classe de erro exportada para decisões do hook', () => {
    expect(NotificacoesApiError).toBeTypeOf('function');
  });
});
