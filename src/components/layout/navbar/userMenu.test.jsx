import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UserMenu from './userMenu';
import { AuthContext } from '@/contexts/AuthContext';
import { getCurrentUser } from '@/utils/authSession';

const { pushMock, clearAuthSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  clearAuthSessionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
  clearAuthSession: clearAuthSessionMock,
}));

describe('UserMenu', () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearAuthSessionMock.mockClear();
    getCurrentUser.mockReturnValue({
      nome: 'Alexandre Carreiro',
      cargo: 'Advogado(a)',
      email: 'alexandre@carreiro.adv.br',
    });
  });

  describe('Testes parametrizados de fallback e formatos de usuário', () => {
    it.each([
      [
        'usuário padrão (mock completo)',
        {
          nome: 'Alexandre Carreiro',
          cargo: 'Advogado(a)',
          email: 'alexandre@carreiro.adv.br',
        },
        'Alexandre C.',
        'Advogado(a)',
        'AC',
      ],
      [
        'usuário apenas com primeiro nome',
        { nome: 'João', cargo: { nome_cargo: 'Sócio' }, email: 'joao@adv.br' },
        'João',
        'Sócio',
        'J',
      ],
      [
        'usuário com propriedades _func',
        {
          nome_func: 'Maria Aparecida',
          cargo: { nome: 'Estagiária' },
          email_func: 'maria@adv.br',
        },
        'Maria A.',
        'Estagiária',
        'MA',
      ],
      [
        'usuário sem cargo definido',
        { nome: 'Carlos Souza', email: 'carlos@adv.br' },
        'Carlos S.',
        '',
        'CS',
      ],
    ])(
      'deve renderizar %s corretamente',
      async (
        descricao,
        mockUser,
        expectedShortName,
        expectedRole,
        expectedInitials
      ) => {
        getCurrentUser.mockReturnValue(mockUser);
        const { unmount } = render(<UserMenu />);
        expect(await screen.findByText(expectedShortName)).toBeInTheDocument();
        if (expectedRole) {
          expect(screen.getByText(expectedRole)).toBeInTheDocument();
        }
        expect(screen.getByText(expectedInitials)).toBeInTheDocument();
        unmount();
      }
    );
  });

  it('renderiza o usuário e mantém o menu fechado inicialmente', async () => {
    render(<UserMenu />);

    expect(await screen.findByText('Alexandre C.')).toBeInTheDocument();
    expect(screen.getByText('Advogado(a)')).toBeInTheDocument();
    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('abre o menu ao clicar no usuário', async () => {
    render(<UserMenu />);
    const triggerText = await screen.findByText('Alexandre C.');
    fireEvent.click(triggerText.closest('button'));

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
    const triggerText = await screen.findByText('Alexandre C.');
    const trigger = triggerText.closest('button');

    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('fecha o menu ao clicar fora dele', async () => {
    render(
      <div>
        <UserMenu />
        <button type="button">Área externa</button>
      </div>
    );
    const triggerText = await screen.findByText('Alexandre C.');
    fireEvent.click(triggerText.closest('button'));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Área externa' }));

    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('não fecha o menu ao clicar dentro dele', async () => {
    render(<UserMenu />);
    const triggerText = await screen.findByText('Alexandre C.');
    fireEvent.click(triggerText.closest('button'));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Meu perfil/i }));

    expect(screen.getByText('Alexandre Carreiro')).toBeInTheDocument();
  });

  it('remove o listener de clique externo ao desmontar', async () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<UserMenu />);

    // Wait for mount
    await screen.findByText('Alexandre C.');

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function)
    );
    removeEventListener.mockRestore();
  });

  it('abre o modal de confirmação ao clicar em Sair e fecha ao cancelar sem deslogar', async () => {
    render(<UserMenu />);
    const triggerText = await screen.findByText('Alexandre C.');
    fireEvent.click(triggerText.closest('button'));

    const logoutButton = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutButton);

    expect(screen.getByText('Deseja sair da sua conta?')).toBeInTheDocument();
    expect(clearAuthSessionMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByText('Deseja sair da sua conta?')
    ).not.toBeInTheDocument();
    expect(clearAuthSessionMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('desloga limpando a sessão e redirecionando para /login ao confirmar no modal', async () => {
    render(<UserMenu />);
    const triggerText = await screen.findByText('Alexandre C.');
    fireEvent.click(triggerText.closest('button'));

    const logoutButton = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutButton);

    const confirmButton = screen.getByRole('button', {
      name: 'Confirmar e sair',
    });
    fireEvent.click(confirmButton);

    expect(clearAuthSessionMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });

  it('chama auth.logout e redireciona para /login ao confirmar no modal com AuthContext presente', async () => {
    const mockLogout = vi.fn();
    const mockUser = {
      nome: 'Alexandre Carreiro',
      cargo: 'Advogado(a)',
      email: 'alexandre@carreiro.adv.br',
    };

    render(
      <AuthContext.Provider value={{ user: mockUser, logout: mockLogout }}>
        <UserMenu />
      </AuthContext.Provider>
    );

    const triggerText = await screen.findByText('Alexandre C.');
    fireEvent.click(triggerText.closest('button'));

    const logoutButton = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutButton);

    const confirmButton = screen.getByRole('button', {
      name: 'Confirmar e sair',
    });
    fireEvent.click(confirmButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
