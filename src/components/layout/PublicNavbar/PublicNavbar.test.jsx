import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PublicNavbar from './PublicNavbar';

describe('PublicNavbar', () => {
  it('renderiza os elementos padrão da navbar corretamente', () => {
    render(<PublicNavbar />);

    expect(screen.getByTestId('public-navbar')).toBeInTheDocument();
    expect(screen.getByText('Carreiro Advogados')).toBeInTheDocument();
    expect(screen.getByTestId('navbar-logo-badge')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute(
      'href',
      '#inicio'
    );
    expect(
      screen.getByRole('link', { name: 'Áreas de Atuação' })
    ).toHaveAttribute('href', '#areas');
    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute(
      'href',
      '#sobre'
    );
    expect(screen.getByRole('link', { name: 'Equipe' })).toHaveAttribute(
      'href',
      '#equipe'
    );
    expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute(
      'href',
      '#contato'
    );

    const painelLinks = screen.getAllByRole('link', { name: 'Acessar Painel' });
    expect(painelLinks.length).toBeGreaterThanOrEqual(1);
    expect(painelLinks[0]).toHaveAttribute('href', '/login');
  });

  it('aplica cores e dados customizados recebidos via props', () => {
    const customInstitucional = {
      nomeEscritorio: 'Silva & Associados',
      corPrimaria: '#0A192F',
      corSecundaria: '#D4AF37',
    };

    render(<PublicNavbar institucional={customInstitucional} />);

    expect(screen.getByText('Silva & Associados')).toBeInTheDocument();

    const header = screen.getByTestId('public-navbar');
    expect(header).toHaveStyle({ backgroundColor: '#0A192F' });

    const badge = screen.getByTestId('navbar-logo-badge');
    expect(badge).toHaveStyle({ backgroundColor: '#D4AF37' });

    const painelBtn = screen.getAllByRole('link', {
      name: 'Acessar Painel',
    })[0];
    expect(painelBtn).toHaveStyle({ backgroundColor: '#D4AF37' });
  });

  it('contrasta a cor do texto do botão Acessar Painel para claro quando a cor secundária for escura', () => {
    const customInstitucional = {
      corPrimaria: '#1B2A4A',
      corSecundaria: '#0F172A', // azul muito escuro
    };

    render(<PublicNavbar institucional={customInstitucional} />);

    const painelBtn = screen.getAllByRole('link', {
      name: 'Acessar Painel',
    })[0];
    expect(painelBtn).toHaveStyle({
      backgroundColor: '#0F172A',
      color: '#ffffff',
    });
  });

  it('contrasta a cor do texto do botão Acessar Painel para escuro quando a cor secundária for clara', () => {
    const customInstitucional = {
      corPrimaria: '#1B2A4A',
      corSecundaria: '#B79A63', // dourado claro
    };

    render(<PublicNavbar institucional={customInstitucional} />);

    const painelBtn = screen.getAllByRole('link', {
      name: 'Acessar Painel',
    })[0];
    expect(painelBtn).toHaveStyle({
      backgroundColor: '#B79A63',
      color: '#172133',
    });
  });

  it('renderiza imagem de logotipo quando fornecida', () => {
    const institucionalComLogo = {
      nomeEscritorio: 'Advocacia Especializada',
      logotipo: 'https://exemplo.com/logo.png',
    };

    render(<PublicNavbar institucional={institucionalComLogo} />);

    const img = screen.getByAltText('Logotipo Advocacia Especializada');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://exemplo.com/logo.png');
    expect(screen.queryByTestId('navbar-logo-badge')).not.toBeInTheDocument();
  });

  it('abre e fecha o menu mobile ao interagir com o botão hamburguer', () => {
    render(<PublicNavbar />);

    const toggleBtn = screen.getByRole('button', {
      name: /abrir menu de navegação/i,
    });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Clicar em um link dentro do menu fecha o menu mobile
    const mobileLink = screen
      .getByTestId('mobile-menu')
      .querySelector('a[href="#sobre"]');
    expect(mobileLink).toBeInTheDocument();
    fireEvent.click(mobileLink);

    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });

  it('remove a opção de Equipe da navbar quando hasTeam for false', () => {
    render(<PublicNavbar hasTeam={false} />);

    expect(
      screen.queryByRole('link', { name: 'Equipe' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Áreas de Atuação' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sobre' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contato' })).toBeInTheDocument();
  });

  it('remove a opção de Áreas de Atuação da navbar quando hasAreas for false', () => {
    render(<PublicNavbar hasAreas={false} />);

    expect(
      screen.queryByRole('link', { name: 'Áreas de Atuação' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Equipe' })).toBeInTheDocument();
  });

  it('aciona rolagem suave (smooth) ao clicar em um link de seção', () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    const mockElement = document.createElement('div');
    mockElement.id = 'areas';
    mockElement.getBoundingClientRect = () => ({ top: 500 });
    document.body.appendChild(mockElement);

    render(<PublicNavbar />);

    const areasLink = screen.getByRole('link', { name: 'Áreas de Atuação' });
    fireEvent.click(areasLink);

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
      })
    );

    const inicioLink = screen.getByRole('link', { name: 'Início' });
    fireEvent.click(inicioLink);

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });

    document.body.removeChild(mockElement);
  });
});
