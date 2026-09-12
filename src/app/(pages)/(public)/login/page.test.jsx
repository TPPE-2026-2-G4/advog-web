import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import LoginPage from './page';

const mockLogin = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
    });
  });

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

  it('renderiza os campos, o link de recuperação e o botão de envio', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email empresarial')).toHaveAttribute(
      'type',
      'email'
    );
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(
      screen.getByRole('link', {
        name: 'Esqueci minha senha',
      })
    ).toHaveAttribute('href', '/esqueci-senha');
    expect(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    ).toBeInTheDocument();
  });

  it('permite preencher o email e a senha', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email empresarial');
    const passwordInput = screen.getByLabelText('Senha');

    fireEvent.change(emailInput, {
      target: { value: 'dr@carreiro.adv.br' },
    });
    fireEvent.change(passwordInput, {
      target: { value: 'senha-segura' },
    });

    expect(emailInput).toHaveValue('dr@carreiro.adv.br');
    expect(passwordInput).toHaveValue('senha-segura');
  });

  it('realiza login com as credenciais preenchidas', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'fake-token',
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'dr@carreiro.adv.br' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'dr@carreiro.adv.br',
        'senha-segura'
      );
    });
  });

  it('exibe mensagem de erro quando o login falha', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Email ou senha inválidos'));

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Email ou senha inválidos')
    ).toBeInTheDocument();
  });
});
