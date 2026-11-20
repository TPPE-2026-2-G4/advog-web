import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  obterContagemNaoLidas,
} from '@/services/notificacoes';
import { useNotificacoes } from './useNotificacoes';

vi.mock('@/services/notificacoes', () => ({
  listarNotificacoes: vi.fn(),
  marcarNotificacaoComoLida: vi.fn(),
  marcarTodasNotificacoesComoLidas: vi.fn(),
  obterContagemNaoLidas: vi.fn(),
}));

const item = (id, lida = false) => ({
  id,
  titulo: `Notificação ${id}`,
  mensagem: 'Mensagem',
  tipo: 'SISTEMA',
  lida,
  criado_em: '2026-11-12T12:00:00Z',
  link_destino: null,
});

describe('useNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    listarNotificacoes.mockResolvedValue([item('1')]);
    obterContagemNaoLidas.mockResolvedValue(1);
    marcarNotificacaoComoLida.mockResolvedValue(item('1', true));
    marcarTodasNotificacoesComoLidas.mockResolvedValue({ alteradas: 1 });
  });

  it('carrega a primeira página e a contagem', async () => {
    const { result } = renderHook(() => useNotificacoes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notificacoes).toEqual([item('1')]);
    expect(result.current.naoLidasCount).toBe(1);
    expect(listarNotificacoes).toHaveBeenCalledWith({
      apenasNaoLidas: false,
      limite: 20,
      offset: 0,
    });
  });

  it('faz paginação sem duplicar IDs', async () => {
    listarNotificacoes
      .mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, index) => item(String(index + 1)))
      )
      .mockResolvedValueOnce([item('1'), item('2')]);
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.carregarMais());

    expect(result.current.notificacoes.map(({ id }) => id)).toContain('2');
    expect(listarNotificacoes).toHaveBeenLastCalledWith({
      apenasNaoLidas: false,
      limite: 20,
      offset: 20,
    });
  });

  it('atualiza uma notificação otimisticamente', async () => {
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.marcarComoLida('1'));
    expect(result.current.notificacoes[0].lida).toBe(true);
    expect(result.current.naoLidasCount).toBe(0);
    expect(marcarNotificacaoComoLida).toHaveBeenCalledWith('1');
  });

  it('restaura a notificação quando a API falha ao marcar como lida', async () => {
    marcarNotificacaoComoLida.mockRejectedValueOnce(new Error('Falha'));
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.marcarComoLida('1'));

    expect(result.current.error).toBe('Falha');
    expect(result.current.notificacoes[0].lida).toBe(false);
    expect(result.current.naoLidasCount).toBe(1);
  });

  it('não requisita novamente uma notificação já lida', async () => {
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.marcarComoLida('1'));
    const chamadas = marcarNotificacaoComoLida.mock.calls.length;
    marcarNotificacaoComoLida.mockRejectedValueOnce(new Error('Falha'));
    await act(async () => result.current.marcarComoLida('1'));
    expect(marcarNotificacaoComoLida).toHaveBeenCalledTimes(chamadas);
  });

  it('remove o item no filtro de não lidas e marca todas com rollback', async () => {
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.alternarFiltro());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.marcarTodasComoLidas());
    expect(result.current.naoLidasCount).toBe(0);
    await waitFor(() => expect(result.current.notificacoes).toEqual([]));
    expect(marcarTodasNotificacoesComoLidas).toHaveBeenCalled();
  });

  it('recarrega e alterna o filtro', async () => {
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.recarregar());
    await waitFor(() => expect(listarNotificacoes).toHaveBeenCalledTimes(2));

    await act(async () => result.current.alternarFiltro());
    await waitFor(() =>
      expect(listarNotificacoes).toHaveBeenLastCalledWith({
        apenasNaoLidas: true,
        limite: 20,
        offset: 0,
      })
    );
    expect(result.current.apenasNaoLidas).toBe(true);
  });

  it('sincroniza a contagem quando a aba fica visível e recarrega ao aumentar', async () => {
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.naoLidasCount).toBe(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    obterContagemNaoLidas.mockResolvedValue(2);
    await act(async () => {
      await Promise.resolve();
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.naoLidasCount).toBe(2));
    await waitFor(() => expect(listarNotificacoes).toHaveBeenCalledTimes(2));
  });

  it('mantém o estado quando o polling está oculto ou falha', async () => {
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {});

    expect(result.current.naoLidasCount).toBe(1);
    expect(obterContagemNaoLidas).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    obterContagemNaoLidas.mockRejectedValueOnce(new Error('offline'));
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {});
    expect(result.current.naoLidasCount).toBe(1);
  });

  it('exibe erro padrão quando falha ao carregar mais', async () => {
    listarNotificacoes
      .mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, index) => item(String(index + 1)))
      )
      .mockRejectedValueOnce(new Error('Falha de paginação'));
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.carregarMais());

    expect(result.current.error).toBe('Falha de paginação');
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('restaura a lista quando marcar todas falha', async () => {
    marcarTodasNotificacoesComoLidas.mockRejectedValueOnce(
      new Error('Falha em lote')
    );
    const { result } = renderHook(() => useNotificacoes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.marcarTodasComoLidas());

    expect(result.current.error).toBe('Falha em lote');
    expect(result.current.notificacoes).toEqual([item('1')]);
    expect(result.current.naoLidasCount).toBe(1);
  });
});
