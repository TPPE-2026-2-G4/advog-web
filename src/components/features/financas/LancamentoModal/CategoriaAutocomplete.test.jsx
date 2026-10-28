import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarCategorias } from '@/services/financas';
import CategoriaAutocomplete from './CategoriaAutocomplete';

vi.mock('@/services/financas', () => ({
  listarCategorias: vi.fn(),
}));

const mockCategorias = [
  { categoria_id: 1, nome_categoria: 'Honorários' },
  { categoria_id: 2, nome_categoria: 'Custas Processuais' },
  { categoria_id: 3, nome_categoria: 'Despesas Operacionais' },
];

describe('CategoriaAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarCategorias.mockResolvedValue(mockCategorias);
  });

  it('carrega categorias ao montar e exibe a lista ao focar no campo', async () => {
    render(<CategoriaAutocomplete id="cat" value="" onChange={vi.fn()} />);

    await waitFor(() => expect(listarCategorias).toHaveBeenCalledOnce());

    const input = screen.getByPlaceholderText('Digite e selecione...');
    fireEvent.focus(input);

    mockCategorias.forEach(({ nome_categoria }) => {
      expect(screen.getByText(nome_categoria)).toBeInTheDocument();
    });
  });

  it.each([
    {
      query: 'hon',
      expectedVisible: ['Honorários'],
      expectedHidden: ['Custas Processuais', 'Despesas Operacionais'],
      showsNewOption: true,
    },
    {
      query: 'Honorários',
      expectedVisible: ['Honorários'],
      expectedHidden: ['Custas Processuais', 'Despesas Operacionais'],
      showsNewOption: false,
    },
    {
      query: ' Tributário ',
      expectedVisible: [],
      expectedHidden: ['Honorários', 'Custas Processuais'],
      showsNewOption: true,
    },
  ])(
    'filtra opções para "$query" (nova categoria visível: $showsNewOption)',
    async ({ query, expectedVisible, expectedHidden, showsNewOption }) => {
      const onChange = vi.fn();
      render(<CategoriaAutocomplete id="cat" value="" onChange={onChange} />);

      await waitFor(() => expect(listarCategorias).toHaveBeenCalledOnce());

      const input = screen.getByPlaceholderText('Digite e selecione...');
      fireEvent.change(input, { target: { value: query } });

      expect(onChange).toHaveBeenCalledWith(query);

      expectedVisible.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
      expectedHidden.forEach((item) => {
        expect(screen.queryByText(item)).not.toBeInTheDocument();
      });

      const newOptionText = `Nova categoria: "${query.trim()}"`;
      if (showsNewOption) {
        expect(screen.getByText(newOptionText)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(newOptionText)).not.toBeInTheDocument();
      }
    }
  );

  it('seleciona uma categoria existente ou nova com mouseDown e fecha a lista', async () => {
    const onChange = vi.fn();
    render(<CategoriaAutocomplete id="cat" value="" onChange={onChange} />);

    await waitFor(() => expect(listarCategorias).toHaveBeenCalledOnce());

    const input = screen.getByPlaceholderText('Digite e selecione...');
    fireEvent.focus(input);

    fireEvent.mouseDown(screen.getByText('Honorários'));
    expect(onChange).toHaveBeenCalledWith('Honorários');
    expect(input).toHaveValue('Honorários');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Nova Cat' } });
    fireEvent.mouseDown(screen.getByText('Nova categoria: "Nova Cat"'));
    expect(onChange).toHaveBeenCalledWith('Nova Cat');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('fecha a lista ao clicar fora do componente e sincroniza mudança externa de value', async () => {
    const { rerender } = render(
      <div>
        <CategoriaAutocomplete id="cat" value="Inicial" onChange={vi.fn()} />
        <button type="button">Fora</button>
      </div>
    );

    await waitFor(() => expect(listarCategorias).toHaveBeenCalledOnce());

    const input = screen.getByPlaceholderText('Digite e selecione...');
    expect(input).toHaveValue('Inicial');

    fireEvent.focus(input);
    expect(screen.getByRole('list')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    rerender(
      <div>
        <CategoriaAutocomplete id="cat" value="Atualizado" onChange={vi.fn()} />
        <button type="button">Fora</button>
      </div>
    );
    expect(input).toHaveValue('Atualizado');
  });

  it('trata erro ao buscar categorias sem quebrar o componente', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    listarCategorias.mockRejectedValueOnce(new Error('Falha de rede'));

    render(<CategoriaAutocomplete id="cat" value="" onChange={vi.fn()} />);

    await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    consoleSpy.mockRestore();
  });
});
