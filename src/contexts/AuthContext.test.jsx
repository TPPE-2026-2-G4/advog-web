import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from './AuthContext';

const { loginServiceMock } = vi.hoisted(() => ({
  loginServiceMock: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  login: loginServiceMock,
}));

function AuthConsumer() {
  const { user, login, logout } = useAuth();

  return (
    <>
      <output data-testid="user">{user?.email ?? 'Nenhum usuário'}</output>
      <button
        type="button"
        onClick={() => login('ana@exemplo.com', 'senha-segura')}
      >
        Entrar
      </button>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </>
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    loginServiceMock.mockReset();
    localStorage.clear();
  });

  it('inicia sem usuário autenticado', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('Nenhum usuário');
  });

  it('autentica o usuário, salva o token e repassa os dados do serviço', async () => {
    const authData = {
      user: { id: 1, email: 'ana@exemplo.com' },
      token: 'token-de-teste',
    };
    loginServiceMock.mockResolvedValue(authData);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('ana@exemplo.com');
    });
    expect(loginServiceMock).toHaveBeenCalledWith(
      'ana@exemplo.com',
      'senha-segura'
    );
    expect(localStorage.getItem('token')).toBe('token-de-teste');
  });

  it('remove o usuário ao fazer logout', async () => {
    loginServiceMock.mockResolvedValue({
      user: { email: 'ana@exemplo.com' },
      token: 'token-de-teste',
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('ana@exemplo.com');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.getByTestId('user')).toHaveTextContent('Nenhum usuário');
  });
});
