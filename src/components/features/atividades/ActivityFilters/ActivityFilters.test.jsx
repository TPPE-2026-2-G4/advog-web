import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityFilters from './ActivityFilters';

describe('ActivityFilters', () => {
  const responsaveisMock = [
    { value: '1', label: 'Ana Paula' },
    { value: '2', label: 'Alexandre C.' },
  ];

  const emptyFilters = {
    busca: '',
    funcionarioId: '',
    prazoFim: '',
  };

  it('renderiza os campos vazios e preenche as opções de responsáveis com avatar, cargo e nome', () => {
    render(
      <ActivityFilters
        filters={emptyFilters}
        responsaveis={responsaveisMock}
        funcionarios={[
          {
            funcionario_id: 1,
            nome: 'Ana Paula',
            cargo: { nome_cargo: 'Advogada' },
            foto_perfil_url: 'https://exemplo.com/ana.png',
          },
          {
            funcionario_id: 2,
            nome: 'Alexandre C.',
            cargo: 'Sócio',
          },
        ]}
      />
    );

    const inputBusca = screen.getByPlaceholderText(
      'Buscar por título, descrição ou responsável...'
    );
    expect(inputBusca).toHaveValue('');

    const inputResponsavel = screen.getByRole('combobox', {
      name: 'Filtrar por responsável',
    });
    expect(inputResponsavel).toHaveValue('');
    expect(inputResponsavel).toHaveAttribute(
      'placeholder',
      'Todos os responsáveis'
    );

    fireEvent.focus(inputResponsavel);
    expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    expect(screen.getByText('Advogada')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de Ana Paula')).toHaveAttribute(
      'src',
      'https://exemplo.com/ana.png'
    );
    expect(screen.getByText('Alexandre C.')).toBeInTheDocument();
    expect(screen.getByText('Sócio')).toBeInTheDocument();
    expect(screen.getByText('AC')).toBeInTheDocument();

    const inputData = screen.getByLabelText('Prazo até');
    expect(inputData).toHaveValue('');

    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' })
    ).not.toBeInTheDocument();
  });

  it('dispara onFilterChange ao digitar no campo de busca', () => {
    const onFilterChange = vi.fn();
    render(
      <ActivityFilters
        filters={emptyFilters}
        responsaveis={responsaveisMock}
        onFilterChange={onFilterChange}
      />
    );

    const inputBusca = screen.getByPlaceholderText(
      'Buscar por título, descrição ou responsável...'
    );
    fireEvent.change(inputBusca, { target: { value: 'Petição' } });

    expect(onFilterChange).toHaveBeenCalledWith('busca', 'Petição');
  });

  it('dispara onFilterChange ao selecionar responsável e alterar a data', () => {
    const onFilterChange = vi.fn();
    render(
      <ActivityFilters
        filters={emptyFilters}
        responsaveis={responsaveisMock}
        onFilterChange={onFilterChange}
      />
    );

    const select = screen.getByRole('combobox', {
      name: 'Filtrar por responsável',
    });
    fireEvent.change(select, { target: { value: '2' } });
    expect(onFilterChange).toHaveBeenCalledWith('funcionarioId', '2');

    const inputData = screen.getByLabelText('Prazo até');
    fireEvent.change(inputData, { target: { value: '2026-10-31' } });
    expect(onFilterChange).toHaveBeenCalledWith('prazoFim', '2026-10-31');
  });

  it('exibe o botão "Limpar" condicionalmente apenas quando houver filtros ativos', () => {
    const { rerender } = render(
      <ActivityFilters filters={emptyFilters} responsaveis={responsaveisMock} />
    );
    expect(
      screen.queryByRole('button', { name: 'Limpar filtros' })
    ).not.toBeInTheDocument();

    rerender(
      <ActivityFilters
        filters={{ ...emptyFilters, busca: 'Contrato' }}
        responsaveis={responsaveisMock}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Limpar filtros' })
    ).toBeInTheDocument();

    rerender(
      <ActivityFilters
        filters={{ ...emptyFilters, funcionarioId: '1' }}
        responsaveis={responsaveisMock}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Limpar filtros' })
    ).toBeInTheDocument();

    rerender(
      <ActivityFilters
        filters={{ ...emptyFilters, prazoFim: '2026-11-30' }}
        responsaveis={responsaveisMock}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Limpar filtros' })
    ).toBeInTheDocument();
  });

  it('dispara onClear ao clicar no botão "Limpar"', () => {
    const onClear = vi.fn();
    render(
      <ActivityFilters
        filters={{ ...emptyFilters, busca: 'Termo' }}
        responsaveis={responsaveisMock}
        onClear={onClear}
      />
    );

    const botaoLimpar = screen.getByRole('button', { name: 'Limpar filtros' });
    fireEvent.click(botaoLimpar);

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
