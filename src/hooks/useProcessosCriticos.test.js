import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarProcessosCriticos, obterProcesso } from '@/services/processos';
import {
  PROCESS_REFRESH_MS,
  useProcessosCriticos,
} from './useProcessosCriticos';

vi.mock('@/services/processos', () => ({
  listarProcessosCriticos: vi.fn(),
  obterProcesso: vi.fn(),
}));

const mockProcesses = [
  {
    processo_id: 1,
    cnj: '0061234-56.2026.8.26.0100',
    titulo: 'Processo 1',
    data_realizado: '2026-10-10',
    data_inicio: '2026-09-01',
  },
  {
    processo_id: 2,
    cnj: '0087890-12.2026.8.26.0577',
    titulo: 'Processo 2',
    data_realizado: '2026-09-01',
    data_inicio: '2026-08-01',
  },
];

describe('useProcessosCriticos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('não busca processos quando enabled é false', () => {
    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: false })
    );

    expect(listarProcessosCriticos).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.processos).toEqual([]);
  });

  it('carrega e ordena processos críticos ao iniciar habilitado', async () => {
    listarProcessosCriticos.mockResolvedValueOnce(mockProcesses);

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true, diasSemMovimentacao: 15 })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(listarProcessosCriticos).toHaveBeenCalledWith({
      diasSemMovimentacao: 15,
      funcionarioId: undefined,
    });
    expect(result.current.processos[0].processo_id).toBe(2);
    expect(result.current.processos[1].processo_id).toBe(1);
    expect(result.current.error).toBe('');
  });

  it('armazena mensagem de erro quando a busca inicial falha', async () => {
    listarProcessosCriticos.mockRejectedValueOnce(new Error('Erro de conexão'));

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Erro de conexão');
    expect(result.current.processos).toEqual([]);
  });

  it('recarrega processos manualmente via reload', async () => {
    listarProcessosCriticos
      .mockResolvedValueOnce([mockProcesses[0]])
      .mockResolvedValueOnce(mockProcesses);

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true })
    );

    await waitFor(() => {
      expect(result.current.processos).toHaveLength(1);
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.processos).toHaveLength(2);
    });
  });

  it('atualiza ao retomar foco com aba visível', async () => {
    listarProcessosCriticos
      .mockResolvedValueOnce([mockProcesses[0]])
      .mockResolvedValueOnce(mockProcesses);

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true })
    );

    await waitFor(() => {
      expect(result.current.processos).toHaveLength(1);
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(result.current.processos).toHaveLength(2);
    });
  });

  it('gerencia abertura e detalhes do modal com sucesso', async () => {
    listarProcessosCriticos.mockResolvedValueOnce(mockProcesses);
    const detailedProcess = {
      ...mockProcesses[0],
      descricao: 'Detalhes completos',
    };
    obterProcesso.mockResolvedValueOnce(detailedProcess);

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true })
    );

    await waitFor(() => {
      expect(result.current.processos).toHaveLength(2);
    });

    act(() => {
      result.current.openDetail(mockProcesses[0]);
    });

    expect(result.current.detailProcess).toEqual(mockProcesses[0]);

    await waitFor(() => {
      expect(result.current.detailProcess).toEqual(detailedProcess);
      expect(result.current.isDetailLoading).toBe(false);
    });

    act(() => {
      result.current.closeDetail();
    });

    expect(result.current.detailProcess).toBeNull();
  });

  it('trata erro quando obterProcesso falha ou não encontra o processo', async () => {
    listarProcessosCriticos.mockResolvedValueOnce(mockProcesses);
    obterProcesso.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true })
    );

    await waitFor(() => {
      expect(result.current.processos).toHaveLength(2);
    });

    act(() => {
      result.current.openDetail(mockProcesses[0]);
    });

    await waitFor(() => {
      expect(result.current.detailError).toBe(
        'Processo não encontrado ou removido.'
      );
    });

    obterProcesso.mockRejectedValueOnce(new Error('Falha no servidor'));
    act(() => {
      result.current.retryDetail();
    });

    await waitFor(() => {
      expect(result.current.detailError).toBe('Falha no servidor');
    });
  });

  it('lida com rejeição não-Error e chamadas sem processo em openDetail/retryDetail', async () => {
    listarProcessosCriticos.mockRejectedValueOnce('falha-generica');

    const { result } = renderHook(() =>
      useProcessosCriticos({ enabled: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Não foi possível carregar os processos críticos.'
      );
    });

    act(() => {
      result.current.openDetail(null);
      result.current.retryDetail();
    });
    expect(result.current.detailProcess).toBeNull();

    act(() => {
      result.current.openDetail({ cnj: 'apenas-cnj' });
    });
    expect(result.current.detailProcess).toEqual({ cnj: 'apenas-cnj' });

    obterProcesso.mockRejectedValueOnce('falha-detalhe');
    act(() => {
      result.current.openDetail({ processo_id: 88 });
    });
    await waitFor(() => {
      expect(result.current.detailError).toBe(
        'Não foi possível carregar os detalhes do processo.'
      );
    });
  });

  it('aciona timer periódico de refresh quando a aba está visível e ignora quando oculta', async () => {
    vi.useFakeTimers();
    listarProcessosCriticos.mockResolvedValue(mockProcesses);

    renderHook(() => useProcessosCriticos({ enabled: true }));

    await vi.advanceTimersByTimeAsync(0);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    await vi.advanceTimersByTimeAsync(PROCESS_REFRESH_MS);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    await vi.advanceTimersByTimeAsync(PROCESS_REFRESH_MS);

    expect(listarProcessosCriticos).toHaveBeenCalled();
  });
});
