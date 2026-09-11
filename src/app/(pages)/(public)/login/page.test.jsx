import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from './page';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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
