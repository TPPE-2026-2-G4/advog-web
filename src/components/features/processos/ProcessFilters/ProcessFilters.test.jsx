import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessFilters from './ProcessFilters';

const emptyFilters = {
  busca: '',
  status: '',
  responsavelId: '',
  prazoInicio: '',
  prazoFim: '',
};

const responsaveis = [
  { value: '3', label: 'Ana Paula Ribeiro' },
  { value: '5', label: 'Pedro Lima' },
];

const renderFilters = (overrides = {}) => {
  const props = {
    filters: emptyFilters,
    responsaveis,
    dateRangeError: '',
    onFilterChange: vi.fn(),
    ...overrides,
  };

  render(<ProcessFilters {...props} />);
  return props;
};

describe('ProcessFilters', () => {
  it('informa a busca por número, cliente ou título digitada', () => {
    const { onFilterChange } = renderFilters();

    fireEvent.change(
      screen.getByPlaceholderText(/buscar por número, cliente ou título/i),
      {
        target: { value: '0061234' },
      }
    );

    expect(onFilterChange).toHaveBeenCalledWith('busca', '0061234');
  });

  it('lista os status e informa a escolha do usuário', () => {
    const { onFilterChange } = renderFilters();
    const select = screen.getByRole('combobox', {
      name: /filtrar por status/i,
    });

    expect(
      screen.getByRole('option', { name: 'Todos os Status' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Em Análise' })
    ).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'Ativo' } });
    expect(onFilterChange).toHaveBeenCalledWith('status', 'Ativo');
  });

  it('lista os responsáveis e informa o identificador escolhido', () => {
    const { onFilterChange } = renderFilters();
    const select = screen.getByRole('combobox', {
      name: /filtrar por responsável/i,
    });

    expect(
      screen.getByRole('option', { name: 'Todos os Responsáveis' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Pedro Lima' })
    ).toBeInTheDocument();

    fireEvent.change(select, { target: { value: '5' } });
    expect(onFilterChange).toHaveBeenCalledWith('responsavelId', '5');
  });

  it('informa o intervalo de prazo com início e fim', () => {
    const { onFilterChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('De'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Até'), {
      target: { value: '2026-09-30' },
    });

    expect(onFilterChange).toHaveBeenCalledWith('prazoInicio', '2026-09-01');
    expect(onFilterChange).toHaveBeenCalledWith('prazoFim', '2026-09-30');
  });

  it('exibe o erro do intervalo de datas e marca os campos como inválidos', () => {
    renderFilters({
      filters: {
        ...emptyFilters,
        prazoInicio: '2026-09-10',
        prazoFim: '2026-09-01',
      },
      dateRangeError: 'A data inicial não pode ser posterior à final.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à final.'
    );
    expect(screen.getByLabelText('De')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Até')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('reflete os valores atuais dos filtros nos campos', () => {
    renderFilters({
      filters: {
        busca: 'Caso',
        status: 'Concluído',
        responsavelId: '3',
        prazoInicio: '2026-01-01',
        prazoFim: '2026-02-01',
      },
    });

    expect(screen.getByDisplayValue('Caso')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /filtrar por status/i })
    ).toHaveValue('Concluído');
    expect(
      screen.getByRole('combobox', { name: /filtrar por responsável/i })
    ).toHaveValue('3');
    expect(screen.getByLabelText('De')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Até')).toHaveValue('2026-02-01');
  });
});
