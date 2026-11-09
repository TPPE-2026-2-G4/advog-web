import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  filtrarAtividades,
  obterKanbanAtividades,
} from '@/services/atividades';
import { useKanbanAtividades } from './useKanbanAtividades';

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
}));

const kanban = {
  escopo: 'escritorio',
  etapas: [
    { etapa_id: 2, nome: 'Em Execução', ordem: 2, atividades: [] },
    { etapa_id: 1, nome: 'Backlog', ordem: 1, atividades: [] },
  ],
};

describe('useKanbanAtividades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não busca nem carrega quando está desabilitado', () => {
    const { result } = renderHook(() => useKanbanAtividades(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.stages).toEqual([]);
    expect(obterKanbanAtividades).not.toHaveBeenCalled();
  });

  it('marca o carregamento enquanto busca os dados', () => {
    obterKanbanAtividades.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useKanbanAtividades());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('retorna as etapas ordenadas e o escopo recebido', async () => {
    obterKanbanAtividades.mockResolvedValue(kanban);

    const { result } = renderHook(() => useKanbanAtividades());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stages.map((stage) => stage.nome)).toEqual([
      'Backlog',
      'Em Execução',
    ]);
    expect(result.current.scope).toBe('escritorio');
    expect(result.current.error).toBe('');
  });

  it('assume o escopo "usuario" quando a API não informa o escritório', async () => {
    obterKanbanAtividades.mockResolvedValue({ etapas: [] });

    const { result } = renderHook(() => useKanbanAtividades());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scope).toBe('usuario');
  });

  it('limpa as etapas e informa a mensagem de um erro recebido', async () => {
    obterKanbanAtividades.mockRejectedValue(new Error('Falha na API'));

    const { result } = renderHook(() => useKanbanAtividades());

    await waitFor(() => expect(result.current.error).toBe('Falha na API'));
    expect(result.current.stages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    obterKanbanAtividades.mockRejectedValue('falha');

    const { result } = renderHook(() => useKanbanAtividades());

    await waitFor(() =>
      expect(result.current.error).toBe(
        'Não foi possível carregar as atividades.'
      )
    );
  });

  it('busca novamente e limpa o erro ao recarregar', async () => {
    obterKanbanAtividades
      .mockRejectedValueOnce(new Error('Falha na API'))
      .mockResolvedValueOnce(kanban);

    const { result } = renderHook(() => useKanbanAtividades());
    await waitFor(() => expect(result.current.error).toBe('Falha na API'));

    act(() => result.current.reload());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('');
    expect(result.current.stages).toHaveLength(2);
    expect(obterKanbanAtividades).toHaveBeenCalledTimes(2);
  });

  it('ignora respostas pendentes se o hook for desmontado', async () => {
    let resolveRequest;
    obterKanbanAtividades.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const first = renderHook(() => useKanbanAtividades());
    first.unmount();
    await act(async () => {
      resolveRequest(kanban);
    });
    expect(first.result.current.stages).toEqual([]);

    let rejectRequest;
    obterKanbanAtividades.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectRequest = reject;
      })
    );

    const second = renderHook(() => useKanbanAtividades());
    second.unmount();
    await act(async () => {
      rejectRequest(new Error('tarde demais'));
    });
    expect(second.result.current.error).toBe('');
  });
});

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
  filtrarAtividades: vi.fn(),
}));

describe('useKanbanAtividades - filtros', () => {
  const kanbanOriginal = {
    escopo: 'escritorio',
    etapas: [
      {
        etapa_id: 1,
        nome: 'Backlog',
        ordem: 1,
        atividades: [
          { atividade_id: 1, titulo: 'Tarefa A', etapa_id: 1 },
          { atividade_id: 2, titulo: 'Tarefa B', etapa_id: 1 },
        ],
      },
      {
        etapa_id: 2,
        nome: 'Em Execução',
        ordem: 2,
        atividades: [{ atividade_id: 3, titulo: 'Tarefa C', etapa_id: 2 }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    obterKanbanAtividades.mockResolvedValue(kanbanOriginal);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('chama filtrarAtividades após debounce de 300ms quando a busca é preenchida', async () => {
    const atividadesFiltradas = [
      { atividade_id: 1, titulo: 'Tarefa A', etapa_id: 1 },
    ];
    filtrarAtividades.mockResolvedValue(atividadesFiltradas);

    const { result } = renderHook(() => useKanbanAtividades());

    // Aguarda carga inicial
    await act(async () => {
      await Promise.resolve();
    });

    // Dispara preenchimento do filtro
    act(() => {
      result.current.setFilter('busca', 'Tarefa A');
    });

    // Antes dos 300ms, filtrarAtividades não deve ter sido chamada
    expect(filtrarAtividades).not.toHaveBeenCalled();

    // Avança 300ms do debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(filtrarAtividades).toHaveBeenCalledWith({
      busca_textual: 'Tarefa A',
      funcionario_id: undefined,
      prazo_fim: undefined,
    });

    expect(result.current.stages[0].atividades).toHaveLength(1);
    expect(result.current.stages[0].atividades[0].titulo).toBe('Tarefa A');
    expect(result.current.stages[1].atividades).toHaveLength(0);
  });

  it('limpa as atividades filtradas e restaura o quadro base ao chamar clearFilters()', async () => {
    filtrarAtividades.mockResolvedValue([
      { atividade_id: 1, titulo: 'Tarefa A', etapa_id: 1 },
    ]);

    const { result } = renderHook(() => useKanbanAtividades());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setFilter('busca', 'Tarefa');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.stages[0].atividades).toHaveLength(1);

    // Limpa os filtros
    act(() => {
      result.current.clearFilters();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.filters.busca).toBe('');
    expect(result.current.stages[0].atividades).toHaveLength(2);
    expect(result.current.stages[1].atividades).toHaveLength(1);
  });

  it('propaga mensagem de erro caso o endpoint de filtros falhe', async () => {
    filtrarAtividades.mockRejectedValue(new Error('Erro na filtragem'));

    const { result } = renderHook(() => useKanbanAtividades());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setFilter('funcionarioId', '5');
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Erro na filtragem');
    expect(result.current.stages[0].atividades).toHaveLength(0);
  });
});
