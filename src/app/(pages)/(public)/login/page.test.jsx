import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginPage from './page';

const { mockLogin, mockPush, mockReplace } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
  })),
  useSearchParams: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    useSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
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
    let resolveLogin;
    mockLogin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email empresarial'), {
      target: { value: 'dr@carreiro.adv.br' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    resolveLogin({ token: 'fake-token' });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'dr@carreiro.adv.br',
        'senha-segura'
      );
    });
    expect(submitButton).not.toBeDisabled();
  });

  it('exibe mensagem de erro quando o login falha', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Email ou senha inválidos'));

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Email ou senha inválidos')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toBeDisabled();
  });

  it('exibe e remove a mensagem de cadastro concluído ao chegar pelo primeiro acesso', async () => {
    vi.useFakeTimers();
    const getSearchParam = vi.fn().mockReturnValue('sucesso');
    useSearchParams.mockReturnValue({ get: getSearchParam });

    try {
      render(<LoginPage />);

      expect(
        screen.getByRole('status', {
          name: 'Cadastro finalizado com sucesso!',
        })
      ).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(
        screen.queryByRole('status', {
          name: 'Cadastro finalizado com sucesso!',
        })
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
