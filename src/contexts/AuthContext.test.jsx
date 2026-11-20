import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/useAuth';
import { syncCurrentUserRolePermissions } from '@/utils/authSession';
import { AuthProvider } from './AuthContext';

const { loginServiceMock, obterMeuPerfilMock } = vi.hoisted(() => ({
  loginServiceMock: vi.fn(),
  obterMeuPerfilMock: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/services/auth', () => ({
  login: loginServiceMock,
}));

vi.mock('@/services/funcionarios', () => ({
  obterMeuPerfil: obterMeuPerfilMock,
}));

function AuthConsumer() {
  const { user, login, updateUser, logout } = useAuth();

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
      <button
        type="button"
        onClick={() => updateUser({ nome: 'Ana Souza Atualizada' })}
      >
        Atualizar perfil
      </button>
    </>
  );
}

describe('AuthProvider', () => {
  afterEach(() => {
    loginServiceMock.mockReset();
    obterMeuPerfilMock.mockReset();
    obterMeuPerfilMock.mockResolvedValue(null);
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

  it('atualiza o usuário e persiste os dados do perfil nos storages', async () => {
    const user = {
      funcionario_id: 1,
      nome: 'Ana Souza',
      email: 'ana@exemplo.com',
    };
    sessionStorage.setItem('current_user', JSON.stringify(user));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar perfil' }));

    await waitFor(() => {
      expect(sessionStorage.getItem('current_user')).toContain(
        'Ana Souza Atualizada'
      );
    });
    expect(JSON.parse(localStorage.getItem('current_user'))).toEqual({
      ...user,
      nome: 'Ana Souza Atualizada',
    });
  });

  it('recupera foto de perfil atualizada do funcionário ao fazer login novamente', async () => {
    loginServiceMock.mockResolvedValue({
      access_token: 'token-de-teste',
      funcionario: {
        funcionario_id: 8,
        nome: 'Ana Souza',
        email: 'ana@exemplo.com',
      },
    });
    obterMeuPerfilMock.mockResolvedValue({
      funcionario_id: 8,
      atuacao_id: 5,
      foto_perfil_url: 'https://storage.exemplo.com/ana.png',
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem('current_user')).foto_perfil_url
      ).toBe('https://storage.exemplo.com/ana.png');
      expect(JSON.parse(localStorage.getItem('current_user')).atuacao_id).toBe(
        5
      );
    });
    expect(obterMeuPerfilMock).toHaveBeenCalledOnce();
  });

  it.each([
    {
      cenario: 'JWT com expiração em 30 minutos',
      token: () => {
        const exp = Math.floor(Date.now() / 1000) + 1800;
        return `h.${btoa(JSON.stringify({ exp }))}.s`;
      },
      maxAgeEsperado: (valor) => valor > 1790 && valor <= 1800,
    },
    {
      cenario: 'token sem expiração identificável',
      token: () => 'token-opaco',
      maxAgeEsperado: (valor) => valor === 3600,
    },
  ])(
    'grava o cookie de acesso com a mesma validade do token para $cenario',
    async ({ token, maxAgeEsperado }) => {
      loginServiceMock.mockResolvedValue({
        funcionario: { email: 'ana@exemplo.com' },
        access_token: token(),
      });
      const cookieSetter = vi.spyOn(document, 'cookie', 'set');

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('ana@exemplo.com');
      });

      const cookie = cookieSetter.mock.calls.at(-1)[0];
      const maxAge = Number(cookie.match(/max-age=(\d+)/)[1]);
      expect(cookie).toContain('access_token=');
      expect(maxAgeEsperado(maxAge)).toBe(true);

      cookieSetter.mockRestore();
    }
  );

  it('encerra a sessão anterior (admin) antes de autenticar uma nova conta (davi), mesmo quando login retorna apenas access_token', async () => {
    const tokenDavi = `h.${btoa(
      JSON.stringify({ sub: '5', email: 'davi@exemplo.com', nome: 'Davi' })
    )}.s`;
    localStorage.setItem('token', 'token-admin');
    localStorage.setItem('access_token', 'token-admin');
    localStorage.setItem('auth_active_token', 'token-admin');
    localStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        nome: 'Administrador',
        email: 'admin@advog.com',
        cargo: { nome_cargo: 'Administrador' },
      })
    );
    sessionStorage.setItem('access_token', 'token-admin');
    sessionStorage.setItem('auth_active_token', 'token-admin');
    sessionStorage.setItem(
      'current_user',
      localStorage.getItem('current_user')
    );

    loginServiceMock.mockResolvedValue({
      access_token: tokenDavi,
    });
    obterMeuPerfilMock.mockResolvedValue({
      funcionario_id: 5,
      nome: 'Davi Rodrigues',
      email: 'davi@exemplo.com',
      cargo: {
        cargo_id: 2,
        nome_cargo: 'Advogado',
        permissao: { visualizar_processos: true },
      },
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('admin@advog.com');

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('davi@exemplo.com');
    });

    expect(localStorage.getItem('access_token')).toBe(tokenDavi);
    expect(localStorage.getItem('auth_active_token')).toBe(tokenDavi);
    expect(sessionStorage.getItem('access_token')).toBe(tokenDavi);
    expect(JSON.parse(sessionStorage.getItem('current_user'))).toMatchObject({
      funcionario_id: 5,
      nome: 'Davi Rodrigues',
      email: 'davi@exemplo.com',
    });
  });

  it('usa o payload do JWT como fallback se obterMeuPerfil falhar durante login sem campo funcionario', async () => {
    const tokenDavi = `h.${btoa(
      JSON.stringify({ sub: '5', email: 'davi@exemplo.com', nome: 'Davi' })
    )}.s`;
    loginServiceMock.mockResolvedValue({ access_token: tokenDavi });
    obterMeuPerfilMock.mockRejectedValue(new Error('Falha temporária'));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('davi@exemplo.com');
    });
  });

  it('sincroniza o usuário do contexto imediatamente ao receber StorageEvent ou atualização de permissões do cargo', () => {
    const tokenDavi = `h.${btoa(
      JSON.stringify({ sub: '5', email: 'davi@exemplo.com' })
    )}.s`;
    localStorage.setItem('auth_active_token', 'token-admin');
    localStorage.setItem('access_token', 'token-admin');
    sessionStorage.setItem('access_token', 'token-admin');
    sessionStorage.setItem('auth_active_token', 'token-admin');
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        email: 'admin@advog.com',
        cargo_id: 1,
        cargo: { cargo_id: 1, nome_cargo: 'Administrador' },
      })
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('admin@advog.com');

    act(() => {
      localStorage.setItem('auth_active_token', tokenDavi);
      localStorage.setItem('access_token', tokenDavi);
      localStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 5,
          email: 'davi@exemplo.com',
          cargo_id: 2,
          cargo: {
            cargo_id: 2,
            nome_cargo: 'Advogado',
            permissao: { visualizar_processos: true },
          },
        })
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'auth_active_token',
          newValue: tokenDavi,
        })
      );
    });

    expect(screen.getByTestId('user')).toHaveTextContent('davi@exemplo.com');

    act(() => {
      syncCurrentUserRolePermissions({
        cargo_id: 2,
        nome_cargo: 'Advogado',
        permissao: { visualizar_processos: false, visualizar_clientes: true },
      });
    });

    expect(
      JSON.parse(sessionStorage.getItem('current_user')).cargo.permissao
    ).toEqual({
      visualizar_processos: false,
      visualizar_clientes: true,
    });
  });
});
