import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import RootLayout from '@/app/layout';
import UserMenu from '@/components/layout/navbar/userMenu';
import PrivateLayout from './layout';
import DashboardPage from './dashboard/page';
import { AuthProvider } from '@/contexts/AuthContext';
import {
  InstitucionalProvider,
  useInstitucionalContext,
} from '@/contexts/InstitucionalContext';
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

    // Reabre dropdown, navega para /ajustes ao clicar em Configurações
    fireEvent.click(screen.getByText('Dra. C.'));
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    expect(mockPush).toHaveBeenCalledWith('/ajustes');

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

  it('integra InstitucionalProvider no RootLayout: inicializa com cache, atualiza dados, aplica CSS e sincroniza com eventos customizados e storage', async () => {
    localStorage.setItem(
      'institucional_data',
      JSON.stringify({
        corPrimaria: '#223344',
        corSecundaria: '#889900',
        nomeEscritorio: 'Cached Escritório',
      })
    );

    function TestInstitucional() {
      const { institucional, atualizarInstitucional } =
        useInstitucionalContext();
      return (
        <div>
          <span data-testid="nome-escritorio">
            {institucional.nomeEscritorio}
          </span>
          <span data-testid="cor-primaria">{institucional.corPrimaria}</span>
          <button
            onClick={() =>
              atualizarInstitucional({
                nomeEscritorio: 'Escritório Atualizado Manualmente',
                corPrimaria: '#112233',
                corSecundaria: '#445566',
              })
            }
          >
            Atualizar Manual
          </button>
        </div>
      );
    }

    render(
      <RootLayout>
        <TestInstitucional />
      </RootLayout>
    );

    // Variável CSS aplicada pelo cache
    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria')
    ).toBe('#223344');

    // Atualização manual via atualizarInstitucional
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Manual' }));

    expect(screen.getByTestId('nome-escritorio')).toHaveTextContent(
      'Escritório Atualizado Manualmente'
    );
    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria')
    ).toBe('#112233');

    // Evento institucional-updated
    act(() => {
      window.dispatchEvent(
        new CustomEvent('institucional-updated', {
          detail: {
            nomeEscritorio: 'Escritório Via Evento Customizado',
            corPrimaria: '#334455',
          },
        })
      );
    });

    expect(screen.getByTestId('nome-escritorio')).toHaveTextContent(
      'Escritório Via Evento Customizado'
    );
    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria')
    ).toBe('#334455');

    // Evento storage com JSON válido
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'institucional_data',
          newValue: JSON.stringify({
            nomeEscritorio: 'Escritório Via Storage',
            corPrimaria: '#556677',
            corSecundaria: '#778899',
          }),
        })
      );
    });

    expect(screen.getByTestId('nome-escritorio')).toHaveTextContent(
      'Escritório Via Storage'
    );
    expect(
      document.documentElement.style.getPropertyValue('--cor-primaria')
    ).toBe('#556677');

    // Evento storage com JSON inválido (não quebra)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'institucional_data',
          newValue: 'invalid-json{{{',
        })
      );
    });

    expect(screen.getByTestId('nome-escritorio')).toHaveTextContent(
      'Escritório Via Storage'
    );
  });

  describe('menu do usuário: variações de dados e de sessão', () => {
    const renderMenu = (user) => {
      sessionStorage.setItem('current_user', JSON.stringify(user));
      return render(<UserMenu />);
    };

    it.each([
      [
        'nomes e e-mail no formato legado',
        {
          nome_func: 'Carlos Eduardo Lima',
          email_func: 'carlos@advog.com',
          nome_cargo: 'Sócio',
        },
        'Carlos E.',
        'Sócio',
        'carlos@advog.com',
      ],
      [
        'cargo informado como texto',
        { nome: 'Ana', email: 'ana@advog.com', cargo: 'Advogada' },
        'Ana',
        'Advogada',
        'ana@advog.com',
      ],
      [
        'cargo com nome_cargo',
        { nome: 'Ana Paula', cargo: { nome_cargo: 'Gerente' } },
        'Ana P.',
        'Gerente',
        '',
      ],
      [
        'cargo com nome',
        { nome: 'Ana Paula', cargo: { nome: 'Estagiária' } },
        'Ana P.',
        'Estagiária',
        '',
      ],
      [
        'usuário sem nome nem cargo',
        { email: 'anonimo@advog.com', cargo: {} },
        '',
        '',
        'anonimo@advog.com',
      ],
    ])('exibe o usuário com %s', (_label, user, shortName, role, email) => {
      renderMenu(user);

      const trigger = screen.getAllByRole('button')[0];
      expect(trigger).toHaveTextContent(`${shortName}${role}`);

      fireEvent.click(trigger);
      if (email) expect(screen.getByText(email)).toBeInTheDocument();
    });

    it('fecha o menu ao clicar fora e encerra a sessão sem o provedor de autenticação', () => {
      sessionStorage.setItem('access_token', 'token');
      renderMenu({ nome: 'Ana Paula', email: 'ana@advog.com' });

      const trigger = screen.getAllByRole('button')[0];
      fireEvent.click(trigger);
      expect(screen.getByText('ana@advog.com')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByText('ana@advog.com')).not.toBeInTheDocument();

      fireEvent.click(trigger);
      fireEvent.mouseDown(screen.getByText('ana@advog.com'));
      expect(screen.getByText('ana@advog.com')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Sair/i }));
      fireEvent.click(
        screen.getByRole('button', { name: /^Sair$|Confirmar/i })
      );

      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(getAccessToken()).toBeNull();
    });
  });
});
