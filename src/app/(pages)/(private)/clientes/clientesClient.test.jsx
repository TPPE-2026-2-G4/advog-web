import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientesClient from './clientesClient';
import * as clientesService from '@/services/clientes';

vi.mock('@/services/clientes', () => ({
  criarCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  excluirCliente: vi.fn(),
  listarClientes: vi.fn(),
  obterCliente: vi.fn(),
}));

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Dr. Roberto Silva' },
  { id: 2, nome: 'Dra. Amanda Souza' },
  { nome: 'Dr. Terceiro' },
];

const mockClientes = [
  {
    cliente_id: 1,
    nome: 'Carlos Drummond',
    cpf: '12345678901',
    telefone: '11987654321',
    email: 'carlos@teste.com',
    responsavel_id: 1,
    etapa_id: 1,
    ultima_interacao: '2026-09-10T14:30:00Z',
  },
  {
    cliente_id: 2,
    nome: 'Clarice Lispector',
    cpf: '98765432100',
    telefone: '21988887777',
    email: 'clarice@teste.com',
    responsavel_id: 2,
    etapa_id: 4,
    ultima_interacao: '2026-09-12T10:00:00Z',
  },
];

describe('ClientesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o cabeçalho e a contagem no plural quando há múltiplos clientes', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Clientes' })
    ).toBeInTheDocument();
    expect(screen.getByText(/2 clientes cadastrados/)).toBeInTheDocument();
  });

  it('renderiza a contagem no singular quando há apenas 1 cliente', () => {
    render(
      <ClientesClient
        initialClientes={[mockClientes[0]]}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(screen.getByText(/1 cliente cadastrado/)).toBeInTheDocument();
  });

  it('filtra clientes por busca de texto', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Buscar clientes');
    fireEvent.change(searchInput, { target: { value: 'Clarice' } });

    expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();
  });

  it('filtra clientes por responsável', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const inputResponsavel = screen.getByLabelText('Filtrar por responsável');
    fireEvent.focus(inputResponsavel);
    const option = screen.getByRole('option', { name: /dr\. roberto silva/i });
    fireEvent.click(option);

    expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
    expect(screen.queryByText('Clarice Lispector')).not.toBeInTheDocument();
  });

  it('filtra clientes por status / etapa', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const selectStatus = screen.getByLabelText('Filtrar por status');
    // Etapa 4: Cliente ativo
    fireEvent.change(selectStatus, { target: { value: '4' } });

    expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();
  });

  it('abre e fecha o modal de cadastro de novo cliente', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(
      screen.queryByText('Cadastrar Novo Cliente')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    expect(screen.getByText('Cadastrar Novo Cliente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(
      screen.queryByText('Cadastrar Novo Cliente')
    ).not.toBeInTheDocument();
  });

  it('cadastra um novo cliente com sucesso e exibe mensagem de feedback', async () => {
    const novoCliente = {
      cliente_id: 3,
      nome: 'Machado de Assis',
      email: 'machado@teste.com',
      telefone: '21999998888',
      cpf: '11122233344',
      etapa_id: 1,
      responsavel_id: 1,
    };
    clientesService.criarCliente.mockResolvedValueOnce(novoCliente);

    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Machado de Assis' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'machado@teste.com' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '21999998888' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

    await waitFor(() => {
      expect(clientesService.criarCliente).toHaveBeenCalled();
      expect(
        screen.getByText('Cliente cadastrado com sucesso!')
      ).toBeInTheDocument();
      expect(screen.getByText('Machado de Assis')).toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro quando o cadastro falha', async () => {
    clientesService.criarCliente.mockRejectedValueOnce(
      new Error('Erro de validação no servidor')
    );

    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Nome Inválido' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'email@valido.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText('Erro de validação no servidor').length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('abre o modal de detalhes e permite transitar para edição', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const viewButtons = screen.getAllByLabelText(/visualizar detalhes/i);
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText('Detalhes do Cliente')).toBeInTheDocument();
    expect(
      screen.getAllByText('Carlos Drummond').length
    ).toBeGreaterThanOrEqual(1);

    // Clica no botão Editar dentro dos detalhes
    const editModalBtn = screen.getByRole('button', { name: /^editar$/i });
    fireEvent.click(editModalBtn);

    expect(screen.queryByText('Detalhes do Cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
  });

  it('abre o modal de edição diretamente e atualiza o cliente', async () => {
    const atualizado = {
      ...mockClientes[0],
      nome: 'Carlos Drummond de Andrade',
    };
    clientesService.atualizarCliente.mockResolvedValueOnce(atualizado);

    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const editButtons = screen.getAllByLabelText(/editar cliente/i);
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();

    const nomeInput = screen.getByLabelText(/nome completo/i);
    fireEvent.change(nomeInput, {
      target: { value: 'Carlos Drummond de Andrade' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(clientesService.atualizarCliente).toHaveBeenCalled();
      expect(
        screen.getByText('Cliente atualizado com sucesso!')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Carlos Drummond de Andrade')
      ).toBeInTheDocument();
    });
  });

  it('abre o modal de exclusão e exclui o cliente com sucesso', async () => {
    clientesService.excluirCliente.mockResolvedValueOnce({ ok: true });

    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const deleteButtons = screen.getAllByLabelText(/excluir cliente/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Excluir cliente')).toBeInTheDocument();
    expect(
      screen.getAllByText('Carlos Drummond').length
    ).toBeGreaterThanOrEqual(1);

    const confirmBtn = screen.getByRole('button', { name: /^excluir$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(clientesService.excluirCliente).toHaveBeenCalledWith(1);
      expect(
        screen.getByText('Cliente excluído com sucesso!')
      ).toBeInTheDocument();
      expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    });
  });

  it('exibe o botão Limpar quando há filtros e limpa todos os filtros ao clicar', () => {
    render(
      <ClientesClient
        initialClientes={mockClientes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    expect(
      screen.queryByRole('button', { name: /limpar filtros/i })
    ).not.toBeInTheDocument();

    const searchInput = screen.getByLabelText('Buscar clientes');
    fireEvent.change(searchInput, { target: { value: 'Clarice' } });

    expect(screen.queryByText('Carlos Drummond')).not.toBeInTheDocument();
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /limpar filtros/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
    expect(screen.getByText('Clarice Lispector')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /limpar filtros/i })
    ).not.toBeInTheDocument();
  });
});
