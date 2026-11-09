import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obterResumoProcessos } from '@/services/processos';
import { EMPTY_PROCESS_SUMMARY } from '@/utils/processo';
import { useResumoProcessos } from './useResumoProcessos';

vi.mock('@/services/processos', () => ({
  obterResumoProcessos: vi.fn(),
}));

describe('useResumoProcessos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não busca nem carrega quando está desabilitado', () => {
    const { result } = renderHook(() => useResumoProcessos(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.summary).toEqual(EMPTY_PROCESS_SUMMARY);
    expect(obterResumoProcessos).not.toHaveBeenCalled();
  });

  it('aceita objeto de opções com diasProximoPrazo e funcionarioId', async () => {
    obterResumoProcessos.mockResolvedValue({
      total: 5,
      em_andamento: 3,
      em_analise: 1,
      finalizados: 1,
      proximos_do_prazo: 2,
      atrasados: 0,
    });

    const { result } = renderHook(() =>
      useResumoProcessos({
        enabled: true,
        diasProximoPrazo: 10,
        funcionarioId: 4,
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(obterResumoProcessos).toHaveBeenCalledWith({
      diasProximoPrazo: 10,
      funcionarioId: 4,
    });
    expect(result.current.summary.em_andamento).toBe(3);
  });

  it('marca o carregamento enquanto busca os dados', () => {
    obterResumoProcessos.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useResumoProcessos());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('formata e retorna o resumo recebido da API', async () => {
    obterResumoProcessos.mockResolvedValue({
      total: '7',
      em_andamento: 4,
      em_analise: 2,
      finalizados: 1,
      proximos_do_prazo: 2,
      atrasados: 1,
    });

    const { result } = renderHook(() => useResumoProcessos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary).toEqual({
      total: 7,
      em_andamento: 4,
      em_analise: 2,
      finalizados: 1,
      proximos_do_prazo: 2,
      atrasados: 1,
    });
    expect(result.current.error).toBe('');
  });

  it('zera o resumo e informa a mensagem de um erro recebido', async () => {
    obterResumoProcessos.mockRejectedValue(new Error('Falha na API'));

    const { result } = renderHook(() => useResumoProcessos());

    await waitFor(() => expect(result.current.error).toBe('Falha na API'));
    expect(result.current.summary).toEqual(EMPTY_PROCESS_SUMMARY);
    expect(result.current.isLoading).toBe(false);
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    obterResumoProcessos.mockRejectedValue('falha');

    const { result } = renderHook(() => useResumoProcessos());

    await waitFor(() =>
      expect(result.current.error).toBe(
        'Não foi possível carregar o resumo de processos.'
      )
    );
  });

  it('busca novamente e limpa o erro ao recarregar', async () => {
    obterResumoProcessos
      .mockRejectedValueOnce(new Error('Falha na API'))
      .mockResolvedValueOnce({ em_andamento: 4 });

    const { result } = renderHook(() => useResumoProcessos());
    await waitFor(() => expect(result.current.error).toBe('Falha na API'));

    act(() => result.current.reload());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('');
    expect(result.current.summary.em_andamento).toBe(4);
    expect(obterResumoProcessos).toHaveBeenCalledTimes(2);
  });

  it('ignora uma resposta pendente se o hook for desmontado', async () => {
    let resolveRequest;
    obterResumoProcessos.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useResumoProcessos());
    unmount();

    await act(async () => {
      resolveRequest({ em_andamento: 9 });
    });

    expect(result.current.summary).toEqual(EMPTY_PROCESS_SUMMARY);
  });

  it('ignora uma falha pendente se o hook for desmontado', async () => {
    let rejectRequest;
    obterResumoProcessos.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
    );

    const { result, unmount } = renderHook(() => useResumoProcessos());
    unmount();

    await act(async () => {
      rejectRequest(new Error('tarde demais'));
    });

    expect(result.current.error).toBe('');
  });
});
