import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';
import DashboardClient from './dashboardClient';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessosCriticos, obterProcesso } from '@/services/processos';
import { getCurrentUser } from '@/utils/authSession';

vi.mock('@/services/clientes', () => ({
  listarClientes: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('@/services/processos', () => ({
  listarProcessosCriticos: vi.fn(),
  obterProcesso: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

const mockProcesses = [
  {
    processo_id: 101,
    cnj: '0061234-56.2026.8.26.0100',
    titulo: 'Ação de Cobrança Teste',
    status: 'Ativo',
    tribunal: 'TJSP',
    area: 'Civil',
    data_inicio: '2026-01-10T10:00:00',
    data_realizado: '2026-09-01T12:00:00',
    data_prazo: '2026-11-10T18:00:00',
    cliente_id: 1,
    funcionario_id: 2,
  },
];

describe('DashboardPage e DashboardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: {
          visualizar_processos: true,
        },
      },
    });
    listarClientes.mockResolvedValue([
      { cliente_id: 1, nome: 'Empresa Alpha Ltda' },
    ]);
    listarFuncionarios.mockResolvedValue([
      { funcionario_id: 2, nome: 'Dr. Roberto Dias' },
    ]);
    listarProcessosCriticos.mockResolvedValue(mockProcesses);
  });

  it('renderiza o componente DashboardClient a partir de DashboardPage', async () => {
    render(<DashboardPage />);

    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText('Processos Críticos (Sem movimentação)')
      ).toBeInTheDocument();
    });
  });

  it('exibe tela de acesso negado quando o usuário não possui permissão de visualizar processos', () => {
    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: {
          visualizar_processos: false,
        },
      },
    });

    render(<DashboardClient />);

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(
      screen.getByText('Você não possui permissão para visualizar processos.')
    ).toBeInTheDocument();
    expect(listarProcessosCriticos).not.toHaveBeenCalled();
  });

  it('carrega processos críticos, enriquece com nomes de cliente e responsável e abre modal ao clicar em Analisar', async () => {
    obterProcesso.mockResolvedValueOnce({
      ...mockProcesses[0],
      descricao: 'Descrição completa do caso crítico',
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
      expect(screen.getAllByText('Empresa Alpha Ltda')[0]).toBeInTheDocument();
    });

    const analyzeButtons = screen.getAllByRole('button', { name: 'Analisar' });
    fireEvent.click(analyzeButtons[0]);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent('Ação de Cobrança Teste');
    });

    expect(
      screen.getByText('Descrição completa do caso crítico')
    ).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: 'Fechar' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('exibe banner de aviso quando o carregamento de referências falha', async () => {
    listarClientes.mockRejectedValueOnce(new Error('Falha ao listar clientes'));

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Falha ao listar clientes'
      );
    });
  });
});
