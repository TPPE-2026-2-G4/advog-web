import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UserMenu from './userMenu';

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(() => ({
    nome: 'Alexandre Carreiro',
    cargo: 'Advogado(a)',
    email: 'alexandre@carreiro.adv.br',
  })),
}));

describe('UserMenu', () => {
  it('renderiza o usuário e mantém o menu fechado inicialmente', async () => {
    render(<UserMenu />);

    expect(await screen.findByText('Alexandre C.')).toBeInTheDocument();
    expect(screen.getByText('Advogado(a)')).toBeInTheDocument();
    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('abre o menu ao clicar no usuário', async () => {
    render(<UserMenu />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Alexandre C\. Advogado\(a\)/i,
      })
    );

    expect(screen.getByText('Alexandre Carreiro')).toBeInTheDocument();
    expect(screen.getByText('alexandre@carreiro.adv.br')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Meu perfil/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Configurações/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair/i })).toBeInTheDocument();
  });

  it('fecha o menu ao clicar novamente no usuário', async () => {
    render(<UserMenu />);
    const trigger = await screen.findByRole('button', {
      name: /Alexandre C\. Advogado\(a\)/i,
    });

    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('fecha o menu ao clicar fora dele', async () => {
    render(
      <>
        <UserMenu />
        <button type="button">Área externa</button>
      </>
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Alexandre C\. Advogado\(a\)/i,
      })
    );
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Área externa' }));

    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('não fecha o menu ao clicar dentro dele', async () => {
    render(<UserMenu />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Alexandre C\. Advogado\(a\)/i,
      })
    );
    fireEvent.mouseDown(screen.getByRole('button', { name: /Meu perfil/i }));

    expect(screen.getByText('Alexandre Carreiro')).toBeInTheDocument();
  });

  it('remove o listener de clique externo ao desmontar', () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<UserMenu />);

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function)
    );
    removeEventListener.mockRestore();
  });
});
