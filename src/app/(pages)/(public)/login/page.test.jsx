import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renderiza a identidade visual da página', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', { name: 'Alexandre Carreiro' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gestão Jurídica de Alta Performance')
    ).toBeInTheDocument();
  });

  it('renderiza o acesso ao sistema', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', { name: 'Acesso ao Sistema' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Insira suas credenciais para continuar')
    ).toBeInTheDocument();
  });
});
