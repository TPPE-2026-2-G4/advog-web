import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProcessosData } from '@/services/processos';
import ProcessosPage from './page';

vi.mock('@/services/processos', () => ({
  getProcessosData: vi.fn(),
}));

vi.mock('./processosClient', () => ({
  default: ({ initialPage, initialError, responsaveis }) => (
    <output data-testid="processos-client">
      {JSON.stringify({ initialPage, initialError, responsaveis })}
    </output>
  ),
}));

describe('ProcessosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('entrega ao cliente os dados iniciais carregados no servidor', async () => {
    const data = {
      initialPage: {
        itens: [{ processo_id: 1, cnj: '0061234-56.2026.8.26.0100' }],
        total: 1,
        page: 1,
        pageSize: 5,
        totalPages: 1,
      },
      responsaveis: [{ value: '3', label: 'Ana Paula Ribeiro' }],
      initialError: '',
    };
    getProcessosData.mockResolvedValue(data);

    render(await ProcessosPage());

    expect(getProcessosData).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(screen.getByTestId('processos-client').textContent)
    ).toEqual(data);
  });

  it('entrega o erro inicial sem derrubar a página', async () => {
    getProcessosData.mockResolvedValue({
      initialPage: { itens: [], total: 0, page: 1, pageSize: 5, totalPages: 1 },
      responsaveis: [],
      initialError: 'API indisponível',
    });

    render(await ProcessosPage());

    expect(screen.getByTestId('processos-client')).toHaveTextContent(
      '"initialError":"API indisponível"'
    );
  });
});
