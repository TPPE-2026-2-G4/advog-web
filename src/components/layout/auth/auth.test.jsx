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
});
