import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '@/utils/exportacao';
import { useExportarRelatorio } from './useExportarRelatorio';

vi.mock('@/utils/exportacao', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadBlob: vi.fn(),
}));

describe('useExportarRelatorio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('inicia sem exportar e sem erro', () => {
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request: vi.fn() })
    );

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBe('');
  });

  it('solicita o formato escolhido e baixa o arquivo com o nome do relatório', async () => {
    const blob = new Blob(['dados']);
    const request = vi.fn().mockResolvedValue(blob);
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request })
    );

    await act(() => result.current.exportReport('xlsx'));

    expect(request).toHaveBeenCalledWith('xlsx');
    expect(downloadBlob).toHaveBeenCalledWith(
      blob,
      expect.stringMatching(/^processos_\d{8}\.xlsx$/)
    );
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBe('');
  });

  it('marca o estado de exportação enquanto aguarda a resposta', async () => {
    let resolveRequest;
    const request = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request })
    );

    let pending;
    act(() => {
      pending = result.current.exportReport('pdf');
    });
    expect(result.current.isExporting).toBe(true);

    await act(async () => {
      resolveRequest(new Blob([]));
      await pending;
    });
    expect(result.current.isExporting).toBe(false);
  });

  it('ignora um novo pedido enquanto outro está em andamento', async () => {
    let resolveRequest;
    const request = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request })
    );

    let first;
    act(() => {
      first = result.current.exportReport('pdf');
    });
    await act(() => result.current.exportReport('csv'));

    expect(request).toHaveBeenCalledOnce();

    await act(async () => {
      resolveRequest(new Blob([]));
      await first;
    });
  });

  it('informa a mensagem do erro e não baixa nada quando a exportação falha', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Falha na API'));
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request })
    );

    await act(() => result.current.exportReport('pdf'));

    expect(result.current.exportError).toBe('Falha na API');
    expect(result.current.isExporting).toBe(false);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    const request = vi.fn().mockRejectedValue('falha');
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request })
    );

    await act(() => result.current.exportReport('pdf'));

    expect(result.current.exportError).toBe(
      'Não foi possível exportar o relatório.'
    );
  });

  it('limpa o erro anterior ao exportar novamente', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('Falha na API'))
      .mockResolvedValueOnce(new Blob([]));
    const { result } = renderHook(() =>
      useExportarRelatorio({ baseName: 'processos', request })
    );

    await act(() => result.current.exportReport('pdf'));
    expect(result.current.exportError).toBe('Falha na API');

    await act(() => result.current.exportReport('pdf'));
    expect(result.current.exportError).toBe('');
  });
});
