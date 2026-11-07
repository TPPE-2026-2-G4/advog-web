import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardClient from './dashboardClient';
import ProcessSummary from '@/components/features/processos/ProcessSummary/ProcessSummary';
import UpcomingDeadlines from '@/components/features/processos/UpcomingDeadlines/UpcomingDeadlines';
import { usePrazosProximos } from '@/hooks/usePrazosProximos';
import { useResumoProcessos } from '@/hooks/useResumoProcessos';
import { obterKanbanAtividades } from '@/services/atividades';
import { obterResumoAtividades } from '@/services/dashboard';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import {
  listarDocumentos,
  listarProcessos,
  listarProcessosCriticos,
  obterProcesso,
  obterResumoProcessos,
  obterUrlDocumento,
  uploadDocumento,
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
  listarDocumentos: vi.fn(),
  obterUrlDocumento: vi.fn(),
  uploadDocumento: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

const daysFromNowIso = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const process = {
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
};

const mockUpcomingPage = () => ({
  itens: [
    {
      processo_id: 301,
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
    {
      processo_id: 302,
      cnj: '0078901-23.2026.8.07.0001',
      titulo: 'Mandado de Segurança - Empresa Alpha Ltda',
      descricao: '',
      status: 'Em Análise',
      tribunal: 'TJDFT',
      area: 'Tributário',
      data_prazo: `${daysFromNowIso(4)}T18:00:00`,
      cliente_id: 1,
      funcionario_id: 2,
    },
    {
      processo_id: 303,
      cnj: '0045678-90.2026.8.19.0001',
      titulo: 'Ação Trabalhista',
      descricao: null,
      status: 'Ativo',
      tribunal: '',
      area: '',
      data_prazo: `${daysFromNowIso(0)}T18:00:00`,
      cliente_id: null,
      funcionario_id: null,
    },
    {
      processo_id: 304,
      cnj: '0034567-89.2026.5.10.0012',
      titulo: 'Rescisão Trabalhista',
      descricao: 'Contestação',
      status: 'Ativo',
      tribunal: 'TRT10',
      area: 'Trabalhista',
      data_prazo: `${daysFromNowIso(10)}T18:00:00`,
      cliente_id: 1,
      funcionario_id: 2,
    },
    {
      processo_id: 305,
      cnj: '0011111-11.2026.8.26.0001',
      titulo: 'Processo Concluído Ignorado',
      status: 'Concluído',
      data_prazo: `${daysFromNowIso(1)}T18:00:00`,
      cliente_id: 1,
      funcionario_id: 2,
    },
  ],
  total: 5,
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

describe('DashboardClient integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: { visualizar_processos: true },
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
    listarProcessosCriticos.mockResolvedValue([process]);
    obterProcesso.mockResolvedValue({
      ...process,
      descricao: 'Descrição completa do caso crítico',
    });
    listarDocumentos.mockResolvedValue([]);
    obterUrlDocumento.mockResolvedValue({ url: '' });
    uploadDocumento.mockResolvedValue({});
  });

  it('bloqueia acesso sem permissão', () => {
    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: { visualizar_processos: false },
      },
    });

    render(<DashboardClient />);

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(listarProcessosCriticos).not.toHaveBeenCalled();
    expect(listarProcessos).not.toHaveBeenCalled();
    expect(obterResumoProcessos).not.toHaveBeenCalled();
  });

  it('lista processos críticos, prazos próximos ordenados e resumo com atrasados != 0, abrindo modal de detalhes', async () => {
    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
      expect(
        screen.getByText('Recurso de Apelação - Empresa Alpha Ltda')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Concluídos').previousSibling).toHaveTextContent(
      '1'
    );
    expect(screen.getByText('Atrasados').previousSibling).toHaveTextContent(
      '3'
    );

    expect(screen.getByText('Vence hoje')).toBeInTheDocument();
    expect(screen.getByText('Vence em: 2 dia(s)')).toBeInTheDocument();
    expect(screen.getByText('Vence em: 4 dia(s)')).toBeInTheDocument();
    expect(screen.getByText('Vence em: 10 dia(s)')).toBeInTheDocument();
    expect(screen.getByText('Tributário · TJDFT')).toBeInTheDocument();
    expect(
      screen.queryByText('Processo Concluído Ignorado')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText('Descrição completa do caso crítico')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Analisar' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('mostra fallback de erro ao carregar referências com erro não-Error', async () => {
    listarClientes.mockRejectedValueOnce('falha inesperada');

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Não foi possível carregar clientes e responsáveis.'
      );
    });
  });

  it('permite tentar novamente quando a listagem de críticos falha', async () => {
    listarProcessosCriticos
      .mockRejectedValueOnce(new Error('Falha ao listar críticos'))
      .mockResolvedValueOnce([]);

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Falha ao listar críticos'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Nenhum processo sem movimentação há 15 dias ou mais\./i
        )
      ).toBeInTheDocument();
    });
  });

  it('trata erros no Resumo de Processos (Error e não-Error), permite tentar novamente e exercita opções do hook', async () => {
    obterResumoProcessos
      .mockRejectedValueOnce(new Error('Falha no resumo de processos'))
      .mockRejectedValueOnce('erro desconhecido no resumo')
      .mockResolvedValueOnce({});

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByText('Falha no resumo de processos')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar o resumo de processos.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(
        screen.queryByText('Não foi possível carregar o resumo de processos.')
      ).not.toBeInTheDocument();
    });

    render(<ProcessSummary summary={null} />);
    render(<ProcessSummary summary={null} error="Erro sem retry" />);

    const { unmount } = renderHook(() => useResumoProcessos());
    unmount();
  });

  it('trata erros, carregamento e lista vazia em Prazos Próximos e exercita opções do hook', async () => {
    listarProcessos
      .mockRejectedValueOnce(new Error('Falha ao listar prazos próximos'))
      .mockRejectedValueOnce('erro desconhecido nos prazos')
      .mockResolvedValueOnce([]);

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByText('Falha ao listar prazos próximos')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar os prazos próximos.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum prazo próximo nos próximos 15 dias.')
      ).toBeInTheDocument();
    });

    render(<UpcomingDeadlines error="Erro sem retry" />);
    render(
      <UpcomingDeadlines
        processes={[
          {
            id: 99,
            titulo: '',
            data_prazo: 'invalida',
          },
        ]}
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver' }).at(-1));

    const disabledHook = renderHook(() => usePrazosProximos(false));
    expect(disabledHook.result.current.isLoading).toBe(false);
    disabledHook.unmount();

    const activeHook = renderHook(() => usePrazosProximos());
    activeHook.unmount();
  });
});
