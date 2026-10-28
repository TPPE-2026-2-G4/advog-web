import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from './navbar';

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(() => ({
    nome: 'Alexandre Carreiro',
    cargo: 'Advogado(a)',
    email: 'alexandre@carreiro.adv.br',
  })),
  clearAuthSession: vi.fn(),
}));

describe('Navbar', () => {
  it.each([
    {
      description: 'botão de notificações',
      verify: () =>
        expect(
          screen.getByRole('button', { name: 'Notificações' })
        ).toBeInTheDocument(),
    },
    {
      description: 'badge com a quantidade de notificações',
      verify: () => expect(screen.getByText('2')).toBeInTheDocument(),
    },
    {
      description: 'divisor visual entre notificações e menu do usuário',
      verify: (container) =>
        expect(
          container.querySelector('[class*="divider"]')
        ).toBeInTheDocument(),
    },
  ])('renderiza o $description', ({ verify }) => {
    const { container } = render(<Navbar />);
    verify(container);
  });

  it('renderiza o menu do usuário recolhido inicialmente', async () => {
    render(<Navbar />);

    expect(await screen.findByText('Alexandre C.')).toBeInTheDocument();
    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });
});
