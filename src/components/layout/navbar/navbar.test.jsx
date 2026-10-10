import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from './navbar';

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(() => ({
    nome: 'Alexandre Carreiro',
    cargo: 'Advogado(a)',
    email: 'alexandre@carreiro.adv.br',
  })),
}));

describe('Navbar', () => {
  it('renderiza o botão de notificações e a quantidade de notificações', () => {
    render(<Navbar />);

    expect(
      screen.getByRole('button', { name: 'Notificações' })
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renderiza o divisor e o menu do usuário', async () => {
    const { container } = render(<Navbar />);

    expect(container.querySelector('[class*="divider"]')).toBeInTheDocument();
    expect(await screen.findByText('Alexandre C.')).toBeInTheDocument();
  });

  it('mantém o menu do usuário fechado inicialmente', () => {
    render(<Navbar />);

    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });
});
