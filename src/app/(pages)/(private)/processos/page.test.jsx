import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarProcessos } from '@/services/processos';
import ProcessosPage from './page';

vi.mock('@/services/processos', () => ({
  listarProcessos: vi.fn(),
}));

vi.mock('./processosClient', () => ({
  default: ({ initialData, initialError }) => (
    <output data-testid="processos-client">
      {JSON.stringify({ initialData, initialError })}
    </output>
  ),
}));

const processData = {
  id: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
};

describe('ProcessosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca os processos no servidor e entrega os dados ao cliente', async () => {
    listarProcessos.mockResolvedValue([processData]);

    render(await ProcessosPage());

    expect(listarProcessos).toHaveBeenCalledOnce();
    expect(screen.getByTestId('processos-client')).toHaveTextContent(
      JSON.stringify({ initialData: [processData], initialError: '' })
    );
  });

  it('entrega um erro inicial sem derrubar a página', async () => {
    listarProcessos.mockRejectedValue(new Error('API indisponível'));

    render(await ProcessosPage());

    expect(screen.getByTestId('processos-client')).toHaveTextContent(
      JSON.stringify({ initialData: [], initialError: 'API indisponível' })
    );
  });

  it('usa mensagem padrão para rejeições desconhecidas', async () => {
    listarProcessos.mockRejectedValue('falha');

    render(await ProcessosPage());

    expect(screen.getByTestId('processos-client')).toHaveTextContent(
      'Não foi possível carregar os processos.'
    );
  });
});
