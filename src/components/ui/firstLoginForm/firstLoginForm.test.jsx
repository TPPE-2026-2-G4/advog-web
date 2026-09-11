import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FirstLoginForm from './firstLoginForm';
import { useAuth } from '@/hooks/useAuth';

const mockFirstLogin = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('FirstLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      firstLogin: mockFirstLogin,
    });
  });

  it('renderiza todos os campos e ações do formulário', () => {
    render(<FirstLoginForm />);

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();

    expect(screen.getByLabelText('Senha')).toBeInTheDocument();

    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument();

    expect(screen.getByLabelText('UF da OAB')).toBeInTheDocument();

    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Concluir cadastro',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: 'Acessar a plataforma',
      })
    ).toHaveAttribute('href', '/login');
  });

  it('permite preencher os dados do primeiro acesso', () => {
    render(<FirstLoginForm />);

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: {
        value: 'Maria Souza Lima',
      },
    });

    fireEvent.change(screen.getByLabelText('Senha'), {
      target: {
        value: 'senha-segura',
      },
    });

    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: {
        value: 'senha-segura',
      },
    });

    fireEvent.change(screen.getByLabelText('Número da OAB'), {
      target: {
        value: '123456',
      },
    });

    expect(screen.getByLabelText('Nome completo').value).toBe(
      'Maria Souza Lima'
    );

    expect(screen.getByLabelText('Senha').value).toBe('senha-segura');

    expect(screen.getByLabelText('Número da OAB').value).toBe('123456');
  });

  it('exibe erro quando as senhas não coincidem', async () => {
    render(<FirstLoginForm />);

    fireEvent.change(screen.getByLabelText('Senha'), {
      target: {
        value: 'senha-123',
      },
    });

    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: {
        value: 'senha-456',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Concluir cadastro',
      })
    );

    expect(
      await screen.findByText('As senhas não conferem.')
    ).toBeInTheDocument();

    expect(mockFirstLogin).not.toHaveBeenCalled();
  });

  it('realiza o primeiro acesso com os dados preenchidos', async () => {
    mockFirstLogin.mockResolvedValueOnce({
      success: true,
    });

    render(<FirstLoginForm />);

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: {
        value: 'Maria Souza Lima',
      },
    });

    fireEvent.change(screen.getByLabelText('Senha'), {
      target: {
        value: 'senha-segura',
      },
    });

    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: {
        value: 'senha-segura',
      },
    });

    fireEvent.change(screen.getByLabelText('UF da OAB'), {
      target: {
        value: 'DF',
      },
    });

    fireEvent.change(screen.getByLabelText('Número da OAB'), {
      target: {
        value: '123456',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Concluir cadastro',
      })
    );

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

    render(<FirstLoginForm />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Concluir cadastro',
      })
    );

    expect(
      await screen.findByText('Erro ao finalizar cadastro')
    ).toBeInTheDocument();
  });
});
