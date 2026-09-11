import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renderiza o título e subtítulo de autenticação', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Acesso ao Sistema',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText('Insira suas credenciais para continuar')
    ).toBeInTheDocument();
  });

  it('renderiza o formulário de login', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    ).toBeInTheDocument();
  });
});
