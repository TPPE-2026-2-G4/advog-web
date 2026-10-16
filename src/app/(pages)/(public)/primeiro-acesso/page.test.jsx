import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { firstLogin as mockFirstLogin } from '@/services/auth';
import FirstLoginPage from './page';

const { mockPush, mockGetSearchParam } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetSearchParam: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  firstLogin: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

describe('FirstLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue('fake-token');
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

    expect(
      screen.getByRole('checkbox', {
        name: 'Sou estagiário(a) / ainda não possuo OAB',
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText('UF da OAB')).toBeInTheDocument();
    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Concluir cadastro' })
    ).toBeInTheDocument();
  });

  it('oculta os campos da OAB quando o usuário marca que não possui OAB', () => {
    render(<FirstLoginPage />);

    const checkbox = screen.getByRole('checkbox', {
      name: 'Sou estagiário(a) / ainda não possuo OAB',
    });

    expect(screen.getByLabelText('UF da OAB')).toBeInTheDocument();
    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();

    expect(screen.queryByLabelText('UF da OAB')).not.toBeInTheDocument();

    expect(screen.queryByLabelText('Número da OAB')).not.toBeInTheDocument();
  });

  it('exibe novamente os campos da OAB quando o usuário desmarca a opção', () => {
    render(<FirstLoginPage />);

    const checkbox = screen.getByRole('checkbox', {
      name: 'Sou estagiário(a) / ainda não possuo OAB',
    });

    fireEvent.click(checkbox);

    expect(screen.queryByLabelText('UF da OAB')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Número da OAB')).not.toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByLabelText('UF da OAB')).toBeInTheDocument();
    expect(screen.getByLabelText('Número da OAB')).toBeInTheDocument();
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

  it('realiza o primeiro acesso com os dados da OAB preenchidos', async () => {
    let resolveFirstLogin;

    mockFirstLogin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstLogin = resolve;
        })
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

    const submitButton = screen.getByRole('button', {
      name: 'Concluir cadastro',
    });

    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Salvando')).toBeInTheDocument();

    expect(
      screen.getByRole('status', { name: 'Carregando' })
    ).toBeInTheDocument();

    resolveFirstLogin({ success: true });

    await waitFor(() => {
      expect(mockFirstLogin).toHaveBeenCalledWith({
        token: 'fake-token',
        nome: 'Maria Souza Lima',
        senha: 'senha-segura',
        uf: 'DF',
        numeroOab: '123456',
      });
      expect(mockPush).toHaveBeenCalledWith('/login?cadastro=sucesso');
    });

    expect(submitButton).not.toBeDisabled();
  });

  it('realiza o primeiro acesso sem enviar os dados da OAB quando o usuário não possui OAB', async () => {
    mockFirstLogin.mockResolvedValueOnce({
      success: true,
    });

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

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Sou estagiário(a) / ainda não possuo OAB',
      })
    );

    expect(screen.queryByLabelText('UF da OAB')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Número da OAB')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Concluir cadastro',
      })
    );

    await waitFor(() => {
      expect(mockFirstLogin).toHaveBeenCalledWith({
        token: 'fake-token',
        nome: 'Maria Souza Lima',
        senha: 'senha-segura',
      });
      expect(mockPush).toHaveBeenCalledWith('/login?cadastro=sucesso');
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

    expect(
      screen.getByRole('button', { name: 'Concluir cadastro' })
    ).not.toBeDisabled();
  });
});
