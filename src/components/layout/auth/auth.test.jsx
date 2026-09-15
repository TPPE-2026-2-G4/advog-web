import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Auth from './auth';

describe('Auth', () => {
  it('renderiza a identidade visual da aplicação', () => {
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

  it('renderiza corretamente as props de título e subtítulo', () => {
    render(
      <Auth
        title="Acesso ao Sistema"
        subtitle="Insira suas credenciais para continuar"
      >
        <div />
      </Auth>
    );

    expect(
      screen.getByRole('heading', {
        name: 'Acesso ao Sistema',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText('Insira suas credenciais para continuar')
    ).toBeInTheDocument();
  });

  it('renderiza o conteúdo filho recebido', () => {
    render(
      <Auth title="Teste" subtitle="Teste">
        <p>Conteúdo filho</p>
      </Auth>
    );

    expect(screen.getByText('Conteúdo filho')).toBeInTheDocument();
  });
});
