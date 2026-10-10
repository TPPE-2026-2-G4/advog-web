import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientTable from './ClientTable';

const mockFuncionarios = [
  { funcionario_id: 1, nome: 'Alexandre' },
  { funcionario_id: 2, nome: 'Ana Paula' },
];

const mockClientes = [
  {
    cliente_id: 1,
    nome: 'João Santos',
    cpf: '12345678900',
    telefone: '11999991234',
    email: 'joao.santos@email.com',
    responsavel_id: 1,
    ultima_interacao: '2026-08-25T10:00:00Z',
    etapa_id: 4,
  },
  {
    cliente_id: 2,
    nome: 'Maria Oliveira',
    cnpj: '86765432000112',
    telefone: '21988885678',
    email: 'maria.oliveira@email.com',
    responsavel: 'Ana Paula',
    ultima_interacao: '2026-08-20T10:00:00Z',
    etapa_id: 1,
  },
  {
    cliente_id: 3,
    nome: 'Cliente Sem Responsável',
    email: 'sem@email.com',
    ultima_interacao: null,
    etapa_id: 3,
  },
];

describe('ClientTable', () => {
  it('renderiza o estado vazio quando a lista de clientes estiver vazia', () => {
    render(<ClientTable clientes={[]} />);
    expect(screen.getByText('Nenhum cliente encontrado')).toBeInTheDocument();
  });

  it('renderiza as linhas de clientes com dados formatados', () => {
    render(
      <ClientTable clientes={mockClientes} funcionarios={mockFuncionarios} />
    );

    expect(screen.getByText('João Santos')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-1234')).toBeInTheDocument();
    expect(screen.getByText('joao.santos@email.com')).toBeInTheDocument();
    expect(screen.getByText('Alexandre')).toBeInTheDocument();
    expect(screen.getByText('Cliente ativo')).toBeInTheDocument();

    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('86.765.432/0001-12')).toBeInTheDocument();
    expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    expect(screen.getByText('Novo contato')).toBeInTheDocument();

    expect(screen.getByText('Não atribuído')).toBeInTheDocument();
  });

  it('aciona onView ao clicar no botão de visualizar', () => {
    const handleView = vi.fn();
    render(
      <ClientTable
        clientes={mockClientes}
        funcionarios={mockFuncionarios}
        onView={handleView}
      />
    );

    const btn = screen.getByLabelText('Visualizar detalhes de João Santos');
    fireEvent.click(btn);
    expect(handleView).toHaveBeenCalledWith(mockClientes[0]);
  });

  it('aciona onEdit ao clicar no botão de editar', () => {
    const handleEdit = vi.fn();
    render(
      <ClientTable
        clientes={mockClientes}
        funcionarios={mockFuncionarios}
        onEdit={handleEdit}
      />
    );

    const btn = screen.getByLabelText('Editar cliente João Santos');
    fireEvent.click(btn);
    expect(handleEdit).toHaveBeenCalledWith(mockClientes[0]);
  });

  it('aciona onDelete ao clicar no botão de excluir', () => {
    const handleDelete = vi.fn();
    render(
      <ClientTable
        clientes={mockClientes}
        funcionarios={mockFuncionarios}
        onDelete={handleDelete}
      />
    );

    const btn = screen.getByLabelText('Excluir cliente João Santos');
    fireEvent.click(btn);
    expect(handleDelete).toHaveBeenCalledWith(mockClientes[0]);
  });

  it('renderiza responsável quando for objeto { nome } ou responsavel_nome', () => {
    const clientesExtras = [
      {
        cliente_id: 10,
        nome: 'Cliente Objeto',
        responsavel: { nome: 'Doutor Objeto' },
        etapa_id: 1,
      },
      {
        cliente_id: 11,
        nome: 'Cliente Direto',
        responsavel_nome: 'Nome Direto',
        etapa_id: 2,
      },
    ];
    render(<ClientTable clientes={clientesExtras} funcionarios={[]} />);
    expect(screen.getByText('Doutor Objeto')).toBeInTheDocument();
    expect(screen.getByText('Nome Direto')).toBeInTheDocument();
  });

  it('renderiza cliente usando id, status_id e encontra funcionario por f.id', () => {
    const clientesAlternativos = [
      {
        id: 55,
        nome: 'Cliente ID Alternativo',
        responsavel_id: 88,
        status_id: 2,
      },
    ];
    render(
      <ClientTable
        clientes={clientesAlternativos}
        funcionarios={[{ id: 88, nome: 'Dr. ID 88' }]}
      />
    );
    expect(screen.getByText('Cliente ID Alternativo')).toBeInTheDocument();
    expect(screen.getByText('Dr. ID 88')).toBeInTheDocument();
  });
});
