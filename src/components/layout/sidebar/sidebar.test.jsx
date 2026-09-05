import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import styles from './sidebar.module.css';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const menuItems = [
  ['/dashboard', 'Início'],
  ['/processos', 'Casos/Processos'],
  ['/atividades', 'Atividades'],
  ['/financas', 'Finanças'],
  ['/clientes', 'Clientes/CRM'],
  ['/pesquisa', 'Pesquisa'],
  ['/equipe', 'Equipe'],
  ['/calendario', 'Calendário'],
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
});
