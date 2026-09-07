import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginForm from './loginForm';
import { login } from '@/services/auth';

vi.mock('@/services/auth', () => ({
  login: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os campos, o link de recuperação e o botão de envio', () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText('dr@carreiro.adv.br')).toHaveAttribute(
      'type',
      'email'
    );
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute(
      'type',
      'password'
    );
    expect(
      screen.getByRole('link', { name: 'Esqueci minha senha' })
    ).toHaveAttribute('href', '/esqueci-senha');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('envia o e-mail e a senha preenchidos', async () => {
    login.mockRejectedValueOnce(new Error('Email ou senha inválidos'));
    render(<LoginForm />);

    fireEvent.change(screen.getByPlaceholderText('dr@carreiro.adv.br'), {
      target: { value: 'dr@carreiro.adv.br' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('dr@carreiro.adv.br', 'senha-segura');
    });
  });

  it('exibe a mensagem retornada quando o login falha', async () => {
    login.mockRejectedValueOnce(new Error('Email ou senha inválidos'));
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Email ou senha inválidos')
    ).toBeInTheDocument();
  });
});
