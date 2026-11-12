import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Auth from './auth';

describe('Auth', () => {
  it('renderiza a identidade visual fixa da aplicação', () => {
    render(
      <Auth title="Teste" subtitle="Teste">
        <div />
      </Auth>
    );

    expect(
      screen.getByRole('heading', {
        name: 'Alexandre Carreiro',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText('Gestão Jurídica de Alta Performance')
    ).toBeInTheDocument();
  });

  it.each([
    {
      title: 'Acesso ao Sistema',
      subtitle: 'Insira suas credenciais para continuar',
      childText: 'Formulário de Login',
    },
    {
      title: 'Recuperar Senha',
      subtitle: 'Informe seu e-mail para receber o link',
      childText: 'Formulário de Recuperação',
    },
  ])(
    'renderiza corretamente title ("$title"), subtitle e children',
    ({ title, subtitle, childText }) => {
      render(
        <Auth title={title} subtitle={subtitle}>
          <p>{childText}</p>
        </Auth>
      );

      expect(
        screen.getByRole('heading', {
          name: title,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(subtitle)).toBeInTheDocument();
      expect(screen.getByText(childText)).toBeInTheDocument();
    }
  );

  it('aplica dados e cores customizados de institucional no painel brand', () => {
    const customInstitucional = {
      nomeEscritorio: 'Carreiro Advogados Associados',
      descricao: 'Excelência e tradição jurídica',
      corPrimaria: '#0F172A', // escuro
      corSecundaria: '#EAB308', // claro
    };

    render(
      <Auth
        title="Entrar"
        subtitle="Acesse sua conta"
        institucional={customInstitucional}
      >
        <div />
      </Auth>
    );

    expect(
      screen.getByRole('heading', {
        name: 'Carreiro Advogados Associados',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gestão Jurídica de Alta Performance')
    ).toBeInTheDocument();

    const brand = screen.getByTestId('auth-brand');
    expect(brand).toHaveStyle({
      backgroundColor: '#0F172A',
      color: '#ffffff',
    });

    const badge = screen.getByTestId('auth-logo-badge');
    expect(badge).toHaveStyle({
      backgroundColor: '#EAB308',
      color: '#172133',
    });
  });

  it('renderiza imagem de logotipo quando fornecida', () => {
    const customInstitucional = {
      nomeEscritorio: 'Advocacia Especial',
      logotipo: 'https://exemplo.com/logo.png',
    };

    render(
      <Auth
        title="Entrar"
        subtitle="Subtítulo"
        institucional={customInstitucional}
      >
        <div />
      </Auth>
    );

    const img = screen.getByTestId('auth-logo-img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://exemplo.com/logo.png');
    expect(screen.queryByTestId('auth-logo-badge')).not.toBeInTheDocument();
  });

  it('contrasta a cor do texto do brand para escuro quando corPrimaria for clara', () => {
    const customInstitucional = {
      nomeEscritorio: 'Escritório Luz',
      descricao: 'Atendimento claro',
      corPrimaria: '#FFFFFF', // claro
      corSecundaria: '#000000', // escuro
    };

    render(
      <Auth
        title="Entrar"
        subtitle="Subtítulo"
        institucional={customInstitucional}
      >
        <div />
      </Auth>
    );

    const brand = screen.getByTestId('auth-brand');
    expect(brand).toHaveStyle({
      backgroundColor: '#FFFFFF',
      color: '#172133',
    });

    const badge = screen.getByTestId('auth-logo-badge');
    expect(badge).toHaveStyle({
      backgroundColor: '#000000',
      color: '#ffffff',
    });
  });

  it('renderiza a logo dedicada acima do título para mobile com e sem logotipo customizado', () => {
    const { rerender } = render(
      <Auth title="Acesso ao Sistema" subtitle="Insira suas credenciais">
        <div />
      </Auth>
    );

    const mobileLogoWrapper = screen.getByTestId('auth-mobile-logo');
    const title = screen.getByRole('heading', { name: 'Acesso ao Sistema' });
    expect(
      mobileLogoWrapper.compareDocumentPosition(title) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByTestId('auth-mobile-logo-badge')).toBeInTheDocument();
    expect(
      screen.queryByTestId('auth-mobile-logo-img')
    ).not.toBeInTheDocument();

    rerender(
      <Auth
        title="Acesso ao Sistema"
        subtitle="Insira suas credenciais"
        institucional={{
          nomeEscritorio: 'Advocacia Especial',
          logotipo: 'https://exemplo.com/logo.png',
        }}
      >
        <div />
      </Auth>
    );

    const mobileImg = screen.getByTestId('auth-mobile-logo-img');
    expect(mobileImg).toHaveAttribute('src', 'https://exemplo.com/logo.png');
    expect(
      screen.queryByTestId('auth-mobile-logo-badge')
    ).not.toBeInTheDocument();
  });
});
