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
    sessionStorage.clear();
  });

  it.each([
    {
      cenario: 'sem usuário no storage',
      setupStorage: () => {},
      textoEsperado: 'Nenhum usuário',
    },
    {
      cenario: 'com usuário salvo previamente no sessionStorage',
      setupStorage: () =>
        sessionStorage.setItem(
          'current_user',
          JSON.stringify({ email: 'restaurado@exemplo.com' })
        ),
      textoEsperado: 'restaurado@exemplo.com',
    },
  ])('inicializa corretamente $cenario', ({ setupStorage, textoEsperado }) => {
    setupStorage();

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent(textoEsperado);
  });

  it.each([
    {
      cenario: 'payload padrão (access_token + funcionario)',
      authData: {
        funcionario: { id: 1, email: 'ana@exemplo.com' },
        access_token: 'token-de-teste',
      },
      emailEsperado: 'ana@exemplo.com',
      tokenEsperado: 'token-de-teste',
    },
    {
      cenario: 'payload backend persistindo em localStorage e sessionStorage',
      authData: {
        access_token: 'jwt-backend',
        funcionario: { id: 2, email: 'backend@exemplo.com' },
      },
      emailEsperado: 'backend@exemplo.com',
      tokenEsperado: 'jwt-backend',
    },
    {
      cenario: 'payload vazio sem token ou usuário',
      authData: {},
      emailEsperado: 'Nenhum usuário',
      tokenEsperado: null,
    },
  ])(
    'processa login com $cenario',
    async ({ authData, emailEsperado, tokenEsperado }) => {
      loginServiceMock.mockResolvedValue(authData);

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(emailEsperado);
      });

      expect(loginServiceMock).toHaveBeenCalledWith(
        'ana@exemplo.com',
        'senha-segura'
      );
      expect(localStorage.getItem('token')).toBe(tokenEsperado);
      expect(localStorage.getItem('access_token')).toBe(tokenEsperado);
      expect(sessionStorage.getItem('access_token')).toBe(tokenEsperado);
    }
  );

  it('remove o usuário e limpa storages ao fazer logout', async () => {
    loginServiceMock.mockResolvedValue({
      funcionario: { email: 'ana@exemplo.com' },
      access_token: 'token-de-teste',
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
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });
});
