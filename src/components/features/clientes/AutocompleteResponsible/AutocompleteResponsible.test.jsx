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

  it.each([
    { responsavelId: 1, nomeEsperado: 'Alexandre Carreiro' },
    { responsavelId: 2, nomeEsperado: 'Ana Paula Ribeiro' },
    { responsavelId: null, nomeEsperado: '' },
  ])(
    'exibe "$nomeEsperado" quando responsavelId=$responsavelId',
    ({ responsavelId, nomeEsperado }) => {
      render(
        <AutocompleteResponsible
          responsavelId={responsavelId}
          funcionarios={mockFuncionarios}
        />
      );
      expect(screen.getByRole('combobox')).toHaveValue(nomeEsperado);
    }
  );

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

  it.each([
    {
      descricao:
        'duas vezes para baixo (ArrowDown) selecionando o segundo item',
      teclas: ['ArrowDown', 'ArrowDown', 'Enter'],
      idEsperado: 2,
      funcionarioEsperado: mockFuncionarios[1],
    },
    {
      descricao: 'para cima (ArrowUp) selecionando o último item da lista',
      teclas: ['ArrowUp', 'Enter'],
      idEsperado: 3,
      funcionarioEsperado: mockFuncionarios[2],
    },
  ])(
    'navega pelo teclado $descricao',
    ({ teclas, idEsperado, funcionarioEsperado }) => {
      const handleChange = vi.fn();
      render(
        <AutocompleteResponsible
          funcionarios={mockFuncionarios}
          onChange={handleChange}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      for (const key of teclas) {
        fireEvent.keyDown(input, { key });
      }

      expect(handleChange).toHaveBeenCalledWith(
        idEsperado,
        funcionarioEsperado
      );
    }
  );

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

  it('fecha ao clicar fora do componente e restaura o nome do responsável selecionado', () => {
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
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Digitando algo' } });
    expect(input).toHaveValue('Digitando algo');

    fireEvent.mouseDown(screen.getByText('Fora'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('Alexandre Carreiro');
  });

  it('fecha ao clicar fora quando nenhum responsável está selecionado', () => {
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

  it('destaca o item selecionado na lista suspensa e ignora Enter se nada estiver destacado', () => {
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
