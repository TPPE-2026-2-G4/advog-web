import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import RootLayout from '@/app/layout';
import PrivateLayout from './layout';
import DashboardPage from './dashboard/page';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { proxy } from '@/proxy';
import { getPermissionLabel } from '@/constants/permissions';
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
} from '@/utils/authSession';

const { mockPush, mockRedirect, mockPathname } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRedirect: vi.fn(),
  mockPathname: vi.fn(() => '/equipe'),
}));

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: 'inter-font' }),
  Cormorant_Garamond: () => ({ variable: 'cormorant-font' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname(),
  redirect: (...args) => mockRedirect(...args),
}));

function ProtectedConsumer() {
  const { user } = useAuth();
  const perms = (user?.permissoes || []).map((p) => getPermissionLabel(p));
  return (
    <div data-testid="protected-content">
      <span>Usuário logado: {user?.nome || 'Anônimo'}</span>
      <span>Permissões: {perms.join(', ')}</span>
    </div>
  );
}

describe('Integração: Layout Privado, Navegação, Sessão e Proxy (RootLayout + PrivateLayout + Sidebar + Navbar + UserMenu + LogoutConfirmModal + AuthContext + proxy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'access_token=; Max-Age=0; path=/';
    mockPathname.mockReturnValue('/equipe');
  });

  afterEach(() => {
    clearAuthSession();
  });

  it.each([
    {
      cenario: 'usuário não autenticado acessando rota privada /equipe',
      pathname: '/equipe',
      cookieToken: undefined,
      esperadoLocation: 'http://localhost:3000/login',
    },
    {
      cenario: 'usuário autenticado acessando /login',
      pathname: '/login',
      cookieToken: { value: 'jwt-valido' },
      esperadoLocation: 'http://localhost:3000/equipe',
    },
    {
      cenario: 'usuário autenticado acessando rota privada /financas',
      pathname: '/financas',
      cookieToken: { value: 'jwt-valido' },
      esperadoLocation: null,
    },
  ])(
    'integra o middleware proxy para $cenario',
    ({ pathname, cookieToken, esperadoLocation }) => {
      const request = {
        url: `http://localhost:3000${pathname}`,
        nextUrl: { pathname },
        cookies: {
          get: vi.fn(() => cookieToken),
        },
      };

      const response = proxy(request);

      if (esperadoLocation) {
        expect(response.headers.get('location')).toBe(esperadoLocation);
      } else {
        expect(response.headers.get('location')).toBeNull();
      }
    }
  );

  it('renderiza DashboardPage (/dashboard) com sucesso', () => {
    const element = DashboardPage();
    expect(element).toBeTruthy();
  });

  it('renderiza RootLayout + AuthProvider + PrivateLayout com Sidebar ativa, UserMenu, abre modal de confirmação e executa logout completo', async () => {
    const payloadJwt = btoa(
      JSON.stringify({
        sub: '10',
        nome: 'Dra. Camila Nogueira',
        email: 'camila@carreiro.adv.br',
        cargo: { nome_cargo: 'Sócia Diretora' },
        permissoes: ['gerenciar_equipe', 'permissao_customizada'],
      })
    );
    const fakeJwt = `header.${payloadJwt}.signature`;
    sessionStorage.setItem('access_token', fakeJwt);
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 10,
        nome: 'Dra. Camila Nogueira',
        email: 'camila@carreiro.adv.br',
        cargo: { nome_cargo: 'Sócia Diretora' },
        permissoes: ['gerenciar_equipe', 'permissao_customizada'],
      })
    );

    expect(getAccessToken()).toBe(fakeJwt);
    expect(getCurrentUser()?.nome).toBe('Dra. Camila Nogueira');

    render(
      <RootLayout>
        <AuthProvider>
          <PrivateLayout>
            <ProtectedConsumer />
          </PrivateLayout>
        </AuthProvider>
      </RootLayout>
    );

    // Verifica Sidebar e item ativo
    expect(screen.getByText('Carreiro Advogados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Equipe' })).toHaveAttribute(
      'href',
      '/equipe'
    );
    expect(screen.getByRole('link', { name: 'Finanças' })).toHaveAttribute(
      'href',
      '/financas'
    );

    // Verifica conteúdo protegido consumindo AuthContext + getPermissionLabel
    expect(screen.getByTestId('protected-content')).toHaveTextContent(
      'Usuário logado: Dra. Camila Nogueira'
    );
    expect(screen.getByTestId('protected-content')).toHaveTextContent(
      'Gerenciar equipe, Permissao customizada'
    );

    // Verifica Navbar e UserMenu (nome abreviado e cargo)
    expect(screen.getByText('Dra. C.')).toBeInTheDocument();
    expect(screen.getByText('Sócia Diretora')).toBeInTheDocument();

    // Abre dropdown do UserMenu e clica fora para fechar
    fireEvent.click(screen.getByText('Dra. C.'));
    expect(screen.getByText('camila@carreiro.adv.br')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(
      screen.queryByText('camila@carreiro.adv.br')
    ).not.toBeInTheDocument();

    // Reabre dropdown, abre modal de logout, cancela e depois confirma saída
    fireEvent.click(screen.getByText('Dra. C.'));
    fireEvent.click(screen.getByRole('button', { name: /sair/i }));

    expect(
      screen.getByRole('heading', { name: 'Deseja sair da sua conta?' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByRole('heading', { name: 'Deseja sair da sua conta?' })
    ).not.toBeInTheDocument();

    // Reabre e confirma logout
    fireEvent.click(screen.getByText('Dra. C.'));
    fireEvent.click(screen.getByRole('button', { name: /sair/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e sair' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    expect(getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('current_user')).toBeNull();
  });

  it.each([
    {
      cenario: 'usuário com nome único (nome_func) e cargo em string',
      userStorage: {
        nome_func: 'Roberto',
        email_func: 'roberto@adv.br',
        cargo: 'Consultor',
      },
      shortEsperado: 'Roberto',
      roleEsperado: 'Consultor',
    },
    {
      cenario:
        'usuário com cargo.nome no sessionStorage e disparo de evento storage',
      userStorage: {
        nome: 'Ana Beatriz',
        email: 'ana@adv.br',
        cargo: { nome: 'Advogada Plena' },
      },
      shortEsperado: 'Ana B.',
      roleEsperado: 'Advogada Plena',
    },
  ])(
    'resolve dados do usuário no UserMenu para $cenario',
    ({ userStorage, shortEsperado, roleEsperado }) => {
      sessionStorage.setItem('current_user', JSON.stringify(userStorage));

      render(
        <AuthProvider>
          <PrivateLayout>
            <div>Conteúdo</div>
          </PrivateLayout>
        </AuthProvider>
      );

      act(() => {
        window.dispatchEvent(new Event('storage'));
      });

      expect(screen.getByText(shortEsperado)).toBeInTheDocument();
      expect(screen.getByText(roleEsperado)).toBeInTheDocument();
    }
  );
});
