import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { usePathname } from 'next/navigation';
import { InstitucionalContext } from '@/contexts/InstitucionalContext';
import Sidebar, { canViewMenuItem } from './sidebar';
import styles from './sidebar.module.css';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const menuItems = [
  ['/dashboard', 'Início'],
  ['/processos', 'Casos/Processos'],
  ['/atividades', 'Atividades'],
  ['/financas', 'Finanças'],
  ['/calendario', 'Calendário'],
  ['/clientes', 'Clientes/CRM'],
  ['/equipe', 'Equipe'],
  ['/site', 'Site'],
  ['/ajustes', 'Ajustes'],
];

describe('Sidebar', () => {
  it.each(menuItems)('renderiza o link %s com o texto %s', (path, label) => {
    usePathname.mockReturnValue('/dashboard');
    render(<Sidebar />);

    const link = screen.getByRole('link', { name: label });
    expect(link).toHaveAttribute('href', path);
  });

  it.each(['/dashboard', '/equipe', '/ajustes'])(
    'marca %s como rota ativa',
    (pathname) => {
      usePathname.mockReturnValue(pathname);
      render(<Sidebar />);

      const activeLabel = menuItems.find(([path]) => path === pathname)[1];
      const activeLink = screen.getByRole('link', { name: activeLabel });
      expect(activeLink).toHaveClass(styles.active);
      expect(
        activeLink.querySelector(`.${styles.activeIndicator}`)
      ).toBeInTheDocument();
    }
  );

  it('não marca links não correspondentes como ativos', () => {
    usePathname.mockReturnValue('/equipe');
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Equipe' })).toHaveClass(
      styles.active
    );
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveClass(
      styles.active
    );
    expect(
      screen
        .getByRole('link', { name: 'Início' })
        .querySelector(`.${styles.activeIndicator}`)
    ).not.toBeInTheDocument();
  });

  it('renderiza a identidade visual e todos os links de navegação', () => {
    usePathname.mockReturnValue('/dashboard');
    render(<Sidebar />);

    expect(screen.getByText('Carreiro Advogados')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(menuItems.length);
  });

  it('adapta a cor, o nome do escritório e o logotipo a partir do contexto institucional', () => {
    usePathname.mockReturnValue('/dashboard');
    const customInstitucional = {
      nomeEscritorio: 'Martins & Oliveira Advogados',
      corPrimaria: '#0F172A',
      corSecundaria: '#E2B857',
      logotipo: 'https://exemplo.com/sidebar-logo.png',
    };

    render(
      <InstitucionalContext.Provider
        value={{ institucional: customInstitucional }}
      >
        <Sidebar />
      </InstitucionalContext.Provider>
    );

    expect(
      screen.getByText('Martins & Oliveira Advogados')
    ).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toHaveStyle({
      backgroundColor: '#0F172A',
    });

    const logoImg = screen.getByAltText(
      'Logotipo Martins & Oliveira Advogados'
    );
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute(
      'src',
      'https://exemplo.com/sidebar-logo.png'
    );

    const activeLink = screen.getByRole('link', { name: 'Início' });
    expect(activeLink).toHaveStyle({ color: '#E2B857' });
  });

  it('oculta links de páginas quando o usuário não possui permissão de visualização', () => {
    usePathname.mockReturnValue('/dashboard');
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 15,
        nome: 'Advogado Júnior',
        email: 'junior@carreiro.adv.br',
        cargo: {
          nome_cargo: 'Advogado Júnior',
          permissao: {
            visualizar_processos: true,
          },
        },
      })
    );

    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Casos/Processos' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Atividades' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Finanças' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Calendário' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Clientes/CRM' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Equipe' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Site' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Ajustes' })).toBeInTheDocument();
  });

  it('cobre permissões de visualização para admin, cargo admin e rotas padrão', () => {
    expect(
      canViewMenuItem({ cargo: { nome_cargo: 'Administrador' } }, '/qualquer')
    ).toBe(true);
    expect(canViewMenuItem({ email: 'admin@advog.com' }, '/qualquer')).toBe(
      true
    );
    expect(canViewMenuItem({ funcionario_id: 1 }, '/rota-desconhecida')).toBe(
      true
    );
    expect(
      canViewMenuItem({ permissoes: ['visualizar_processos'] }, '/processos')
    ).toBe(true);
  });

  it('renderiza no servidor chamando a função de snapshot do SSR', () => {
    usePathname.mockReturnValue('/dashboard');
    const html = renderToString(<Sidebar />);
    expect(html).toContain('Início');
  });

  it('controla abertura e fechamento no modo mobile via backdrop, botão de fechar e clique em link', () => {
    usePathname.mockReturnValue('/dashboard');
    const onCloseMobile = vi.fn();
    const { rerender } = render(
      <Sidebar isMobileOpen={false} onCloseMobile={onCloseMobile} />
    );

    expect(screen.queryByTestId('sidebar-backdrop')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).not.toHaveClass(styles.mobileOpen);

    rerender(<Sidebar isMobileOpen onCloseMobile={onCloseMobile} />);
    expect(screen.getByTestId('sidebar')).toHaveClass(styles.mobileOpen);

    fireEvent.click(screen.getByTestId('sidebar-backdrop'));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
    fireEvent.click(screen.getByRole('link', { name: 'Início' }));

    expect(onCloseMobile).toHaveBeenCalledTimes(3);
  });
});
