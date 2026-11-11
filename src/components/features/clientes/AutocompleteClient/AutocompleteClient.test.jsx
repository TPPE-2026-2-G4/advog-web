import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AutocompleteClient from './AutocompleteClient';

const mockClientes = [
  {
    cliente_id: 1,
    nome: 'Maria Silva',
    cpf: '12345678901',
  },
  {
    cliente_id: 2,
    nome: 'Tech Solutions LTDA',
    cnpj: '12345678000199',
  },
  {
    cliente_id: 3,
    nome: 'Carlos Drummond',
    cpf: '98765432100',
  },
];

describe('AutocompleteClient', () => {
  it('renderiza com placeholder padrão', () => {
    render(<AutocompleteClient clientes={mockClientes} />);
    expect(
      screen.getByPlaceholderText('Selecione um cliente')
    ).toBeInTheDocument();
  });

  it('exibe o nome do cliente selecionado inicialmente pelo id', () => {
    render(<AutocompleteClient clienteId={2} clientes={mockClientes} />);
    expect(screen.getByRole('combobox')).toHaveValue('Tech Solutions LTDA');
  });

  it('abre a lista suspensa e exibe nome e documento formatado', () => {
    render(<AutocompleteClient clientes={mockClientes} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-01')).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument();
  });

  it('permite filtrar por nome ou documento', () => {
    render(<AutocompleteClient clientes={mockClientes} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.change(input, { target: { value: 'Tech' } });
    expect(screen.getByText('Tech Solutions LTDA')).toBeInTheDocument();
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '987' } });
    expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
  });

  it('seleciona cliente ao clicar na opção', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteClient clientes={mockClientes} onChange={handleChange} />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.click(screen.getByText('Maria Silva'));
    expect(handleChange).toHaveBeenCalledWith(1, mockClientes[0]);
    expect(input).toHaveValue('Maria Silva');
  });

  it('limpa seleção ao clicar no botão X', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteClient
        clienteId={1}
        clientes={mockClientes}
        onChange={handleChange}
      />
    );

    const clearBtn = screen.getByLabelText('Limpar cliente selecionado');
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith('', null);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('dispara onChange se valor digitado corresponder ao id do cliente', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteClient clientes={mockClientes} onChange={handleChange} />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '3' } });

    expect(handleChange).toHaveBeenCalledWith(3, mockClientes[2]);
  });
});
