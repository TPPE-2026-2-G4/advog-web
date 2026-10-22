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

  it('filtra clientes por busca de nome, email e documento', () => {
    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
        initialFuncionarios: mockFuncionarios,
      })
    );

    act(() => {
      result.current.setSearchTerm('João');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].nome).toBe('João Santos');

    act(() => {
      result.current.setSearchTerm('maria@email.com');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].nome).toBe('Maria Oliveira');

    act(() => {
      result.current.setSearchTerm('12345678900');
    });
    expect(result.current.filteredClientes).toHaveLength(1);

    act(() => {
      result.current.setSearchTerm('termo_inexistente');
    });
    expect(result.current.filteredClientes).toHaveLength(0);
  });

  it('filtra clientes por responsável e por etapa/status', () => {
    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
        initialFuncionarios: mockFuncionarios,
      })
    );

    act(() => {
      result.current.setResponsavelFilter('1');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].nome).toBe('João Santos');

    act(() => {
      result.current.setResponsavelFilter('');
      result.current.setStatusFilter('1');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].nome).toBe('Maria Oliveira');
  });

  it('cadastra cliente e atualiza o estado com sucesso', async () => {
    const novo = {
      cliente_id: 3,
      nome: 'Novo Cliente',
      email: 'novo@email.com',
    };
    criarCliente.mockResolvedValueOnce(novo);

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      await result.current.handleCreateClient(novo);
    });

    expect(result.current.clientes).toHaveLength(3);
    expect(result.current.clientes[0].nome).toBe('Novo Cliente');
    expect(result.current.feedbackMessage).toBe(
      'Cliente cadastrado com sucesso!'
    );
  });

  it('trata erro no cadastro de cliente', async () => {
    criarCliente.mockRejectedValueOnce(new Error('Erro ao cadastrar'));

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    let caughtError;
    await act(async () => {
      try {
        await result.current.handleCreateClient({});
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError?.message).toBe('Erro ao cadastrar');
    expect(result.current.errorMessage).toBe('Erro ao cadastrar');
  });

  it('preserva cpf e documento no estado local ao criar cliente mesmo se API não retornar', async () => {
    const payload = {
      nome: 'Cliente Novo',
      cpf: '12345678901',
      documento: '123.456.789-01',
    };
    criarCliente.mockResolvedValueOnce({
      cliente_id: 88,
      nome: 'Cliente Novo',
    });

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      await result.current.handleCreateClient(payload);
    });

    expect(result.current.clientes[0].cpf).toBe('12345678901');
    expect(result.current.clientes[0].documento).toBe('123.456.789-01');
  });

  it('trata erro de rede no cadastro com mensagem amigável', async () => {
    criarCliente.mockRejectedValueOnce(
      new Error('NetworkError when attempting to fetch resource.')
    );

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      try {
        await result.current.handleCreateClient({});
      } catch {}
    });

    expect(result.current.errorMessage).toBe(
      'Erro de conexão com o servidor. Tente novamente em instantes.'
    );
  });

  it('atualiza cliente com sucesso e preserva documento', async () => {
    const atualizado = {
      cliente_id: 1,
      nome: 'João Santos Atualizado',
    };
    atualizarCliente.mockResolvedValueOnce(atualizado);

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      await result.current.handleUpdateClient(1, {
        ...atualizado,
        cpf: '99988877766',
      });
    });

    expect(result.current.clientes[0].nome).toBe('João Santos Atualizado');
    expect(result.current.clientes[0].cpf).toBe('99988877766');
    expect(result.current.feedbackMessage).toBe(
      'Cliente atualizado com sucesso!'
    );
  });

  it('trata erro na atualização de cliente', async () => {
    atualizarCliente.mockRejectedValueOnce(new Error('Erro na atualização'));

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    let caughtError;
    await act(async () => {
      try {
        await result.current.handleUpdateClient(1, {});
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError?.message).toBe('Erro na atualização');
    expect(result.current.errorMessage).toBe('Erro na atualização');
  });

  it('trata erro de rede na atualização com mensagem amigável', async () => {
    atualizarCliente.mockRejectedValueOnce(
      new Error('NetworkError when attempting to fetch resource.')
    );

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      try {
        await result.current.handleUpdateClient(1, {});
      } catch {}
    });

    expect(result.current.errorMessage).toBe(
      'Erro de conexão com o servidor. Tente novamente em instantes.'
    );
  });

  it('exclui cliente com sucesso', async () => {
    excluirCliente.mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    await act(async () => {
      await result.current.handleDeleteClient(1);
    });

    expect(result.current.clientes).toHaveLength(1);
    expect(result.current.feedbackMessage).toBe(
      'Cliente excluído com sucesso!'
    );
  });

  it('trata erro na exclusão de cliente', async () => {
    excluirCliente.mockRejectedValueOnce(new Error('Erro ao excluir'));

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: mockClientes,
      })
    );

    let caughtError;
    await act(async () => {
      try {
        await result.current.handleDeleteClient(1);
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError?.message).toBe('Erro ao excluir');
    expect(result.current.errorMessage).toBe('Erro ao excluir');
  });

  it('controla a abertura e fechamento de todos os modais', () => {
    const { result } = renderHook(() => useClientes());

    act(() => {
      result.current.handleOpenAdd();
    });
    expect(result.current.isAddOpen).toBe(true);
    act(() => {
      result.current.handleCloseAdd();
    });
    expect(result.current.isAddOpen).toBe(false);

    act(() => {
      result.current.handleOpenDetails(mockClientes[0]);
    });
    expect(result.current.isDetailsOpen).toBe(true);
    expect(result.current.viewingClient).toEqual(mockClientes[0]);
    act(() => {
      result.current.handleCloseDetails();
    });
    expect(result.current.isDetailsOpen).toBe(false);

    act(() => {
      result.current.handleOpenEdit(mockClientes[0]);
    });
    expect(result.current.isEditOpen).toBe(true);
    expect(result.current.editingClient).toEqual(mockClientes[0]);
    act(() => {
      result.current.handleCloseEdit();
    });
    expect(result.current.isEditOpen).toBe(false);

    act(() => {
      result.current.handleOpenDelete(mockClientes[0]);
    });
    expect(result.current.isDeleteOpen).toBe(true);
    expect(result.current.deletingClient).toEqual(mockClientes[0]);
    act(() => {
      result.current.handleCloseDelete();
    });
    expect(result.current.isDeleteOpen).toBe(false);
  });

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

  it('filtra clientes por responsável pelo nome ou objeto quando responsavel_id não confere diretamente', () => {
    const clientesComNomes = [
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
    ];

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: clientesComNomes,
        initialFuncionarios: mockFuncionarios,
      })
    );

    act(() => {
      result.current.setResponsavelFilter('1'); // funcionario 1: Alexandre
    });

    expect(result.current.filteredClientes.map((c) => c.cliente_id)).toEqual([
      11, 13,
    ]);
  });

  it('utiliza mensagens de erro padrão quando o erro não possuir message', async () => {
    criarCliente.mockRejectedValueOnce({});
    atualizarCliente.mockRejectedValueOnce({});
    excluirCliente.mockRejectedValueOnce({});

    const { result } = renderHook(() =>
      useClientes({ initialClientes: mockClientes })
    );

    await act(async () => {
      try {
        await result.current.handleCreateClient({});
      } catch {}
    });
    expect(result.current.errorMessage).toBe('Erro ao cadastrar cliente.');

    await act(async () => {
      try {
        await result.current.handleUpdateClient(1, {});
      } catch {}
    });
    expect(result.current.errorMessage).toBe('Erro ao atualizar cliente.');

    await act(async () => {
      try {
        await result.current.handleDeleteClient(1);
      } catch {}
    });
    expect(result.current.errorMessage).toBe('Erro ao excluir cliente.');
  });

  it('suporta atualizar e excluir cliente usando .id, e filtra por status_id e responsavel_id divergente', async () => {
    const clientesComId = [
      { id: 100, nome: 'Cliente ID 100', status_id: 2, responsavel_id: 99 },
      { id: 200, nome: 'Cliente ID 200', status_id: 3, responsavel_id: 1 },
    ];
    atualizarCliente.mockResolvedValueOnce({ nome: 'Nome 100 Atualizado' });
    excluirCliente.mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      useClientes({
        initialClientes: clientesComId,
        initialFuncionarios: mockFuncionarios,
      })
    );

    act(() => {
      result.current.setStatusFilter('2');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].id).toBe(100);

    // Testar responsavel filter não coincidente com ID numérico
    act(() => {
      result.current.setStatusFilter('');
      result.current.setResponsavelFilter('1');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].id).toBe(200);

    // Update
    await act(async () => {
      await result.current.handleUpdateClient(100, {
        nome: 'Nome 100 Atualizado',
      });
    });
    expect(result.current.clientes.find((c) => c.id === 100)?.nome).toBe(
      'Nome 100 Atualizado'
    );

    // Delete
    await act(async () => {
      await result.current.handleDeleteClient(100);
    });
    expect(result.current.clientes.find((c) => c.id === 100)).toBeUndefined();
  });

  it('filtra clientes por cnpj e documento, e lida com funcionario inexistente ou usando .id', () => {
    const clientesDiversos = [
      { id: 1, nome: 'Doc CNPJ', cnpj: '11222333000144' },
      { id: 2, nome: 'Doc Generico', documento: 'DOC-998877' },
      { id: 3, nome: 'Outro', responsavel_id: 15 },
    ];
    const { result } = renderHook(() =>
      useClientes({
        initialClientes: clientesDiversos,
        initialFuncionarios: [{ id: 99, nome: 'Dr. Sem Func ID' }],
      })
    );

    // Busca por cnpj
    act(() => {
      result.current.setSearchTerm('11222333000144');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].nome).toBe('Doc CNPJ');

    // Busca por documento
    act(() => {
      result.current.setSearchTerm('DOC-998877');
    });
    expect(result.current.filteredClientes).toHaveLength(1);
    expect(result.current.filteredClientes[0].nome).toBe('Doc Generico');

    // Filtro por responsável com ID que não existe na lista de funcionários
    act(() => {
      result.current.setSearchTerm('');
      result.current.setResponsavelFilter('999');
    });
    expect(result.current.filteredClientes).toHaveLength(0);

    // Filtro por responsável usando f.id
    act(() => {
      result.current.setResponsavelFilter('99');
    });
    expect(result.current.filteredClientes).toHaveLength(0);
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
