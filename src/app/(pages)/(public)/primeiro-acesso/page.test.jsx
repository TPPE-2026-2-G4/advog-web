import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FirstLoginPage from './page';

describe('FirstLoginPage', () => {
  it('renderiza o título e subtítulo do primeiro acesso', () => {
    render(<FirstLoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Primeiro acesso',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Complete seus dados para finalizar seu cadastro e acessar a plataforma'
      )
    ).toBeInTheDocument();
  });

  it('renderiza o formulário de primeiro acesso', () => {
    render(<FirstLoginPage />);

    expect(
      screen.getByRole('button', {
        name: 'Concluir cadastro',
      })
    ).toBeInTheDocument();
  });
});
