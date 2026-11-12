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
  it.each([
    {
      description: 'busca por número, cliente ou título',
      getElement: () =>
        screen.getByPlaceholderText(/buscar por número, cliente ou título/i),
      field: 'busca',
      value: '0061234',
    },
    {
      description: 'escolha de status',
      getElement: () =>
        screen.getByRole('combobox', { name: /filtrar por status/i }),
      field: 'status',
      value: 'Ativo',
    },
    {
      description: 'escolha de responsável',
      getElement: () =>
        screen.getByRole('combobox', { name: /filtrar por responsável/i }),
      field: 'responsavelId',
      value: '5',
    },
    {
      description: 'data inicial do prazo (De:)',
      getElement: () => screen.getByLabelText('De:'),
      field: 'prazoInicio',
      value: '2026-09-01',
    },
    {
      description: 'data final do prazo (Até:)',
      getElement: () => screen.getByLabelText('Até:'),
      field: 'prazoFim',
      value: '2026-09-30',
    },
  ])(
    'notifica onFilterChange ao alterar $description ($field)',
    ({ getElement, field, value }) => {
      const { onFilterChange } = renderFilters();

      fireEvent.change(getElement(), { target: { value } });

      expect(onFilterChange).toHaveBeenCalledWith(field, value);
    }
  );

  it('lista todas as opções padrão de status e responsáveis com foto/iniciais, nome e cargo', () => {
    renderFilters({
      funcionarios: [
        {
          funcionario_id: 3,
          nome: 'Ana Paula Ribeiro',
          cargo: { nome_cargo: 'Advogada Sênior' },
          foto_perfil_url: 'https://exemplo.com/ana.png',
        },
        {
          funcionario_id: 5,
          nome: 'Pedro Lima',
          cargo: 'Estagiário',
        },
      ],
    });

    [
      'Todos os status',
      'Em Análise',
      'Ativo',
      'Concluído',
      'Arquivado',
    ].forEach((optionLabel) => {
      expect(
        screen.getByRole('option', { name: optionLabel })
      ).toBeInTheDocument();
    });

    const respInput = screen.getByRole('combobox', {
      name: /filtrar por responsável/i,
    });
    expect(respInput).toHaveAttribute('placeholder', 'Todos os responsáveis');

    fireEvent.focus(respInput);
    expect(screen.getByText('Ana Paula Ribeiro')).toBeInTheDocument();
    expect(screen.getByText('Advogada Sênior')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de Ana Paula Ribeiro')).toHaveAttribute(
      'src',
      'https://exemplo.com/ana.png'
    );
    expect(screen.getByText('Pedro Lima')).toBeInTheDocument();
    expect(screen.getByText('Estagiário')).toBeInTheDocument();
    expect(screen.getByText('PL')).toBeInTheDocument();
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
    expect(screen.getByLabelText('De:')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(screen.getByLabelText('Até:')).toHaveAttribute(
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
    ).toHaveValue('Ana Paula Ribeiro');
    expect(screen.getByLabelText('De:')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Até:')).toHaveValue('2026-02-01');
  });

  it('limpa todos os filtros ao acionar o botão limpar', () => {
    const { onFilterChange } = renderFilters();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    ['busca', 'status', 'responsavelId', 'prazoInicio', 'prazoFim'].forEach(
      (field) => expect(onFilterChange).toHaveBeenCalledWith(field, '')
    );
    expect(onFilterChange).toHaveBeenCalledTimes(5);
  });
});
