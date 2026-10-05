import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from '@/services/processos';
import { useProcessos } from './useProcessos';

vi.mock('@/services/processos', () => ({
  atualizarProcesso: vi.fn(),
  criarProcesso: vi.fn(),
  excluirProcesso: vi.fn(),
  listarProcessos: vi.fn(),
}));

const createProcess = (index = 1, overrides = {}) => ({
  id: `006123${index}-56.2026.8.26.0100`,
  titulo: `Caso ${index}`,
  cliente: `Cliente ${index}`,
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana',
  prazo: '2026-10-05',
  diasRestantes: 8,
  ...overrides,
});

describe('useProcessos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa dados, erro e paginação', () => {
    const processes = Array.from({ length: 6 }, (_, index) =>
      createProcess(index + 1)
    );
    const { result } = renderHook(() =>
      useProcessos(processes, 'Falha inicial')
    );

    expect(result.current.processos).toEqual(processes);
    expect(result.current.visibleProcesses).toEqual(processes.slice(0, 5));
    expect(result.current.totalPages).toBe(2);
    expect(result.current.loadError).toBe('Falha inicial');
  });

  it('recarrega a lista e volta à primeira página', async () => {
    const processes = Array.from({ length: 6 }, (_, index) =>
      createProcess(index + 1)
    );
    const received = [createProcess(8)];
    listarProcessos.mockResolvedValue(received);
    const { result } = renderHook(() => useProcessos(processes, 'Erro'));

    act(() => result.current.setCurrentPage(2));
    await act(async () => result.current.reloadProcesses());

    expect(result.current.processos).toEqual(received);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.loadError).toBe('');
    expect(result.current.isReloading).toBe(false);
  });

  it('mantém os dados e exibe erro quando a recarga falha', async () => {
    const process = createProcess();
    listarProcessos.mockRejectedValue(new Error('API indisponível'));
    const { result } = renderHook(() => useProcessos([process]));

    await act(async () => result.current.reloadProcesses());

    expect(result.current.processos).toEqual([process]);
    expect(result.current.loadError).toBe('API indisponível');
  });

  it('abre o cadastro, cria no início da lista e fecha o formulário', async () => {
    const existing = createProcess(1);
    const created = createProcess(2);
    criarProcesso.mockResolvedValue(created);
    const { result } = renderHook(() => useProcessos([existing]));

    act(() => result.current.openCreateForm());
    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingProcess).toBeNull();

    await act(async () => result.current.saveProcess(created));
    act(() => result.current.closeForm());

    expect(criarProcesso).toHaveBeenCalledWith(created);
    expect(result.current.processos).toEqual([created, existing]);
    expect(result.current.isFormOpen).toBe(false);
  });

  it('edita somente o processo selecionado e atualiza o detalhe aberto', async () => {
    const selected = createProcess(1);
    const other = createProcess(2);
    const updated = { ...selected, titulo: 'Caso atualizado' };
    atualizarProcesso.mockResolvedValue(updated);
    const { result } = renderHook(() => useProcessos([selected, other]));

    act(() => {
      result.current.setDetailProcess(selected);
      result.current.openEditForm(selected);
    });
    await act(async () =>
      result.current.saveProcess({
        titulo: updated.titulo,
      })
    );

    expect(atualizarProcesso).toHaveBeenCalledWith(selected.id, {
      titulo: updated.titulo,
    });
    expect(result.current.processos).toEqual([updated, other]);
    expect(result.current.detailProcess).toEqual(updated);
  });

  it('exclui o selecionado e ajusta uma última página vazia', async () => {
    const processes = Array.from({ length: 6 }, (_, index) =>
      createProcess(index + 1)
    );
    excluirProcesso.mockResolvedValue(undefined);
    const { result } = renderHook(() => useProcessos(processes));

    act(() => {
      result.current.setCurrentPage(2);
      result.current.openDeleteModal(processes[5]);
    });
    await act(async () => result.current.deleteSelectedProcess());

    expect(excluirProcesso).toHaveBeenCalledWith(processes[5].id);
    expect(result.current.processos).toEqual(processes.slice(0, 5));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.deletingProcess).toBeNull();
  });

  it('preserva o processo e o modal quando a exclusão falha', async () => {
    const process = createProcess();
    excluirProcesso.mockRejectedValue(new Error('Processo não encontrado'));
    const { result } = renderHook(() => useProcessos([process]));

    act(() => result.current.openDeleteModal(process));
    await act(async () => result.current.deleteSelectedProcess());

    expect(result.current.processos).toEqual([process]);
    expect(result.current.deletingProcess).toEqual(process);
    expect(result.current.deleteError).toBe('Processo não encontrado');
    expect(result.current.isDeleting).toBe(false);
  });

  it('não exclui nada sem processo selecionado', async () => {
    const { result } = renderHook(() => useProcessos([]));

    await act(async () => result.current.deleteSelectedProcess());

    expect(excluirProcesso).not.toHaveBeenCalled();
  });
});
