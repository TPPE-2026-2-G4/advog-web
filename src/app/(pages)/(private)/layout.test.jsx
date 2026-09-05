import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PrivateLayout from './layout';

vi.mock('@/components/layout/sidebar/sidebar', () => ({
  default: () => <aside data-testid="sidebar-mock">Sidebar</aside>,
}));

vi.mock('@/components/layout/navbar/navbar', () => ({
  default: () => <header data-testid="navbar-mock">Navbar</header>,
}));

describe('PrivateLayout', () => {
  it.each([
    ['conteúdo do dashboard', 'Dashboard'],
    ['conteúdo da equipe', 'Equipe'],
    ['conteúdo dos processos', 'Processos'],
  ])('renderiza %s dentro da área principal', (content, label) => {
    render(
      <PrivateLayout>
        <p aria-label={label}>{content}</p>
      </PrivateLayout>
    );

    expect(screen.getByRole('main')).toContainElement(
      screen.getByLabelText(label)
    );
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('renderiza sidebar, navbar e conteúdo principal', () => {
    render(
      <PrivateLayout>
        <div>Conteúdo protegido</div>
      </PrivateLayout>
    );

    expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('navbar-mock')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Conteúdo protegido');
  });

  it('mantém a ordem estrutural de sidebar, navbar e conteúdo', () => {
    const { container } = render(
      <PrivateLayout>
        <div>Conteúdo protegido</div>
      </PrivateLayout>
    );
    const layout = container.firstElementChild;

    expect(layout.children[0]).toHaveAttribute('data-testid', 'sidebar-mock');
    expect(layout.children[1].children[0]).toHaveAttribute(
      'data-testid',
      'navbar-mock'
    );
    expect(layout.children[1].children[1].tagName).toBe('MAIN');
  });

  it('aplica o layout flexível e a altura mínima da viewport', () => {
    const { container } = render(
      <PrivateLayout>
        <div>Conteúdo protegido</div>
      </PrivateLayout>
    );
    const layout = container.firstElementChild;

    expect(layout.style.display).toBe('flex');
    expect(layout.style.minHeight).toBe('100vh');
    expect(layout.style.backgroundColor).toBe('rgb(249, 249, 248)');
  });

  it('reserva a largura da sidebar e evita overflow na área de conteúdo', () => {
    const { container } = render(
      <PrivateLayout>
        <div>Conteúdo protegido</div>
      </PrivateLayout>
    );
    const contentContainer = container.firstElementChild.children[1];

    expect(contentContainer).toHaveStyle({
      width: 'calc(100% - 80px)',
      minWidth: '0',
      marginLeft: '80px',
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('mantém múltiplos filhos dentro do mesmo main', () => {
    render(
      <PrivateLayout>
        <h1>Primeiro conteúdo</h1>
        <p>Segundo conteúdo</p>
      </PrivateLayout>
    );

    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { name: 'Primeiro conteúdo' })
    ).toBeInTheDocument();
    expect(within(main).getByText('Segundo conteúdo')).toBeInTheDocument();
  });
});
