import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarProdutividadeEquipe } from '@/services/atividades';
import { useProdutividadeEquipe } from './useProdutividadeEquipe';

vi.mock('@/services/atividades', () => ({
  listarProdutividadeEquipe: vi.fn(),
}));

describe('useProdutividadeEquipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia sem carregar quando está desabilitado', () => {
    const { result } = renderHook(() => useProdutividadeEquipe());

    expect(result.current).toEqual({
      productivity: [],
      isLoading: false,
      error: '',
    });
    expect(listarProdutividadeEquipe).not.toHaveBeenCalled();
  });

  it('marca o estado de carregamento enquanto busca os dados', async () => {
    listarProdutividadeEquipe.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProdutividadeEquipe(true));

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.error).toBe('');
    expect(listarProdutividadeEquipe).toHaveBeenCalledOnce();
  });

  it('formata e retorna a produtividade recebida da API', async () => {
    listarProdutividadeEquipe.mockResolvedValue([
      { nome: 'Ana', finalizadas: '3', progresso: '60' },
    ]);

    const { result } = renderHook(() => useProdutividadeEquipe(true));

    await waitFor(() =>
      expect(result.current.productivity).toEqual([
        {
          nome: 'Ana',
          finalizadas: 3,
          em_andamento: 0,
          a_fazer: 0,
          atrasadas: 0,
          progresso: 60,
        },
      ])
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('limpa a produtividade e informa a mensagem de um erro recebido', async () => {
    listarProdutividadeEquipe.mockRejectedValue(new Error('Falha na API'));

    const { result } = renderHook(() => useProdutividadeEquipe(true));

    await waitFor(() => expect(result.current.error).toBe('Falha na API'));
    expect(result.current.productivity).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    listarProdutividadeEquipe.mockRejectedValue('falha');

    const { result } = renderHook(() => useProdutividadeEquipe(true));

    await waitFor(() =>
      expect(result.current.error).toBe(
        'Não foi possível carregar a produtividade da equipe.'
      )
    );
    expect(result.current.productivity).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('limpa os dados e o erro quando é desabilitado', async () => {
    listarProdutividadeEquipe.mockResolvedValue([{ finalizadas: 2 }]);

    const { result, rerender } = renderHook(
      ({ enabled }) => useProdutividadeEquipe(enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.productivity).toHaveLength(1));
    rerender({ enabled: false });

    await waitFor(() =>
      expect(result.current).toEqual({
        productivity: [],
        isLoading: false,
        error: '',
      })
    );
  });

  it('ignora uma resposta pendente se o hook for desabilitado', async () => {
    let resolveRequest;
    listarProdutividadeEquipe.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const { result, rerender } = renderHook(
      ({ enabled }) => useProdutividadeEquipe(enabled),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    rerender({ enabled: false });

    await act(async () => {
      resolveRequest([{ finalizadas: 5 }]);
    });

    expect(result.current).toEqual({
      productivity: [],
      isLoading: false,
      error: '',
    });
  });
});
