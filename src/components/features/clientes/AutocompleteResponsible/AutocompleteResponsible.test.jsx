import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AutocompleteResponsible from './AutocompleteResponsible';

const mockFuncionarios = [
  {
    funcionario_id: 1,
    nome: 'Alexandre Carreiro',
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

describe('AutocompleteResponsible', () => {
  it('renderiza o input com o placeholder padrão', () => {
    render(<AutocompleteResponsible funcionarios={mockFuncionarios} />);
    expect(
      screen.getByPlaceholderText('Selecione o responsável')
    ).toBeInTheDocument();
  });

  it('exibe o nome do responsável quando responsavelId é passado', () => {
    render(
      <AutocompleteResponsible
        responsavelId={1}
        funcionarios={mockFuncionarios}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('Alexandre Carreiro');
  });

  it('abre a lista suspensa ao focar e permite filtrar pelo termo digitado', () => {
    render(<AutocompleteResponsible funcionarios={mockFuncionarios} />);
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Alexandre Carreiro')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Ana' } });
    expect(screen.getByText('Ana Paula Ribeiro')).toBeInTheDocument();
    expect(screen.queryByText('Pedro Lima')).not.toBeInTheDocument();
  });

  it('seleciona um responsável ao clicar na opção', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteResponsible
        funcionarios={mockFuncionarios}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const option = screen.getByText('Pedro Lima');
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith(3, mockFuncionarios[2]);
    expect(input).toHaveValue('Pedro Lima');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('permite limpar a seleção clicando no botão X', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteResponsible
        responsavelId={2}
        funcionarios={mockFuncionarios}
        onChange={handleChange}
      />
    );

    const clearButton = screen.getByLabelText('Limpar responsável selecionado');
    fireEvent.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith(null, null);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('navega pelas opções usando as setas do teclado e seleciona com Enter', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteResponsible
        funcionarios={mockFuncionarios}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(2, mockFuncionarios[1]);
  });

  it('fecha a lista com a tecla Escape', () => {
    render(<AutocompleteResponsible funcionarios={mockFuncionarios} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('exibe mensagem quando nenhum responsável é encontrado', () => {
    render(<AutocompleteResponsible funcionarios={mockFuncionarios} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Inexistente' } });

    expect(
      screen.getByText('Nenhum responsável encontrado')
    ).toBeInTheDocument();
  });

  it('fecha ao clicar fora do componente', () => {
    render(
      <div>
        <AutocompleteResponsible funcionarios={mockFuncionarios} />
        <button type="button">Fora</button>
      </div>
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('Fora'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('restaura o nome do responsável selecionado ao clicar fora', () => {
    render(
      <div>
        <AutocompleteResponsible
          funcionarios={mockFuncionarios}
          responsavelId={1}
        />
        <button type="button">Fora</button>
      </div>
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Alexandre Carreiro');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Digitando algo' } });
    expect(input).toHaveValue('Digitando algo');

    fireEvent.mouseDown(screen.getByText('Fora'));
    expect(input).toHaveValue('Alexandre Carreiro');
  });

  it('navega para cima usando a seta para cima (ArrowUp)', () => {
    const handleChange = vi.fn();
    render(
      <AutocompleteResponsible
        funcionarios={mockFuncionarios}
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    // Começa do final ao apertar ArrowUp
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(3, mockFuncionarios[2]);
  });

  it('ignora teclas quando disabled for verdadeiro', () => {
    render(
      <AutocompleteResponsible
        funcionarios={mockFuncionarios}
        disabled={true}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('destaca o item selecionado na lista suspensa e ignora Enter se nada estiver selecionado', () => {
    render(
      <AutocompleteResponsible
        funcionarios={mockFuncionarios}
        responsavelId={1}
      />
    );
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
  });
});
