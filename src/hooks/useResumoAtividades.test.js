import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obterResumoAtividades } from '@/services/dashboard';
import { EMPTY_ACTIVITY_SUMMARY } from '@/utils/atividade';
import { useResumoAtividades } from './useResumoAtividades';

vi.mock('@/services/dashboard', () => ({
  obterResumoAtividades: vi.fn(),
}));

describe('useResumoAtividades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não busca nem carrega quando está desabilitado', () => {
    const { result } = renderHook(() => useResumoAtividades(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.summary).toEqual(EMPTY_ACTIVITY_SUMMARY);
    expect(obterResumoAtividades).not.toHaveBeenCalled();
  });

  it('marca o carregamento enquanto busca os dados', () => {
    obterResumoAtividades.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useResumoAtividades());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('formata e retorna o resumo recebido da API', async () => {
    obterResumoAtividades.mockResolvedValue({
      escopo: 'escritorio',
      pendentes: '3',
      em_execucao: 7,
      concluidas: 4,
      atrasadas: 2,
    });

    const { result } = renderHook(() => useResumoAtividades());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.summary).toEqual({
      escopo: 'escritorio',
      pendentes: 3,
      em_execucao: 7,
      concluidas: 4,
      atrasadas: 2,
    });
    expect(result.current.error).toBe('');
  });

  it('zera o resumo e informa a mensagem de um erro recebido', async () => {
    obterResumoAtividades.mockRejectedValue(new Error('Falha na API'));

    const { result } = renderHook(() => useResumoAtividades());

    await waitFor(() => expect(result.current.error).toBe('Falha na API'));
    expect(result.current.summary).toEqual(EMPTY_ACTIVITY_SUMMARY);
    expect(result.current.isLoading).toBe(false);
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    obterResumoAtividades.mockRejectedValue('falha');

    const { result } = renderHook(() => useResumoAtividades());

    await waitFor(() =>
      expect(result.current.error).toBe(
        'Não foi possível carregar o resumo de atividades.'
      )
    );
  });

  it('busca novamente e limpa o erro ao recarregar', async () => {
    obterResumoAtividades
      .mockRejectedValueOnce(new Error('Falha na API'))
      .mockResolvedValueOnce({ escopo: 'usuario', pendentes: 1 });

    const { result } = renderHook(() => useResumoAtividades());
    await waitFor(() => expect(result.current.error).toBe('Falha na API'));

    act(() => result.current.reload());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('');
    expect(result.current.summary.pendentes).toBe(1);
    expect(obterResumoAtividades).toHaveBeenCalledTimes(2);
  });

  it('ignora uma resposta pendente se o hook for desmontado', async () => {
    let resolveRequest;
    obterResumoAtividades.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useResumoAtividades());
    unmount();

    await act(async () => {
      resolveRequest({ escopo: 'usuario', pendentes: 9 });
    });

    expect(result.current.summary).toEqual(EMPTY_ACTIVITY_SUMMARY);
  });

  it('ignora uma falha pendente se o hook for desmontado', async () => {
    let rejectRequest;
    obterResumoAtividades.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
    );

    const { result, unmount } = renderHook(() => useResumoAtividades());
    unmount();

    await act(async () => {
      rejectRequest(new Error('tarde demais'));
    });

    expect(result.current.error).toBe('');
  });
});
