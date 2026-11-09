import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordPage from './page';

const { hookMock, contextMock } = vi.hoisted(() => ({
  hookMock: vi.fn(),
  contextMock: vi.fn(),
}));

vi.mock('@/hooks/useForgotPassword', () => ({
  useForgotPassword: hookMock,
}));

vi.mock('@/contexts/InstitucionalContext', () => ({
  useInstitucionalContext: contextMock,
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextMock.mockReturnValue({ institucional: null });
    hookMock.mockReturnValue({
      token: 'token-reset',
      email: '',
      setEmail: vi.fn(),
      senha: '',
      setSenha: vi.fn(),
      confirmarSenha: '',
      setConfirmarSenha: vi.fn(),
      erro: '',
      enviado: false,
      isSubmitting: false,
      handleSubmit: vi.fn(),
    });
  });

  it('renderiza a rota dedicada para redefinição com token', () => {
    render(<ResetPasswordPage />);

    expect(
      screen.getByRole('heading', { name: 'Redefinir senha' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('mantém as cores institucionais na tela de redefinição', () => {
    contextMock.mockReturnValue({
      institucional: {
        nomeEscritorio: 'Escritório Silva',
        corPrimaria: '#FFFFFF',
        corSecundaria: '#111827',
      },
    });

    render(<ResetPasswordPage />);

    expect(screen.getByTestId('auth-brand')).toHaveStyle({
      backgroundColor: '#FFFFFF',
      color: '#172133',
    });
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toHaveStyle(
      {
        backgroundColor: '#111827',
        color: '#ffffff',
      }
    );
  });
});
