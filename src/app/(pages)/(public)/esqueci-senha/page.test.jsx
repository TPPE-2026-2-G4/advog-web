import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordContent } from './page';

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

const defaultState = (overrides = {}) => ({
  token: null,
  email: '',
  setEmail: vi.fn(),
  senha: '',
  setSenha: vi.fn(),
  confirmarSenha: '',
  setConfirmarSenha: vi.fn(),
  erro: '',
  enviado: false,
  isSubmitting: false,
  handleSubmit: vi.fn((event) => event.preventDefault()),
  ...overrides,
});

describe('ForgotPasswordContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextMock.mockReturnValue({ institucional: null });
    hookMock.mockReturnValue(defaultState());
  });

  it('renderiza o formulário para solicitar o link por e-mail', () => {
    render(<ForgotPasswordContent />);

    expect(
      screen.getByRole('heading', { name: 'Recuperar senha' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Informe seu e-mail para receber o link de redefinição')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email empresarial')).toHaveAttribute(
      'type',
      'email'
    );
    expect(
      screen.getByRole('button', { name: 'Enviar link' })
    ).toBeInTheDocument();
  });

  it('renderiza o formulário de redefinição com token', () => {
    hookMock.mockReturnValue(defaultState({ token: 'token-reset' }));
    render(<ForgotPasswordContent resetMode />);

    expect(
      screen.getByRole('heading', { name: 'Redefinir senha' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute(
      'type',
      'password'
    );
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Redefinir senha' })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Email empresarial')
    ).not.toBeInTheDocument();
  });

  it('exibe o feedback após solicitar o link', () => {
    hookMock.mockReturnValue(defaultState({ enviado: true }));
    render(<ForgotPasswordContent />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'você irá receber um link em instantes'
    );
    expect(
      screen.getByRole('link', { name: 'Voltar para o login' })
    ).toHaveAttribute('href', '/login');
  });

  it('exibe erro e desabilita o botão durante o envio', () => {
    hookMock.mockReturnValue(
      defaultState({ erro: 'Token inválido', isSubmitting: true })
    );
    render(<ForgotPasswordContent resetMode />);

    expect(screen.getByText('Token inválido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redefinindo/i })).toBeDisabled();
    expect(
      screen.getByRole('status', { name: 'Carregando' })
    ).toBeInTheDocument();
  });

  it('submete o formulário através do hook', () => {
    const handleSubmit = vi.fn((event) => event.preventDefault());
    hookMock.mockReturnValue(defaultState({ handleSubmit }));
    render(<ForgotPasswordContent />);

    fireEvent.submit(screen.getByRole('button', { name: 'Enviar link' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('aplica a identidade institucional ao botão, link e painel de autenticação', () => {
    contextMock.mockReturnValue({
      institucional: {
        nomeEscritorio: 'Carreiro Advogados',
        corPrimaria: '#0F172A',
        corSecundaria: '#EAB308',
      },
    });
    render(<ForgotPasswordContent />);

    expect(screen.getByTestId('auth-brand')).toHaveStyle({
      backgroundColor: '#0F172A',
    });
    expect(screen.getByRole('button', { name: 'Enviar link' })).toHaveStyle({
      backgroundColor: '#EAB308',
      color: '#172133',
    });
    expect(
      screen.getByRole('link', { name: 'Voltar para o login' })
    ).toHaveStyle({ color: '#EAB308' });
  });
});
