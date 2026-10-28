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

  it.each([
    {
      propName: 'onView',
      ariaLabel: 'Visualizar detalhes de João Santos',
    },
    {
      propName: 'onEdit',
      ariaLabel: 'Editar cliente João Santos',
    },
    {
      propName: 'onDelete',
      ariaLabel: 'Excluir cliente João Santos',
    },
  ])(
    'aciona $propName com os dados do cliente ao clicar em "$ariaLabel"',
    ({ propName, ariaLabel }) => {
      const handler = vi.fn();
      render(
        <ClientTable
          clientes={mockClientes}
          funcionarios={mockFuncionarios}
          {...{ [propName]: handler }}
        />
      );

      fireEvent.click(screen.getByLabelText(ariaLabel));
      expect(handler).toHaveBeenCalledWith(mockClientes[0]);
    }
  );

  it.each([
    {
      cenario: 'responsavel como objeto { nome }',
      cliente: {
        cliente_id: 10,
        nome: 'Cliente Objeto',
        responsavel: { nome: 'Doutor Objeto' },
        etapa_id: 1,
      },
      funcionarios: [],
      responsavelEsperado: 'Doutor Objeto',
    },
    {
      cenario: 'responsavel_nome direto no cliente',
      cliente: {
        cliente_id: 11,
        nome: 'Cliente Direto',
        responsavel_nome: 'Nome Direto',
        etapa_id: 2,
      },
      funcionarios: [],
      responsavelEsperado: 'Nome Direto',
    },
    {
      cenario: 'cliente com id/status_id e funcionário com id',
      cliente: {
        id: 55,
        nome: 'Cliente ID Alternativo',
        responsavel_id: 88,
        status_id: 2,
      },
      funcionarios: [{ id: 88, nome: 'Dr. ID 88' }],
      responsavelEsperado: 'Dr. ID 88',
    },
  ])(
    'renderiza corretamente quando há $cenario',
    ({ cliente, funcionarios, responsavelEsperado }) => {
      render(<ClientTable clientes={[cliente]} funcionarios={funcionarios} />);

      expect(screen.getByText(cliente.nome)).toBeInTheDocument();
      expect(screen.getByText(responsavelEsperado)).toBeInTheDocument();
    }
  );
});
