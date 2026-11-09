import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarProcessos } from '@/services/processos';
import { usePrazosProximos } from './usePrazosProximos';

vi.mock('@/services/processos', () => ({
  listarProcessos: vi.fn(),
}));

describe('usePrazosProximos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não busca processos quando está desabilitado por booleano', () => {
    const { result } = renderHook(() => usePrazosProximos(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.processos).toEqual([]);
    expect(result.current.error).toBe('');
    expect(listarProcessos).not.toHaveBeenCalled();
  });

  it('busca prazos próximos da página paginada e ordena pelo vencimento', async () => {
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const fiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    listarProcessos.mockResolvedValue({
      itens: [
        {
          processo_id: 2,
          titulo: 'Prazo em 5 dias',
          status: 'Ativo',
          data_prazo: fiveDays,
        },
        {
          processo_id: 1,
          titulo: 'Prazo em 2 dias',
          status: 'Ativo',
          data_prazo: tomorrow,
        },
        {
          processo_id: 3,
          titulo: 'Processo concluído',
          status: 'Concluído',
          data_prazo: tomorrow,
        },
      ],
    });

    const { result } = renderHook(() =>
      usePrazosProximos({ diasPrazo: 15, limite: 5 })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(listarProcessos).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 100,
      })
    );
    expect(result.current.error).toBe('');
    expect(result.current.processos.map((p) => p.processo_id)).toEqual([1, 2]);
  });

  it('aceita retorno em array direto ou objeto vazio sem falhar', async () => {
    const today = new Date().toISOString().slice(0, 10);
    listarProcessos.mockResolvedValueOnce([
      { processo_id: 10, titulo: 'Hoje', status: 'Ativo', data_prazo: today },
    ]);

    const { result } = renderHook(() => usePrazosProximos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.processos).toHaveLength(1);

    listarProcessos.mockResolvedValueOnce({});
    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.processos).toEqual([]);
  });

  it('registra erro de instância Error e permite recarregar', async () => {
    listarProcessos
      .mockRejectedValueOnce(new Error('Falha ao buscar prazos'))
      .mockResolvedValueOnce({ itens: [] });

    const { result } = renderHook(() => usePrazosProximos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe('Falha ao buscar prazos');
    expect(result.current.processos).toEqual([]);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe('');
  });

  it('usa mensagem padrão quando o erro não é instância de Error', async () => {
    listarProcessos.mockRejectedValueOnce('erro inesperado');

    const { result } = renderHook(() => usePrazosProximos());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe(
      'Não foi possível carregar os prazos próximos.'
    );
  });

  it('ignora resoluções e rejeições tardias após desmontar', async () => {
    let resolveLate;
    listarProcessos.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLate = resolve;
      })
    );

    const { unmount } = renderHook(() => usePrazosProximos());
    unmount();
    resolveLate({ itens: [] });

    let rejectLate;
    listarProcessos.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectLate = reject;
      })
    );

    const second = renderHook(() => usePrazosProximos());
    second.unmount();
    rejectLate(new Error('tardio'));

    await Promise.resolve();
    expect(listarProcessos).toHaveBeenCalledTimes(2);
  });
});
