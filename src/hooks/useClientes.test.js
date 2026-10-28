import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClientes } from './useClientes';
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
} from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

vi.mock('@/services/clientes', () => ({
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
  listarClientes: vi.fn().mockResolvedValue([]),
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

describe('useClientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it.each([
    {
      criterio: 'nome',
      termo: 'João',
      clientesEsperados: ['João Santos'],
    },
    {
      criterio: 'email',
      termo: 'maria@email.com',
      clientesEsperados: ['Maria Oliveira'],
    },
    {
      criterio: 'CPF',
      termo: '12345678900',
      clientesEsperados: ['João Santos'],
    },
    {
      criterio: 'CNPJ',
      termo: '86765432000112',
      clientesEsperados: ['Maria Oliveira'],
    },
    {
      criterio: 'documento alfanumérico',
      termo: 'DOC-998877',
      initialClientes: [
        ...mockClientes,
        { id: 3, nome: 'Doc Generico', documento: 'DOC-998877' },
        { id: 4, nome: 'Sem Documento' },
      ],
      clientesEsperados: ['Doc Generico'],
    },
    {
      criterio: 'termo inexistente',
      termo: 'termo_inexistente',
      clientesEsperados: [],
    },
  ])(
    'filtra clientes por busca ($criterio: "$termo")',
    ({ termo, initialClientes = mockClientes, clientesEsperados }) => {
      const { result } = renderHook(() =>
        useClientes({
          initialClientes,
          initialFuncionarios: mockFuncionarios,
        })
      );

      act(() => {
        result.current.setSearchTerm(termo);
      });

      expect(result.current.filteredClientes.map((c) => c.nome)).toEqual(
        clientesEsperados
      );
    }
  );

  it.each([
    {
      cenario: 'responsavel_id coincidente',
      responsavelFilter: '1',
      statusFilter: '',
      initialClientes: mockClientes,
      initialFuncionarios: mockFuncionarios,
      idsEsperados: [1],
    },
    {
      cenario: 'etapa_id coincidente',
      responsavelFilter: '',
      statusFilter: '1',
      initialClientes: mockClientes,
      initialFuncionarios: mockFuncionarios,
      idsEsperados: [2],
    },
    {
      cenario: 'status_id coincidente em clientes com .id',
      responsavelFilter: '',
      statusFilter: '2',
      initialClientes: [
        { id: 100, nome: 'Cliente ID 100', status_id: 2, responsavel_id: 99 },
        { id: 200, nome: 'Cliente ID 200', status_id: 3, responsavel_id: 1 },
      ],
      initialFuncionarios: mockFuncionarios,
      idsEsperados: [100],
    },
    {
      cenario:
        'responsavel_nome ou responsavel string/objeto quando responsavel_id é nulo',
      responsavelFilter: '1',
      statusFilter: '',
      initialClientes: [
        {
          cliente_id: 11,
          nome: 'Cliente Um',
          responsavel_id: null,
          responsavel_nome: 'Alexandre Carreiro',
        },
        {
          cliente_id: 12,
          nome: 'Cliente Dois',
          responsavel_id: null,
          responsavel: { nome: 'Ana Paula' },
        },
        {
          cliente_id: 13,
          nome: 'Cliente Três',
          responsavel_id: null,
          responsavel: 'Alexandre Carreiro',
        },
        {
          cliente_id: 14,
          nome: 'Cliente Quatro',
          responsavel_id: null,
          responsavel: null,
        },
      ],
      initialFuncionarios: mockFuncionarios,
      idsEsperados: [11, 13],
    },
    {
      cenario: 'responsavel não encontrado na lista de funcionários',
      responsavelFilter: '999',
      statusFilter: '',
      initialClientes: [
        { id: 3, nome: 'Outro', responsavel_id: 15 },
        { id: 4, nome: 'Sem Resp ID', responsavel_id: null },
      ],
      initialFuncionarios: [{ id: 99, nome: 'Dr. Sem Func ID' }],
      idsEsperados: [],
    },
    {
      cenario: 'responsavelFilter zero coincidindo com responsavel_id nulo',
      responsavelFilter: '0',
      statusFilter: '',
      initialClientes: [{ id: 5, nome: 'Resp Zero', responsavel_id: null }],
      initialFuncionarios: mockFuncionarios,
      idsEsperados: [5],
    },
    {
      cenario: 'funcionário identificado por .id sem clientes associados',
      responsavelFilter: '99',
      statusFilter: '',
      initialClientes: [{ id: 1, nome: 'Sem Resp', responsavel_id: null }],
      initialFuncionarios: [{ id: 99, nome: 'Dr. Sem Func ID' }],
      idsEsperados: [],
    },
  ])(
    'filtra clientes por responsável e etapa/status ($cenario)',
    ({
      responsavelFilter,
      statusFilter,
      initialClientes,
      initialFuncionarios,
      idsEsperados,
    }) => {
      const { result } = renderHook(() =>
        useClientes({
          initialClientes,
          initialFuncionarios,
        })
      );

      act(() => {
        result.current.setResponsavelFilter(responsavelFilter);
        result.current.setStatusFilter(statusFilter);
      });

      expect(
        result.current.filteredClientes.map((c) => c.cliente_id ?? c.id)
      ).toEqual(idsEsperados);
    }
  );

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
    listarClientes.mockResolvedValueOnce(mockClientes);
    listarFuncionarios.mockResolvedValueOnce(mockFuncionarios);

    const { result } = renderHook(() => useClientes());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(listarClientes).toHaveBeenCalled();
    expect(listarFuncionarios).toHaveBeenCalled();
    expect(result.current.clientes).toEqual(mockClientes);
    expect(result.current.funcionarios).toEqual(mockFuncionarios);
    expect(result.current.isLoading).toBe(false);
  });

  it('lida com falhas no carregamento inicial de clientes e funcionários sem quebrar', async () => {
    listarClientes.mockRejectedValueOnce(new Error('Erro de rede'));
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
    listarClientes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolverClientes = resolve;
        })
    );

    const { unmount } = renderHook(() => useClientes());
    unmount();

    await act(async () => {
      resolverClientes?.(mockClientes);
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
