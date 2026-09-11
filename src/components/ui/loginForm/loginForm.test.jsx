import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginForm from './loginForm';
import { useAuth } from '@/hooks/useAuth';

const mockLogin = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
    });
  });

  it('renderiza os campos, o link de recuperação e o botão de envio', () => {
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText('dr@carreiro.adv.br');

    const passwordInput = screen.getByPlaceholderText('••••••••');

    expect(emailInput).toBeInTheDocument();

    expect(emailInput).toHaveAttribute('type', 'email');

    expect(passwordInput).toBeInTheDocument();

    expect(passwordInput).toHaveAttribute('type', 'password');

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
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText('dr@carreiro.adv.br');

    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, {
      target: {
        value: 'dr@carreiro.adv.br',
      },
    });

    fireEvent.change(passwordInput, {
      target: {
        value: 'senha-segura',
      },
    });

    expect(emailInput.value).toBe('dr@carreiro.adv.br');

    expect(passwordInput.value).toBe('senha-segura');
  });

  it('realiza login com as credenciais preenchidas', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'fake-token',
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText('dr@carreiro.adv.br'), {
      target: {
        value: 'dr@carreiro.adv.br',
      },
    });

    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: {
        value: 'senha-segura',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'dr@carreiro.adv.br',
        'senha-segura'
      );
    });
  });

  it('exibe mensagem de erro quando o login falha', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Email ou senha inválidos'));

    render(<LoginForm />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    );

    expect(
      await screen.findByText('Email ou senha inválidos')
    ).toBeInTheDocument();
  });
});
