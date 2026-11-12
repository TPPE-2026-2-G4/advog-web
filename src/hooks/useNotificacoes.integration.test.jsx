import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificacoes } from './useNotificacoes';

const item = (id, lida = false) => ({
  id,
  titulo: `Notificação ${id}`,
  mensagem: 'Mensagem',
  tipo: 'SISTEMA',
  lida,
  criado_em: '2026-11-12T12:00:00Z',
  link_destino: null,
});

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body),
});

describe('Integração: hook e serviço de notificações', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'token-integracao');
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });

  it('carrega lista, contagem e paginação sem duplicar itens', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      item(String(index + 1))
    );
    fetch.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes('/nao-lidas/contagem'))
        return response({ total_nao_lidas: 20 });
      if (path.includes('offset=20')) {
        return response([item('20'), item('21')]);
      }
      return response(firstPage);
    });

    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(true);
    await act(async () => result.current.carregarMais());

    expect(result.current.notificacoes).toHaveLength(21);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.notificacoes.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['20', '21'])
    );
  });

  it('trata falha inicial e permite recarregar', async () => {
    let failed = true;
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('/nao-lidas/contagem')) {
        return response({ total_nao_lidas: 0 });
      }
      if (failed) {
        failed = false;
        return response({ detail: 'Falha inicial' }, 500);
      }
      return response([item('1')]);
    });

    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Falha inicial');
    expect(result.current.hasMore).toBe(false);

    await act(async () => result.current.recarregar());
    await waitFor(() =>
      expect(result.current.notificacoes).toEqual([item('1')])
    );
    expect(result.current.error).toBe('');
  });

  it('faz rollback de falhas nas ações individuais e em lote', async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path.includes('/nao-lidas/contagem'))
        return response({ total_nao_lidas: 1 });
      if (path.includes('/notificacoes?')) return response([item('1')]);
      if (options.method === 'PATCH')
        return response({ detail: 'Falha de escrita' }, 500);
      return response({});
    });

    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.marcarComoLida('1'));
    expect(result.current.notificacoes[0].lida).toBe(false);
    expect(result.current.error).toBe('Falha de escrita');

    await act(async () => result.current.marcarTodasComoLidas());
    expect(result.current.notificacoes).toEqual([item('1')]);
    expect(result.current.naoLidasCount).toBe(1);
  });

  it('sincroniza contagem ao ficar visível e recarrega quando aumenta', async () => {
    let count = 1;
    fetch.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes('/nao-lidas/contagem'))
        return response({ total_nao_lidas: count });
      return response([item('1')]);
    });

    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    count = 2;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.naoLidasCount).toBe(2));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
  });

  it('ignora polling quando a aba está oculta e falhas de rede', async () => {
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('/nao-lidas/contagem')) {
        return response({ total_nao_lidas: 1 });
      }
      return response([item('1')]);
    });
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fetch).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    fetch.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(result.current.error).toBe('');
  });
});
