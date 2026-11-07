import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForgotPassword } from './useForgotPassword';

const { requestMock, resetMock, getParamMock, pushMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  resetMock: vi.fn(),
  getParamMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  requestPasswordReset: requestMock,
  resetPassword: resetMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: getParamMock }),
}));

function Consumer({ resetMode = false }) {
  const state = useForgotPassword({ resetMode });
  const field = (label, value, setter) =>
    createElement('input', {
      'aria-label': label,
      value,
      onChange: (event) => setter(event.target.value),
    });

  return createElement(
    'form',
    { onSubmit: state.handleSubmit },
    resetMode
      ? [
          field('senha', state.senha, state.setSenha),
          field(
            'confirmar senha',
            state.confirmarSenha,
            state.setConfirmarSenha
          ),
        ]
      : field('email', state.email, state.setEmail),
    createElement('output', { 'data-testid': 'erro' }, state.erro),
    createElement(
      'output',
      { 'data-testid': 'enviado' },
      String(state.enviado)
    ),
    createElement('button', { type: 'submit' }, 'Enviar')
  );
}

describe('useForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getParamMock.mockReturnValue(null);
  });

  it('envia o e-mail e marca o fluxo como enviado', async () => {
    requestMock.mockResolvedValueOnce({ mensagem: 'ok' });
    render(createElement(Consumer));

    fireEvent.change(screen.getByLabelText('email'), {
      target: { value: 'ana@exemplo.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith('ana@exemplo.com');
    });
    expect(screen.getByTestId('enviado')).toHaveTextContent('true');
  });

  it('rejeita a redefinição quando as senhas não conferem', async () => {
    getParamMock.mockReturnValue('token-reset');
    render(createElement(Consumer, { resetMode: true }));

    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha-um' },
    });
    fireEvent.change(screen.getByLabelText('confirmar senha'), {
      target: { value: 'senha-dois' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'As senhas não conferem.'
    );
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('redefine a senha e redireciona para o login', async () => {
    getParamMock.mockReturnValue('token-reset');
    resetMock.mockResolvedValueOnce({ mensagem: 'ok' });
    render(createElement(Consumer, { resetMode: true }));

    fireEvent.change(screen.getByLabelText('senha'), {
      target: { value: 'senha-nova' },
    });
    fireEvent.change(screen.getByLabelText('confirmar senha'), {
      target: { value: 'senha-nova' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledWith({
        token: 'token-reset',
        senha: 'senha-nova',
      });
      expect(pushMock).toHaveBeenCalledWith('/login?senha=sucesso');
    });
  });

  it('impede o envio da redefinição sem token', async () => {
    render(createElement(Consumer, { resetMode: true }));

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'Link de redefinição inválido ou expirado.'
    );
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('exibe a mensagem da falha do serviço', async () => {
    requestMock.mockRejectedValueOnce(new Error('Serviço indisponível'));
    render(createElement(Consumer));

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByTestId('erro')).toHaveTextContent(
      'Serviço indisponível'
    );
  });

  it.each([
    {
      resetMode: false,
      rejeicao: 'falha inesperada',
      mensagem: 'Não foi possível enviar o link de redefinição.',
    },
    {
      resetMode: true,
      rejeicao: 'falha inesperada',
      mensagem: 'Não foi possível redefinir sua senha.',
    },
  ])(
    'usa a mensagem padrão quando a API rejeita sem Error ($resetMode)',
    async ({ resetMode, rejeicao, mensagem }) => {
      getParamMock.mockReturnValue(resetMode ? 'token-reset' : null);
      const serviceMock = resetMode ? resetMock : requestMock;
      serviceMock.mockRejectedValueOnce(rejeicao);
      render(createElement(Consumer, { resetMode }));

      fireEvent.submit(screen.getByRole('button', { name: 'Enviar' }));

      expect(await screen.findByTestId('erro')).toHaveTextContent(mensagem);
    }
  );

  it('ignora uma segunda submissão enquanto a solicitação está em andamento', async () => {
    let resolveRequest;
    requestMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    render(createElement(Consumer));

    const submitButton = screen.getByRole('button', { name: 'Enviar' });
    fireEvent.submit(submitButton);
    fireEvent.submit(submitButton);

    expect(requestMock).toHaveBeenCalledTimes(1);
    resolveRequest({ mensagem: 'ok' });

    await waitFor(() => {
      expect(screen.getByTestId('enviado')).toHaveTextContent('true');
    });
  });
});
