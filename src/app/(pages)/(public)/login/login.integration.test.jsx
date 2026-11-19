import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

const { apiUrl, mockPush, mockReplace, mockGetSearchParam } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  return {
    apiUrl: 'http://localhost:8000',
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockGetSearchParam: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGetSearchParam,
  }),
}));

import { AuthProvider } from '@/contexts/AuthContext';
import LoginPage from './page';

function renderLoginIntegration() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}

describe('Integração: Fluxo de Login (LoginPage + useLogin + AuthProvider + services/auth + fetch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'access_token=; Max-Age=0; path=/';
    mockGetSearchParam.mockReturnValue(null);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('autentica o usuário via POST /auth/login, persiste sessão no storage/cookie e redireciona para /dashboard', async () => {
    const funcionarioMock = {
      funcionario_id: 7,
      nome: 'Dra. Helena Costa',
      email: 'helena@carreiro.adv.br',
      permissoes: ['gerenciar_processos', 'gerenciar_clientes'],
    };

    let resolveFetch;
    fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    renderLoginIntegration();

    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'helena@carreiro.adv.br' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaForte@2026' },
    });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'helena@carreiro.adv.br',
        senha: 'SenhaForte@2026',
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => funcionarioMock,
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'jwt-token-integracao-123',
          funcionario: funcionarioMock,
        }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(`${apiUrl}/funcionarios/perfil`, {
      headers: { Authorization: 'Bearer jwt-token-integracao-123' },
      cache: 'no-store',
    });
    expect(sessionStorage.getItem('access_token')).toBe(
      'jwt-token-integracao-123'
    );
    expect(localStorage.getItem('access_token')).toBe(
      'jwt-token-integracao-123'
    );
    expect(JSON.parse(sessionStorage.getItem('current_user'))).toEqual(
      funcionarioMock
    );
    expect(document.cookie).toContain('access_token=jwt-token-integracao-123');
    expect(submitButton).not.toBeDisabled();
  });

  it('ignora uma segunda submissão enquanto o login está em andamento', async () => {
    let resolveFetch;

    fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    renderLoginIntegration();

    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'usuario@carreiro.adv.br' },
    });

    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(fetch).toHaveBeenCalledTimes(1);

    expect(submitButton).toBeDisabled();

    const funcionarioMock = {
      funcionario_id: 8,
      nome: 'Usuário Teste',
      email: 'usuario@carreiro.adv.br',
      permissoes: [],
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => funcionarioMock,
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'jwt-token-duplicado',
          funcionario: funcionarioMock,
        }),
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      cenario: 'erro 401 com campo detail da API',
      status: 401,
      payload: { detail: 'Credenciais inválidas ou conta inativa.' },
      mensagemEsperada: 'Credenciais inválidas ou conta inativa.',
    },
    {
      cenario: 'erro 400 com campo message da API',
      status: 400,
      payload: { message: 'Conta bloqueada temporariamente.' },
      mensagemEsperada: 'Conta bloqueada temporariamente.',
    },
    {
      cenario: 'erro 500 sem detalhe usando mensagem padrão',
      status: 500,
      payload: {},
      mensagemEsperada: 'Email ou senha inválidos',
    },
  ])(
    'propaga e exibe na interface a mensagem quando POST /auth/login retorna $cenario',
    async ({ status, payload, mensagemEsperada }) => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => payload,
      });

      renderLoginIntegration();

      fireEvent.change(screen.getByLabelText('Email empresarial'), {
        target: { value: 'usuario@carreiro.adv.br' },
      });
      fireEvent.change(screen.getByLabelText('Senha'), {
        target: { value: 'senha-incorreta' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText(mensagemEsperada)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('access_token')).toBeNull();
    }
  );

  it('substitui sessão ativa do admin pela conta davi ao logar sem logout prévio (apenas access_token + obterMeuPerfil)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7200;
    const encodePayload = (payload) =>
      btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
    const adminToken = `hdr.${encodePayload({ sub: 1, email: 'admin@carreiro.adv.br', exp: futureExp })}.sig`;
    const daviToken = `hdr.${encodePayload({ sub: 22, email: 'davi@carreiro.adv.br', nome: 'Davi', exp: futureExp })}.sig`;

    localStorage.setItem('token', adminToken);
    localStorage.setItem('access_token', adminToken);
    localStorage.setItem('auth_active_token', adminToken);
    localStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        nome: 'Admin',
        email: 'admin@carreiro.adv.br',
      })
    );
    localStorage.setItem(
      'updated_roles_permissions',
      JSON.stringify({
        byId: { 1: { cargo_id: 1, permissao: { equipe: true } } },
        byName: {},
      })
    );
    sessionStorage.setItem('access_token', adminToken);
    sessionStorage.setItem('auth_active_token', adminToken);
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 1,
        nome: 'Admin',
        email: 'admin@carreiro.adv.br',
      })
    );
    document.cookie = `access_token=${adminToken}; path=/`;

    const daviPerfil = {
      funcionario_id: 22,
      nome: 'Davi Rodrigues',
      email: 'davi@carreiro.adv.br',
      cargo: {
        cargo_id: 3,
        nome_cargo: 'Advogado',
        permissao: { processo: true, cliente: true },
      },
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: daviToken,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => daviPerfil,
      });

    renderLoginIntegration();

    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'davi@carreiro.adv.br' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaDavi@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(localStorage.getItem('access_token')).toBe(daviToken);
    expect(localStorage.getItem('auth_active_token')).toBe(daviToken);
    expect(sessionStorage.getItem('access_token')).toBe(daviToken);
    expect(sessionStorage.getItem('auth_active_token')).toBe(daviToken);
    expect(localStorage.getItem('updated_roles_permissions')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('current_user'))).toEqual(
      daviPerfil
    );
    expect(document.cookie).toContain(`access_token=${daviToken}`);
    expect(document.cookie).not.toContain(adminToken);
  });

  it('usa fallback do token JWT quando /funcionarios/perfil falha após login com campo token', async () => {
    const encodePayload = (payload) =>
      btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
    const fallbackJwt = `hdr.${encodePayload({
      sub: 33,
      email: 'fallback@carreiro.adv.br',
      nome: 'Dra. Fallback',
    })}.sig`;

    fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: fallbackJwt,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Erro interno' }),
      });

    renderLoginIntegration();

    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'fallback@carreiro.adv.br' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'Senha@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(JSON.parse(localStorage.getItem('current_user'))).toEqual({
      funcionario_id: 33,
      email: 'fallback@carreiro.adv.br',
      nome: 'Dra. Fallback',
      cargo: '',
    });
  });
});
