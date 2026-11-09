import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';
import DashboardClient from './dashboardClient';
import { obterKanbanAtividades } from '@/services/atividades';
import { obterResumoAtividades } from '@/services/dashboard';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import {
  listarProcessos,
  listarProcessosCriticos,
  obterProcesso,
  obterResumoProcessos,
} from '@/services/processos';
import { getCurrentUser } from '@/utils/authSession';

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
}));

vi.mock('@/services/dashboard', () => ({
  obterResumoAtividades: vi.fn(),
}));

vi.mock('@/services/clientes', () => ({
  listarClientes: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('@/services/processos', () => ({
  listarProcessos: vi.fn(),
  listarProcessosCriticos: vi.fn(),
  obterProcesso: vi.fn(),
  obterResumoProcessos: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

const daysFromNowIso = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

const mockUpcomingPage = () => ({
  itens: [
    {
      processo_id: 202,
      cnj: '0099012-34.2026.8.26.0602',
      titulo: 'Recurso de Apelação',
      descricao: 'Recurso',
      status: 'Ativo',
      tribunal: 'TJSP',
      area: 'Civil',
      data_prazo: `${daysFromNowIso(2)}T18:00:00`,
      cliente_id: 1,
      funcionario_id: 2,
    },
  ],
  total: 1,
  page: 1,
  page_size: 100,
  total_pages: 1,
});

const mockProcessSummary = {
  total: 9,
  em_andamento: 4,
  em_analise: 2,
  finalizados: 1,
  proximos_do_prazo: 2,
  atrasados: 3,
};

const mockSummary = {
  escopo: 'escritorio',
  pendentes: 3,
  em_execucao: 7,
  concluidas: 4,
  atrasadas: 2,
};

const mockKanban = {
  escopo: 'escritorio',
  etapas: [
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [
        {
          atividade_id: 10,
          titulo: 'Redigir petição inicial',
          data_prazo: '2999-09-02T18:00:00',
          processo_id: null,
          responsaveis: [{ funcionario_id: 1, nome: 'Ana Paula' }],
        },
      ],
    },
  ],
};

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
    obterResumoProcessos.mockResolvedValue(mockProcessSummary);
    listarProcessos.mockResolvedValue(mockUpcomingPage());
    obterResumoAtividades.mockResolvedValue(mockSummary);
    obterKanbanAtividades.mockResolvedValue(mockKanban);
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
      expect(screen.getByText('Prazos Próximos')).toBeInTheDocument();
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
    expect(listarProcessos).not.toHaveBeenCalled();
    expect(obterResumoProcessos).not.toHaveBeenCalled();
    expect(screen.queryByText('Resumo de Processos')).not.toBeInTheDocument();
    expect(screen.queryByText('Prazos Próximos')).not.toBeInTheDocument();
  });

  it('carrega processos críticos e prazos próximos, enriquece com nomes e abre modal ao clicar em Analisar ou Ver', async () => {
    obterProcesso
      .mockResolvedValueOnce({
        ...mockProcesses[0],
        descricao: 'Descrição completa do caso crítico',
      })
      .mockResolvedValueOnce({
        processo_id: 202,
        cnj: '0099012-34.2026.8.26.0602',
        titulo: 'Recurso de Apelação',
        descricao: 'Descrição detalhada do recurso',
        status: 'Ativo',
        tribunal: 'TJSP',
        area: 'Civil',
        data_prazo: `${daysFromNowIso(2)}T18:00:00`,
        cliente_id: 1,
        funcionario_id: 2,
      });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
      expect(
        screen.getByText('Recurso de Apelação - Empresa Alpha Ltda')
      ).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toHaveTextContent(
        'Descrição detalhada do recurso'
      );
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

  it('exibe os cards de resumo de processos (com Concluídos e Atrasados), prazos próximos, resumo de atividades e atividade recente', async () => {
    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByText('Processos Ativos')).toBeInTheDocument();
      expect(screen.getByText('Atividades Pendentes')).toBeInTheDocument();
      expect(screen.getByText('Prazos Urgentes')).toBeInTheDocument();
      expect(screen.getByText('Resumo de Processos')).toBeInTheDocument();
      expect(screen.getByText('Prazos Próximos')).toBeInTheDocument();
      expect(screen.getByText('Resumo de Atividades')).toBeInTheDocument();
      expect(screen.getByText('Redigir petição inicial')).toBeInTheDocument();
    });

    expect(screen.getByText('Em andamento').previousSibling).toHaveTextContent(
      '4'
    );
    expect(screen.getByText('Em análise').previousSibling).toHaveTextContent(
      '2'
    );
    expect(screen.getByText('Concluídos').previousSibling).toHaveTextContent(
      '1'
    );
    expect(
      screen.getByText('Próximos do prazo').previousSibling
    ).toHaveTextContent('2');
    expect(screen.getByText('Atrasados').previousSibling).toHaveTextContent(
      '3'
    );

    expect(screen.getByText('Vence em: 2 dia(s)')).toBeInTheDocument();
    expect(screen.getByText('Atividades do escritório')).toBeInTheDocument();
    expect(screen.getByText('Em execução').previousSibling).toHaveTextContent(
      '7'
    );
    expect(screen.getByText('Atrasadas').previousSibling).toHaveTextContent(
      '2'
    );
    expect(screen.getByText('Ana Paula', { exact: false })).toBeInTheDocument();
  });

  it('mantém as atividades visíveis quando o usuário não pode visualizar processos', async () => {
    getCurrentUser.mockReturnValue({
      cargo: { permissao: { visualizar_processos: false } },
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByText('Resumo de Atividades')).toBeInTheDocument();
      expect(screen.getByText('Redigir petição inicial')).toBeInTheDocument();
    });
    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
  });

  it('permite recarregar os resumos, prazos próximos e atividades recentes após uma falha', async () => {
    obterResumoProcessos
      .mockRejectedValueOnce(new Error('Falha no resumo de processos'))
      .mockResolvedValueOnce(mockProcessSummary);
    listarProcessos
      .mockRejectedValueOnce(new Error('Falha nos prazos próximos'))
      .mockResolvedValueOnce(mockUpcomingPage());
    obterResumoAtividades
      .mockRejectedValueOnce(new Error('Falha no resumo'))
      .mockResolvedValueOnce(mockSummary);
    obterKanbanAtividades
      .mockRejectedValueOnce(new Error('Falha no kanban'))
      .mockResolvedValueOnce(mockKanban);

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByText('Falha no resumo de processos')
      ).toBeInTheDocument();
      expect(screen.getByText('Falha nos prazos próximos')).toBeInTheDocument();
      expect(screen.getByText('Falha no resumo')).toBeInTheDocument();
      expect(screen.getByText('Falha no kanban')).toBeInTheDocument();
    });

    const retryButtons = screen.getAllByRole('button', {
      name: 'Tentar novamente',
    });
    retryButtons.forEach((button) => fireEvent.click(button));

    await waitFor(() => {
      expect(
        screen.queryByText('Falha no resumo de processos')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Falha nos prazos próximos')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Falha no resumo')).not.toBeInTheDocument();
      expect(screen.queryByText('Falha no kanban')).not.toBeInTheDocument();
      expect(screen.getByText('Redigir petição inicial')).toBeInTheDocument();
    });
  });
});
