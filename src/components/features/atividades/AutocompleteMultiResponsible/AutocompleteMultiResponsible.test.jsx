import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AutocompleteMultiResponsible from './AutocompleteMultiResponsible';

const mockFuncionarios = [
  {
    funcionario_id: 1,
    nome: 'Alexandre Carreiro',
    foto_perfil_url: 'https://exemplo.com/alexandre.png',
    cargo: { nome_cargo: 'Sócio Fundador' },
  },
  {
    funcionario_id: 2,
    nome: 'Ana Paula Ribeiro',
    cargo: { nome_cargo: 'Advogada Sênior' },
  },
  {
    funcionario_id: 3,
    nome: 'Pedro Lima',
    cargo: { nome_cargo: 'Advogado Júnior' },
  },
];

describe('AutocompleteMultiResponsible', () => {
  it('renderiza o input com placeholder inicial', () => {
    render(<AutocompleteMultiResponsible funcionarios={mockFuncionarios} />);
    expect(
      screen.getByPlaceholderText('Selecione os responsáveis...')
    ).toBeInTheDocument();
  });

  it('exibe chips para os responsáveis selecionados com foto e iniciais', () => {
    render(
      <AutocompleteMultiResponsible
        selectedIds={[1, 2]}
        funcionarios={mockFuncionarios}
      />
    );

    expect(screen.getByText('Alexandre Carreiro')).toBeInTheDocument();
    expect(screen.getByText('Ana Paula Ribeiro')).toBeInTheDocument();

    const img = screen.getByAltText('Foto de Alexandre Carreiro');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://exemplo.com/alexandre.png');

    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('permite selecionar um responsável na lista adicionando aos selecionados', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteMultiResponsible
        selectedIds={[1]}
        funcionarios={mockFuncionarios}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const options = screen.getAllByRole('option');
    fireEvent.click(options[1]); // Clica na Ana Paula (id: 2)

    expect(handleChange).toHaveBeenCalledWith([1, 2]);
  });

  it('remove um responsável ao clicar nele novamente na lista ou no chip', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteMultiResponsible
        selectedIds={[1, 2]}
        funcionarios={mockFuncionarios}
        onChange={handleChange}
      />
    );

    // Remove pelo chip
    const removeBtn = screen.getByLabelText('Remover Alexandre Carreiro');
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith([2]);
  });

  it('filtra opções pelo texto digitado', () => {
    render(<AutocompleteMultiResponsible funcionarios={mockFuncionarios} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.change(input, { target: { value: 'Pedro' } });
    expect(screen.getByText('Pedro Lima')).toBeInTheDocument();
    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('exibe o cargo tanto quando é um objeto quanto quando é uma string', () => {
    const comCargosVariados = [
      {
        funcionario_id: 20,
        nome: 'Mariana Souza',
        cargo: 'Gerente Jurídica',
      },
      {
        funcionario_id: 21,
        nome: 'Roberto Dias',
        cargo: { nome_cargo: 'Advogado Trabalhista' },
      },
    ];

    render(<AutocompleteMultiResponsible funcionarios={comCargosVariados} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByText('Gerente Jurídica')).toBeInTheDocument();
    expect(screen.getByText('Advogado Trabalhista')).toBeInTheDocument();
  });
});
