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
});
