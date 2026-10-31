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

  it.each([
    { label: 'email', value: 'ana@exemplo.com' },
    { label: 'senha', value: 'senha-segura' },
  ])('inicia vazio e atualiza o campo "$label"', ({ label, value }) => {
    render(createElement(LoginConsumer));

    const input = screen.getByLabelText(label);
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value } });
    expect(input).toHaveValue(value);
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

  it('ignora uma segunda submissão enquanto o login está em andamento', async () => {
    let resolveLogin;
    loginMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );
    render(createElement(LoginConsumer));

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.submit(submitButton);
    fireEvent.submit(submitButton);

    expect(loginMock).toHaveBeenCalledTimes(1);
    resolveLogin({ token: 'token' });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it.each([
    {
      cenario: 'instância de Error com mensagem customizada',
      rejeicao: new Error('Credenciais inválidas'),
      mensagemEsperada: 'Credenciais inválidas',
    },
    {
      cenario: 'rejeição que não é um Error',
      rejeicao: 'falha',
      mensagemEsperada: 'Não foi possível entrar.',
    },
  ])(
    'exibe a mensagem de erro apropriada quando o login falha ($cenario)',
    async ({ rejeicao, mensagemEsperada }) => {
      loginMock.mockRejectedValueOnce(rejeicao);
      render(createElement(LoginConsumer));

      fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByTestId('erro')).toHaveTextContent(
        mensagemEsperada
      );
      expect(pushMock).not.toHaveBeenCalled();
    }
  );
});
