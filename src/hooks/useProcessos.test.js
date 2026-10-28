import { act, renderHook, waitFor } from '@testing-library/react';
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

const responsaveis = [{ value: '3', label: 'Ana Paula' }];

const createApiProcess = (index = 1, overrides = {}) => ({
  processo_id: index,
  cnj: `006123${index}-56.2026.8.26.0100`,
  titulo_proc: `Caso ${index}`,
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: null,
  responsavel_id: 3,
  ...overrides,
});

const apiPage = (itens, { total = itens.length, page = 1 } = {}) => ({
  itens,
  total,
  page,
  page_size: 5,
  total_pages: Math.max(1, Math.ceil(total / 5)),
});

const initialPageOf = (itens, total = itens.length, page = 1) => ({
  itens,
  total,
  page,
  pageSize: 5,
  totalPages: Math.max(1, Math.ceil(total / 5)),
});

const renderProcessos = (initialPage, initialError = '') =>
  renderHook(() => useProcessos({ initialPage, initialError, responsaveis }));

describe('useProcessos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia com a página entregue pelo servidor sem buscar novamente', () => {
    const { result } = renderProcessos(
      initialPageOf([createApiProcess(1)], 7),
      'Falha inicial'
    );

    expect(result.current.processos).toEqual([createApiProcess(1)]);
    expect(result.current.totalItems).toBe(7);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.loadError).toBe('Falha inicial');
    expect(result.current.currentPage).toBe(1);
    expect(listarProcessos).not.toHaveBeenCalled();
  });

  it('busca a página solicitada quando a paginação muda', async () => {
    listarProcessos.mockResolvedValue(
      apiPage([createApiProcess(6)], { total: 6, page: 2 })
    );
    const { result } = renderProcessos(initialPageOf([createApiProcess(1)], 6));

    act(() => result.current.setCurrentPage(2));

    await waitFor(() => {
      expect(result.current.processos).toEqual([createApiProcess(6)]);
    });
    expect(listarProcessos).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 5 })
    );
    expect(result.current.currentPage).toBe(2);
  });

  it.each([
    {
      cenario: 'filtro de status',
      alteracoes: [['status', 'Concluído']],
      parametrosEsperados: { status: 'Concluído', page: 1 },
    },
    {
      cenario: 'filtro de responsável',
      alteracoes: [['responsavelId', '3']],
      parametrosEsperados: { responsavelId: '3', page: 1 },
    },
    {
      cenario: 'intervalo de prazo válido',
      alteracoes: [
        ['prazoInicio', '2026-09-01'],
        ['prazoFim', '2026-09-30'],
      ],
      parametrosEsperados: {
        prazoInicio: '2026-09-01',
        prazoFim: '2026-09-30',
        page: 1,
      },
    },
  ])(
    'volta à primeira página e consulta o servidor ao aplicar $cenario',
    async ({ alteracoes, parametrosEsperados }) => {
      listarProcessos.mockResolvedValue(apiPage([]));
      const { result } = renderProcessos(
        initialPageOf([createApiProcess(1)], 6)
      );

      act(() => result.current.setCurrentPage(2));
      act(() => {
        for (const [campo, valor] of alteracoes) {
          result.current.setFilter(campo, valor);
        }
      });

      await waitFor(() => {
        expect(listarProcessos).toHaveBeenLastCalledWith(
          expect.objectContaining(parametrosEsperados)
        );
      });
      expect(result.current.currentPage).toBe(1);
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.dateRangeError).toBe('');
    }
  );

  it('aplica a busca por texto somente após a pausa de digitação', async () => {
    listarProcessos.mockResolvedValue(apiPage([createApiProcess(1)]));
    const { result } = renderProcessos(initialPageOf([]));

    act(() => result.current.setFilter('busca', '0061'));

    expect(listarProcessos).not.toHaveBeenCalledWith(
      expect.objectContaining({ busca: '0061' })
    );

    await waitFor(() => {
      expect(listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ busca: '0061' })
      );
    });
  });

  it('não consulta o servidor com intervalo de prazo inválido', () => {
    const { result } = renderProcessos(initialPageOf([]));

    act(() => {
      result.current.setFilter('prazoInicio', '2026-10-10');
      result.current.setFilter('prazoFim', '2026-10-01');
    });

    expect(result.current.dateRangeError).toBe(
      'A data inicial não pode ser posterior à data final.'
    );
    expect(listarProcessos).not.toHaveBeenCalled();
  });

  it.each([
    {
      cenario: 'instância de Error retornada pelo serviço',
      rejeicao: new Error('Backend fora do ar'),
      mensagemEsperada: 'Backend fora do ar',
    },
    {
      cenario: 'rejeição que não é um Error',
      rejeicao: 'falha',
      mensagemEsperada: 'Não foi possível carregar os processos.',
    },
  ])(
    'mantém os dados e exibe a mensagem apropriada quando a recarga falha ($cenario)',
    async ({ rejeicao, mensagemEsperada }) => {
      listarProcessos.mockRejectedValue(rejeicao);
      const { result } = renderProcessos(initialPageOf([createApiProcess(1)]));

      act(() => result.current.reloadProcesses());

      await waitFor(() => {
        expect(result.current.loadError).toBe(mensagemEsperada);
      });
      expect(result.current.processos).toEqual([createApiProcess(1)]);
      expect(result.current.isReloading).toBe(false);
    }
  );

  it.each([
    {
      modo: 'criação',
      openAction: (hook) => hook.openCreateForm(),
      expectedEditing: null,
    },
    {
      modo: 'edição',
      openAction: (hook, proc) => hook.openEditForm(proc),
      expectedEditing: createApiProcess(1),
    },
  ])(
    'controla a abertura e o fechamento do formulário em modo de $modo',
    ({ openAction, expectedEditing }) => {
      const selected = createApiProcess(1);
      const { result } = renderProcessos(initialPageOf([selected]));

      act(() => openAction(result.current, selected));
      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.editingProcess).toEqual(expectedEditing);

      act(() => result.current.closeForm());
      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.editingProcess).toBeNull();
    }
  );

  it('cadastra, volta à primeira página e recarrega do servidor', async () => {
    criarProcesso.mockResolvedValue(createApiProcess(9));
    listarProcessos.mockResolvedValue(
      apiPage([createApiProcess(9)], { total: 1 })
    );
    const { result } = renderProcessos(
      initialPageOf([createApiProcess(1)], 6, 2)
    );

    act(() => result.current.setCurrentPage(2));
    act(() => result.current.openCreateForm());

    await act(async () => {
      await result.current.saveProcess({ titulo: 'Novo' });
    });

    expect(criarProcesso).toHaveBeenCalledWith({ titulo: 'Novo' });
    await waitFor(() => {
      expect(listarProcessos).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
    expect(result.current.currentPage).toBe(1);
  });

  it.each([
    {
      cenario:
        'atualiza o detalhe aberto quando corresponde ao processo editado',
      detalheInicial: createApiProcess(1),
      detalheEsperado: expect.objectContaining({
        processo_id: 1,
        titulo_proc: 'Caso editado',
      }),
    },
    {
      cenario: 'mantém o detalhe aberto quando pertence a outro processo',
      detalheInicial: createApiProcess(2),
      detalheEsperado: createApiProcess(2),
    },
  ])(
    'edita o processo selecionado e $cenario',
    async ({ detalheInicial, detalheEsperado }) => {
      const selected = createApiProcess(1);
      atualizarProcesso.mockResolvedValue(
        createApiProcess(1, { titulo_proc: 'Caso editado' })
      );
      listarProcessos.mockResolvedValue(
        apiPage([createApiProcess(1, { titulo_proc: 'Caso editado' })])
      );
      const { result } = renderProcessos(initialPageOf([selected]));

      act(() => {
        result.current.setDetailProcess(detalheInicial);
        result.current.openEditForm(selected);
      });

      await act(async () => {
        await result.current.saveProcess({ titulo: 'Caso editado' });
      });

      expect(atualizarProcesso).toHaveBeenCalledWith(selected.processo_id, {
        titulo: 'Caso editado',
      });
      expect(result.current.detailProcess).toEqual(detalheEsperado);
      await waitFor(() => {
        expect(listarProcessos).toHaveBeenCalled();
      });
    }
  );

  it('exclui o selecionado e recua para uma página que ainda existe', async () => {
    excluirProcesso.mockResolvedValue(undefined);
    listarProcessos.mockResolvedValue(
      apiPage([createApiProcess(1)], { total: 5 })
    );
    const { result } = renderProcessos(
      initialPageOf([createApiProcess(6)], 6, 2)
    );

    act(() => result.current.setCurrentPage(2));
    act(() => result.current.openDeleteModal(createApiProcess(6)));

    await act(async () => {
      await result.current.deleteSelectedProcess();
    });

    expect(excluirProcesso).toHaveBeenCalledWith(
      createApiProcess(6).processo_id
    );
    expect(result.current.deletingProcess).toBeNull();
    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
    });
  });

  it.each([
    {
      cenario: 'instância de Error retornada pelo serviço',
      rejeicao: new Error('Não pode excluir'),
      mensagemEsperada: 'Não pode excluir',
    },
    {
      cenario: 'rejeição que não é um Error',
      rejeicao: 'falha',
      mensagemEsperada: 'Não foi possível excluir o processo.',
    },
  ])(
    'preserva o processo e o modal quando a exclusão falha ($cenario)',
    async ({ rejeicao, mensagemEsperada }) => {
      const process = createApiProcess(1);
      excluirProcesso.mockRejectedValue(rejeicao);
      const { result } = renderProcessos(initialPageOf([process]));

      act(() => result.current.openDeleteModal(process));

      await act(async () => {
        await result.current.deleteSelectedProcess();
      });

      expect(result.current.deletingProcess).toEqual(process);
      expect(result.current.deleteError).toBe(mensagemEsperada);
      expect(result.current.isDeleting).toBe(false);
      expect(listarProcessos).not.toHaveBeenCalled();
    }
  );

  it('indica a recarga enquanto a requisição de página está pendente', async () => {
    let resolvePage;
    listarProcessos.mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      })
    );
    const { result } = renderProcessos(initialPageOf([createApiProcess(1)], 6));

    act(() => result.current.setCurrentPage(2));
    expect(result.current.isReloading).toBe(true);

    await act(async () => {
      resolvePage(apiPage([createApiProcess(6)], { total: 6, page: 2 }));
    });

    expect(result.current.isReloading).toBe(false);
  });

  it('ignora respostas antigas quando uma página mais recente já foi carregada', async () => {
    const pending = [];
    listarProcessos.mockImplementation(
      () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
    );
    const { result } = renderProcessos(
      initialPageOf([createApiProcess(1)], 12)
    );

    act(() => result.current.setCurrentPage(2));
    act(() => result.current.setCurrentPage(3));

    await act(async () => {
      pending[1].resolve(
        apiPage([createApiProcess(12)], { total: 12, page: 3 })
      );
    });
    await act(async () => {
      pending[0].reject(new Error('Falha antiga'));
    });

    expect(result.current.loadError).toBe('');
    expect(result.current.processos[0].cnj).toBe(createApiProcess(12).cnj);
  });

  it('não fecha o modal de exclusão enquanto a exclusão está em andamento', async () => {
    let resolveDelete;
    excluirProcesso.mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    listarProcessos.mockResolvedValue(apiPage([]));
    const process = createApiProcess(1);
    const { result } = renderProcessos(initialPageOf([process]));

    act(() => result.current.openDeleteModal(process));
    act(() => {
      result.current.deleteSelectedProcess();
    });
    await waitFor(() => expect(result.current.isDeleting).toBe(true));

    act(() => result.current.closeDeleteModal());
    expect(result.current.deletingProcess).toEqual(process);

    await act(async () => {
      resolveDelete();
    });
  });

  it('fecha o modal de exclusão quando nenhuma exclusão está em andamento', () => {
    const process = createApiProcess(1);
    const { result } = renderProcessos(initialPageOf([process]));

    act(() => result.current.openDeleteModal(process));
    act(() => result.current.closeDeleteModal());

    expect(result.current.deletingProcess).toBeNull();
  });

  it('fecha o detalhe do processo quando ele é excluído', async () => {
    excluirProcesso.mockResolvedValue(undefined);
    listarProcessos.mockResolvedValue(apiPage([]));
    const process = createApiProcess(1);
    const { result } = renderProcessos(initialPageOf([process]));

    act(() => {
      result.current.setDetailProcess(process);
      result.current.openDeleteModal(process);
    });
    await act(async () => {
      await result.current.deleteSelectedProcess();
    });

    expect(result.current.detailProcess).toBeNull();
  });

  it('não exclui nada sem processo selecionado', async () => {
    const { result } = renderProcessos(initialPageOf([]));

    await act(async () => {
      await result.current.deleteSelectedProcess();
    });

    expect(excluirProcesso).not.toHaveBeenCalled();
  });
});
