import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renderiza a identidade e os textos da página de login', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', { name: 'Alexandre Carreiro' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gestão Jurídica de Alta Performance')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Acesso ao Sistema' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Insira suas credenciais para continuar')
    ).toBeInTheDocument();
  });

  it('renderiza os campos e as ações do formulário', () => {
    render(<LoginPage />);

    expect(
      screen.getByPlaceholderText('dr@carreiro.adv.br')
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute(
      'type',
      'password'
    );
    expect(
      screen.getByRole('link', { name: 'Esqueci minha senha' })
    ).toHaveAttribute('href', '/esqueci-senha');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
