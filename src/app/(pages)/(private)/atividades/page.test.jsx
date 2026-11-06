import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AtividadesPage from './page';
import { obterKanbanAtividades } from '@/services/atividades';

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
}));

describe('AtividadesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterKanbanAtividades.mockResolvedValue({ escopo: 'usuario', etapas: [] });
  });

  it('renderiza o título e o subtítulo do quadro de atividades', async () => {
    render(<AtividadesPage />);

    expect(
      screen.getByRole('heading', { name: 'Quadro de Atividades' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gerencie as tarefas do escritório por status')
    ).toBeInTheDocument();

    await waitFor(() => expect(obterKanbanAtividades).toHaveBeenCalledOnce());
  });
});
