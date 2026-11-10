import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { listarFuncionarios } from '@/services/funcionarios';
import AjustesPage from './page';

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('./ajustesClient', () => ({
  default: ({ initialTeam }) => (
    <div data-testid="ajustes-client">{JSON.stringify(initialTeam)}</div>
  ),
}));

describe('AjustesPage', () => {
  it('busca a lista de funcionários e repassa para AjustesClient', async () => {
    const mockTeam = [
      {
        funcionario_id: 1,
        nome: 'Alexandre Carreiro',
        email: 'alexandre@carreiro.adv.br',
        receber_emails: true,
      },
    ];
    listarFuncionarios.mockResolvedValueOnce(mockTeam);

    const PageComponent = await AjustesPage();
    render(PageComponent);

    expect(listarFuncionarios).toHaveBeenCalledOnce();
    expect(screen.getByTestId('ajustes-client')).toHaveTextContent(
      JSON.stringify(mockTeam)
    );
  });
});
