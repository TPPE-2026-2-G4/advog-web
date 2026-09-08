import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginForm from './loginForm';
import { login } from '@/services/auth';

const mockPush = vi.fn();

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    login.mockResolvedValueOnce({
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
      expect(login).toHaveBeenCalledWith('dr@carreiro.adv.br', 'senha-segura');
    });
  });

  it('redireciona para o dashboard após login bem sucedido', async () => {
    login.mockResolvedValueOnce({
      token: 'fake-token',
    });

    render(<LoginForm />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Entrar',
      })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('exibe mensagem de erro quando o login falha', async () => {
    login.mockRejectedValueOnce(new Error('Email ou senha inválidos'));

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
