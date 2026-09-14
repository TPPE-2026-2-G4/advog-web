import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogin } from './useLogin';

const { loginMock, pushMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

function LoginConsumer() {
  const login = useLogin();

  return createElement(
    'form',
    { onSubmit: login.handleSubmit },
    createElement('input', {
      'aria-label': 'email',
      value: login.email,
      onChange: (event) => login.setEmail(event.target.value),
    }),
    createElement('input', {
      'aria-label': 'senha',
      value: login.senha,
      onChange: (event) => login.setSenha(event.target.value),
    }),
    createElement('output', { 'data-testid': 'erro' }, login.erro),
    createElement('button', { type: 'submit' }, 'Entrar')
  );
}

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia vazio e atualiza email e senha', () => {
    render(createElement(LoginConsumer));

    const email = screen.getByLabelText('email');
    const senha = screen.getByLabelText('senha');

    expect(email).toHaveValue('');
    expect(senha).toHaveValue('');

    fireEvent.change(email, { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(senha, { target: { value: 'senha-segura' } });

    expect(email).toHaveValue('ana@exemplo.com');
    expect(senha).toHaveValue('senha-segura');
  });

  it('faz login e redireciona para o dashboard', async () => {
    loginMock.mockResolvedValueOnce({ token: 'token' });
    render(createElement(LoginConsumer));

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'ana@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('ana@exemplo.com', 'senha-segura');
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('exibe a mensagem de um erro de login', async () => {
    loginMock.mockRejectedValueOnce(new Error('Credenciais inválidas'));
    render(createElement(LoginConsumer));

    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'Credenciais inválidas'
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('exibe a mensagem padrão para uma rejeição que não é um Error', async () => {
    loginMock.mockRejectedValueOnce('falha');
    render(createElement(LoginConsumer));

    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'Não foi possível entrar.'
    );
  });
});
