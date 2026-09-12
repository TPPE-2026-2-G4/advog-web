import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import FirstLoginPage from './page';

const mockFirstLogin = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('FirstLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      firstLogin: mockFirstLogin,
    });
  });

  it('renderiza o título e subtítulo do primeiro acesso', () => {
    render(<FirstLoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Primeiro acesso',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Complete seus dados para finalizar seu cadastro e acessar a plataforma'
      )
    ).toBeInTheDocument();
  });

  it('renderiza todos os campos e ações do formulário', () => {
    render(<FirstLoginPage />);

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument();
    expect(screen.getByLabelText('UF da OAB')).toBeInTheDocument();
    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Concluir cadastro' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Acessar a plataforma' })
    ).toHaveAttribute('href', '/login');
  });

  it('exibe erro quando as senhas não coincidem', async () => {
    render(<FirstLoginPage />);

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Souza Lima' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'senha-456' },
    });
    fireEvent.change(screen.getByLabelText('UF da OAB'), {
      target: { value: 'DF' },
    });
    fireEvent.change(screen.getByLabelText('Número da OAB'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }));

    expect(
      await screen.findByText('As senhas não conferem.')
    ).toBeInTheDocument();
    expect(mockFirstLogin).not.toHaveBeenCalled();
  });

  it('realiza o primeiro acesso com os dados preenchidos', async () => {
    mockFirstLogin.mockResolvedValueOnce({ success: true });

    render(<FirstLoginPage />);

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Souza Lima' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.change(screen.getByLabelText('UF da OAB'), {
      target: { value: 'DF' },
    });
    fireEvent.change(screen.getByLabelText('Número da OAB'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }));

    await waitFor(() => {
      expect(mockFirstLogin).toHaveBeenCalledWith({
        nome: 'Maria Souza Lima',
        senha: 'senha-segura',
        uf: 'DF',
        numeroOab: '123456',
      });
    });
  });

  it('exibe mensagem de erro quando o primeiro acesso falha', async () => {
    mockFirstLogin.mockRejectedValueOnce(
      new Error('Erro ao finalizar cadastro')
    );

    render(<FirstLoginPage />);
    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Maria Souza Lima' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'senha-segura' },
    });
    fireEvent.change(screen.getByLabelText('UF da OAB'), {
      target: { value: 'DF' },
    });
    fireEvent.change(screen.getByLabelText('Número da OAB'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }));

    expect(
      await screen.findByText('Erro ao finalizar cadastro')
    ).toBeInTheDocument();
  });
});
