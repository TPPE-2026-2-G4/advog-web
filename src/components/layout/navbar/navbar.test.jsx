import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Navbar from './navbar';

vi.mock('@/hooks/useNotificacoes', () => ({
  useNotificacoes: vi.fn(() => ({ naoLidasCount: 2 })),
}));

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

  it('aciona o callback ao clicar no botão do menu mobile e atualiza aria-expanded', () => {
    const onToggleMobileMenu = vi.fn();
    const { rerender } = render(
      <Navbar
        isMobileMenuOpen={false}
        onToggleMobileMenu={onToggleMobileMenu}
      />
    );

    const openBtn = screen.getByRole('button', {
      name: 'Abrir menu de navegação',
    });
    expect(openBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(openBtn);
    expect(onToggleMobileMenu).toHaveBeenCalledTimes(1);

    rerender(
      <Navbar isMobileMenuOpen onToggleMobileMenu={onToggleMobileMenu} />
    );
    const closeBtn = screen.getByRole('button', {
      name: 'Fechar menu de navegação',
    });
    expect(closeBtn).toHaveAttribute('aria-expanded', 'true');
  });
});
