import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientes } from './useClientes';
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientesPaginado,
} from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

vi.mock('@/services/clientes', () => ({
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
  listarClientesPaginado: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn().mockResolvedValue([]),
}));

const mockClientes = [
  {
    cliente_id: 1,
    nome: 'João Santos',
    cpf: '12345678900',
    email: 'joao@email.com',
    responsavel_id: 1,
    etapa_id: 4,
  },
  {
    cliente_id: 2,
    nome: 'Maria Oliveira',
    cnpj: '86765432000112',
    email: 'maria@email.com',
    responsavel_id: 2,
    etapa_id: 1,
  },
];

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Alexandre' },
  { funcionario_id: 2, nome: 'Ana Paula' },
];

const paginaCom = (itens, extra = {}) => ({
  itens,
  total: itens.length,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  ...extra,
});

const aguardarDebounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

describe('useClientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarFuncionarios.mockResolvedValue([]);
    // Por padrão a recarga após uma busca/mutação nunca conclui, o que preserva
    // o estado otimista local; os testes de recarga sobrescrevem este retorno.
    listarClientesPaginado.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicializa com os clientes e funcionários fornecidos', () => {
    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
        initialFuncionarios: mockFuncionarios,
      })
    );

    expect(result.current.clientes).toEqual(mockClientes);
    expect(result.current.filteredClientes).toHaveLength(2);
    expect(result.current.searchTerm).toBe('');
  });

  it('inicializa a partir de uma página do servidor sem buscar novamente', () => {
    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes, {
          total: 25,
          totalPages: 3,
          page: 2,
        }),
        initialFuncionarios: mockFuncionarios,
      })
    );

    expect(result.current.clientes).toEqual(mockClientes);
    expect(result.current.totalItems).toBe(25);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.isLoading).toBe(false);
    expect(listarClientesPaginado).not.toHaveBeenCalled();
  });

  it('envia a busca ao servidor após o debounce, voltando para a página 1', async () => {
    vi.useFakeTimers();
    const filtrados = [mockClientes[0]];
    listarClientesPaginado.mockResolvedValue(paginaCom(filtrados));

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes, { page: 2, totalPages: 3 }),
        initialFuncionarios: mockFuncionarios,
      })
    );

    act(() => {
      result.current.setSearchTerm('  João ');
    });

    expect(result.current.searchTerm).toBe('  João ');
    expect(result.current.currentPage).toBe(1);
    expect(listarClientesPaginado).not.toHaveBeenCalledWith(
      expect.objectContaining({ busca: 'João' })
    );

    await aguardarDebounce();

    expect(listarClientesPaginado).toHaveBeenLastCalledWith({
      busca: 'João',
      responsavel_id: '',
      etapa_id: '',
      page: 1,
      pageSize: 10,
    });
    expect(result.current.filteredClientes).toEqual(filtrados);
    expect(result.current.isLoading).toBe(false);
  });

  it('envia responsável e status ao servidor e volta para a página 1', async () => {
    listarClientesPaginado.mockResolvedValue(paginaCom([mockClientes[1]]));

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes, { page: 3, totalPages: 3 }),
        initialFuncionarios: mockFuncionarios,
      })
    );

    await act(async () => {
      result.current.setResponsavelFilter('2');
      result.current.setStatusFilter('1');
    });

    expect(listarClientesPaginado).toHaveBeenLastCalledWith({
      busca: '',
      responsavel_id: '2',
      etapa_id: '1',
      page: 1,
      pageSize: 10,
    });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.clientes).toEqual([mockClientes[1]]);
  });

  it('busca a página solicitada ao navegar entre páginas', async () => {
    const segundaPagina = [{ cliente_id: 11, nome: 'Cliente da página 2' }];
    listarClientesPaginado.mockResolvedValue(
      paginaCom(segundaPagina, { total: 11, page: 2, totalPages: 2 })
    );

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes, { total: 11, totalPages: 2 }),
        initialFuncionarios: mockFuncionarios,
      })
    );

    await act(async () => {
      result.current.setCurrentPage(2);
    });

    expect(listarClientesPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 })
    );
    expect(result.current.clientes).toEqual(segundaPagina);
    expect(result.current.currentPage).toBe(2);
    expect(result.current.totalItems).toBe(11);
  });

  it('volta para a última página existente quando a página atual fica vazia', async () => {
    listarClientesPaginado
      .mockResolvedValueOnce(
        paginaCom([], { total: 10, page: 3, totalPages: 1 })
      )
      .mockResolvedValueOnce(paginaCom(mockClientes, { total: 10 }));

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes, { total: 30, totalPages: 3 }),
        initialFuncionarios: mockFuncionarios,
      })
    );

    await act(async () => {
      result.current.setCurrentPage(3);
    });

    expect(listarClientesPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 })
    );
    expect(result.current.currentPage).toBe(1);
    expect(result.current.clientes).toEqual(mockClientes);
  });

  it('mantém a lista atual e encerra o carregamento quando a busca falha', async () => {
    listarClientesPaginado.mockRejectedValue(new Error('Falha'));

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes),
        initialFuncionarios: mockFuncionarios,
      })
    );

    await act(async () => {
      result.current.setStatusFilter('4');
    });

    expect(result.current.clientes).toEqual(mockClientes);
    expect(result.current.isLoading).toBe(false);
  });

  it('cadastra cliente, preserva cpf/documento locais e atualiza o estado com sucesso', async () => {
    const payload = {
      nome: 'Novo Cliente',
      email: 'novo@email.com',
      cpf: '12345678901',
      documento: '123.456.789-01',
    };
    criarCliente.mockResolvedValueOnce({
      cliente_id: 3,
      nome: 'Novo Cliente',
      email: 'novo@email.com',
    });

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      await result.current.handleCreateClient(payload);
    });

    expect(result.current.clientes).toHaveLength(3);
    expect(result.current.clientes[0].nome).toBe('Novo Cliente');
    expect(result.current.clientes[0].cpf).toBe('12345678901');
    expect(result.current.clientes[0].documento).toBe('123.456.789-01');
    expect(result.current.feedbackMessage).toBe(
      'Cliente cadastrado com sucesso!'
    );
  });

  it('após cadastrar, volta para a primeira página e recarrega do servidor', async () => {
    criarCliente.mockResolvedValueOnce({ cliente_id: 3, nome: 'Novo' });
    const recarregada = paginaCom([{ cliente_id: 3, nome: 'Novo' }]);

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom(mockClientes, { page: 2, totalPages: 2 }),
      })
    );
    listarClientesPaginado.mockResolvedValue(recarregada);

    await act(async () => {
      await result.current.handleCreateClient({ nome: 'Novo' });
    });

    expect(listarClientesPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 })
    );
    expect(result.current.currentPage).toBe(1);
    expect(result.current.clientes).toEqual(recarregada.itens);
  });

  it('atualiza cliente com sucesso (por cliente_id ou id) e preserva documento', async () => {
    atualizarCliente
      .mockResolvedValueOnce({
        cliente_id: 1,
        nome: 'João Santos Atualizado',
      })
      .mockResolvedValueOnce({
        nome: 'Cliente ID 100 Atualizado',
      });

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: [...mockClientes, { id: 100, nome: 'Cliente ID 100' }],
      })
    );

    await act(async () => {
      await result.current.handleUpdateClient(1, {
        nome: 'João Santos Atualizado',
        cpf: '99988877766',
      });
    });

    expect(result.current.clientes[0].nome).toBe('João Santos Atualizado');
    expect(result.current.clientes[0].cpf).toBe('99988877766');
    expect(result.current.feedbackMessage).toBe(
      'Cliente atualizado com sucesso!'
    );

    await act(async () => {
      await result.current.handleUpdateClient(100, {
        nome: 'Cliente ID 100 Atualizado',
      });
    });

    expect(result.current.clientes.find((c) => c.id === 100)?.nome).toBe(
      'Cliente ID 100 Atualizado'
    );
  });

  it('exclui cliente com sucesso (por cliente_id ou id)', async () => {
    excluirCliente.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: [...mockClientes, { id: 100, nome: 'Cliente ID 100' }],
      })
    );

    await act(async () => {
      await result.current.handleDeleteClient(1);
    });

    expect(result.current.clientes).toHaveLength(2);
    expect(result.current.feedbackMessage).toBe(
      'Cliente excluído com sucesso!'
    );

    await act(async () => {
      await result.current.handleDeleteClient(100);
    });

    expect(result.current.clientes.find((c) => c.id === 100)).toBeUndefined();
  });

  it('ao excluir o último cliente da última página, volta uma página', async () => {
    excluirCliente.mockResolvedValue(true);
    listarClientesPaginado.mockResolvedValue(
      paginaCom(mockClientes, { total: 10, page: 1, totalPages: 1 })
    );

    const { result } = renderHook(() =>
      useClientes({
        initialPage: paginaCom([mockClientes[0]], {
          total: 11,
          page: 2,
          totalPages: 2,
        }),
      })
    );

    await act(async () => {
      await result.current.handleDeleteClient(1);
    });

    expect(result.current.currentPage).toBe(1);
    expect(listarClientesPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 })
    );
    expect(result.current.totalItems).toBe(10);
  });

  it.each([
    {
      operacao: 'cadastro com mensagem de erro da API',
      mockFn: criarCliente,
      invoke: (hook) => hook.handleCreateClient({}),
      erroSimulado: new Error('Erro ao cadastrar'),
      mensagemEsperada: 'Erro ao cadastrar',
    },
    {
      operacao: 'cadastro com erro de rede (NetworkError)',
      mockFn: criarCliente,
      invoke: (hook) => hook.handleCreateClient({}),
      erroSimulado: new Error(
        'NetworkError when attempting to fetch resource.'
      ),
      mensagemEsperada:
        'Erro de conexão com o servidor. Tente novamente em instantes.',
    },
    {
      operacao: 'cadastro com erro sem mensagem explícita',
      mockFn: criarCliente,
      invoke: (hook) => hook.handleCreateClient({}),
      erroSimulado: {},
      mensagemEsperada: 'Erro ao cadastrar cliente.',
    },
    {
      operacao: 'atualização com mensagem de erro da API',
      mockFn: atualizarCliente,
      invoke: (hook) => hook.handleUpdateClient(1, {}),
      erroSimulado: new Error('Erro na atualização'),
      mensagemEsperada: 'Erro na atualização',
    },
    {
      operacao: 'atualização com erro de rede (NetworkError)',
      mockFn: atualizarCliente,
      invoke: (hook) => hook.handleUpdateClient(1, {}),
      erroSimulado: new Error(
        'NetworkError when attempting to fetch resource.'
      ),
      mensagemEsperada:
        'Erro de conexão com o servidor. Tente novamente em instantes.',
    },
    {
      operacao: 'atualização com erro sem mensagem explícita',
      mockFn: atualizarCliente,
      invoke: (hook) => hook.handleUpdateClient(1, {}),
      erroSimulado: {},
      mensagemEsperada: 'Erro ao atualizar cliente.',
    },
    {
      operacao: 'exclusão com mensagem de erro da API',
      mockFn: excluirCliente,
      invoke: (hook) => hook.handleDeleteClient(1),
      erroSimulado: new Error('Erro ao excluir'),
      mensagemEsperada: 'Erro ao excluir',
    },
    {
      operacao: 'exclusão com erro sem mensagem explícita',
      mockFn: excluirCliente,
      invoke: (hook) => hook.handleDeleteClient(1),
      erroSimulado: {},
      mensagemEsperada: 'Erro ao excluir cliente.',
    },
  ])(
    'trata falha na operação de $operacao',
    async ({ mockFn, invoke, erroSimulado, mensagemEsperada }) => {
      mockFn.mockRejectedValueOnce(erroSimulado);

      const { result } = renderHook(() =>
        useClientes({ initialClientes: mockClientes })
      );

      let caughtError;
      await act(async () => {
        try {
          await invoke(result.current);
        } catch (err) {
          caughtError = err;
        }
      });

      expect(caughtError).toBe(erroSimulado);
      expect(result.current.errorMessage).toBe(mensagemEsperada);
    }
  );

  it.each([
    {
      modal: 'adição',
      openFn: 'handleOpenAdd',
      closeFn: 'handleCloseAdd',
      stateKey: 'isAddOpen',
      targetKey: null,
      payload: undefined,
    },
    {
      modal: 'detalhes',
      openFn: 'handleOpenDetails',
      closeFn: 'handleCloseDetails',
      stateKey: 'isDetailsOpen',
      targetKey: 'viewingClient',
      payload: mockClientes[0],
    },
    {
      modal: 'edição',
      openFn: 'handleOpenEdit',
      closeFn: 'handleCloseEdit',
      stateKey: 'isEditOpen',
      targetKey: 'editingClient',
      payload: mockClientes[0],
    },
    {
      modal: 'exclusão',
      openFn: 'handleOpenDelete',
      closeFn: 'handleCloseDelete',
      stateKey: 'isDeleteOpen',
      targetKey: 'deletingClient',
      payload: mockClientes[0],
    },
  ])(
    'controla a abertura e o fechamento do modal de $modal',
    ({ openFn, closeFn, stateKey, targetKey, payload }) => {
      const { result } = renderHook(() =>
        useClientes({
          initialClientes: mockClientes,
          initialFuncionarios: mockFuncionarios,
        })
      );

      act(() => {
        result.current[openFn](payload);
      });
      expect(result.current[stateKey]).toBe(true);
      if (targetKey) {
        expect(result.current[targetKey]).toEqual(payload);
      }

      act(() => {
        result.current[closeFn]();
      });
      expect(result.current[stateKey]).toBe(false);
      if (targetKey) {
        expect(result.current[targetKey]).toBeNull();
      }
    }
  );

  it('limpa feedbackMessage após o timeout de 4 segundos', async () => {
    vi.useFakeTimers();
    criarCliente.mockResolvedValueOnce({ cliente_id: 99, nome: 'Teste' });
    const { result } = renderHook(() => useClientes());

    await act(async () => {
      await result.current.handleCreateClient({ nome: 'Teste' });
    });
    expect(result.current.feedbackMessage).toBe(
      'Cliente cadastrado com sucesso!'
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.feedbackMessage).toBe('');
    vi.useRealTimers();
  });

  it('busca clientes e funcionários automaticamente ao montar quando as listas iniciais são vazias', async () => {
    listarClientesPaginado.mockResolvedValueOnce(paginaCom(mockClientes));
    listarFuncionarios.mockResolvedValueOnce(mockFuncionarios);

    const { result } = renderHook(() => useClientes());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(listarClientesPaginado).toHaveBeenCalledWith({
      busca: '',
      responsavel_id: '',
      etapa_id: '',
      page: 1,
      pageSize: 10,
    });
    expect(listarFuncionarios).toHaveBeenCalled();
    expect(result.current.clientes).toEqual(mockClientes);
    expect(result.current.funcionarios).toEqual(mockFuncionarios);
    expect(result.current.isLoading).toBe(false);
  });

  it('busca no cliente quando a página inicial do servidor veio vazia', async () => {
    listarClientesPaginado.mockResolvedValueOnce(paginaCom(mockClientes));

    const { result } = renderHook(() =>
      useClientes({ initialPage: paginaCom([]) })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(listarClientesPaginado).toHaveBeenCalledOnce();
    expect(result.current.clientes).toEqual(mockClientes);
  });

  it('lida com falhas no carregamento inicial de clientes e funcionários sem quebrar', async () => {
    listarClientesPaginado.mockRejectedValueOnce(new Error('Erro de rede'));
    listarFuncionarios.mockRejectedValueOnce(new Error('Erro funcionários'));

    const { result } = renderHook(() => useClientes());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.clientes).toEqual([]);
    expect(result.current.funcionarios).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('cancela atualização de estado se o hook for desmontado antes das requisições terminarem', async () => {
    let resolverClientes;
    listarClientesPaginado.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolverClientes = resolve;
        })
    );

    const { unmount } = renderHook(() => useClientes());
    unmount();

    await act(async () => {
      resolverClientes?.(paginaCom(mockClientes));
    });
  });

  it('limpa filtros redefinindo busca, responsável e status', () => {
    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
        initialFuncionarios: mockFuncionarios,
      })
    );

    act(() => {
      result.current.setSearchTerm('Filtro ativo');
      result.current.setResponsavelFilter('2');
      result.current.setStatusFilter('3');
    });

    expect(result.current.searchTerm).toBe('Filtro ativo');
    expect(result.current.responsavelFilter).toBe('2');
    expect(result.current.statusFilter).toBe('3');

    act(() => {
      result.current.handleClearFilters();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.responsavelFilter).toBe('');
    expect(result.current.statusFilter).toBe('');
  });
});
