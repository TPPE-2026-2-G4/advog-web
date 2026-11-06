import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivitySummary from '@/components/features/atividades/ActivitySummary/ActivitySummary';
import CriticalProcessesCard from '@/components/features/processos/CriticalProcessesCard/CriticalProcessesCard';
import RecentActivities from '@/components/features/atividades/RecentActivities/RecentActivities';
import DashboardClient from './dashboardClient';
import { obterKanbanAtividades } from '@/services/atividades';
import { obterResumoAtividades } from '@/services/dashboard';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import {
  listarDocumentos,
  listarProcessosCriticos,
  obterProcesso,
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
  listarProcessosCriticos: vi.fn(),
  obterProcesso: vi.fn(),
  listarDocumentos: vi.fn(),
  obterUrlDocumento: vi.fn(),
  uploadDocumento: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

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
  });

  it('lista processos críticos, enriquece nomes e abre detalhes para análise', async () => {
    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
      expect(screen.getAllByText('Empresa Alpha Ltda')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Analisar' })[0]);

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

  describe('painel de atividades', () => {
    const activity = (id, titulo, prazo, responsaveis = []) => ({
      atividade_id: id,
      titulo,
      data_prazo: prazo,
      processo_id: null,
      responsaveis,
    });

    const kanbanWithAllStages = {
      escopo: 'usuario',
      etapas: [
        {
          etapa_id: 1,
          nome: 'Backlog',
          ordem: 1,
          atividades: [activity(1, 'Tarefa no backlog', '2999-01-01T00:00:00')],
        },
        {
          etapa_id: 2,
          nome: 'Em Execução',
          ordem: 2,
          atividades: [
            activity(2, 'Tarefa em execução', '2999-01-01T00:00:00', [
              { funcionario_id: 1, nome: 'Ana' },
              { funcionario_id: 2, nome: 'Pedro' },
            ]),
            activity(5, 'Tarefa vencida', '2020-01-01T00:00:00'),
          ],
        },
        {
          etapa_id: 4,
          nome: 'Finalizado',
          ordem: 4,
          atividades: [activity(3, 'Tarefa concluída', '2020-01-01T00:00:00')],
        },
      ],
    };

    it('exibe a atividade recente com o ícone e o destaque de cada situação', async () => {
      obterKanbanAtividades.mockResolvedValue(kanbanWithAllStages);

      render(<DashboardClient />);

      await waitFor(() =>
        expect(screen.getByText('Tarefa vencida')).toBeInTheDocument()
      );

      expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
      expect(screen.getByText('Atrasada · Prazo: 01/01/2020')).toBeVisible();
      expect(screen.getByText('Em Execução · Ana, Pedro')).toBeVisible();
      expect(screen.getByText('Finalizado · Sem responsável')).toBeVisible();
      expect(screen.getByText('Backlog · Sem responsável')).toBeVisible();
      expect(screen.getByText('Prazo: 01/01/2020')).toBeVisible();
    });

    it('exibe mensagem quando não há atividades registradas', async () => {
      obterKanbanAtividades.mockResolvedValue({
        escopo: 'usuario',
        etapas: [],
      });

      render(<DashboardClient />);

      expect(
        await screen.findByText('Nenhuma atividade registrada.')
      ).toBeInTheDocument();
    });

    it('exibe traços e mensagem de carregamento enquanto as atividades carregam', () => {
      obterResumoAtividades.mockReturnValue(new Promise(() => {}));
      obterKanbanAtividades.mockReturnValue(new Promise(() => {}));

      render(<DashboardClient />);

      expect(screen.getByText('Carregando atividades...')).toBeInTheDocument();
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
    });

    it('usa mensagens padrão quando as falhas não são instâncias de Error', async () => {
      obterResumoAtividades.mockRejectedValue('falha');
      obterKanbanAtividades.mockRejectedValue('falha');

      render(<DashboardClient />);

      expect(
        await screen.findByText(
          'Não foi possível carregar o resumo de atividades.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('Não foi possível carregar as atividades.')
      ).toBeInTheDocument();
    });

    it('recarrega o resumo e as atividades ao tentar novamente após uma falha', async () => {
      obterResumoAtividades
        .mockRejectedValueOnce(new Error('Falha no resumo'))
        .mockResolvedValueOnce(mockSummary);
      obterKanbanAtividades
        .mockRejectedValueOnce(new Error('Falha no kanban'))
        .mockResolvedValueOnce(kanbanWithAllStages);

      render(<DashboardClient />);

      await screen.findByText('Falha no resumo');
      await screen.findByText('Falha no kanban');

      screen
        .getAllByRole('button', { name: 'Tentar novamente' })
        .forEach((button) => fireEvent.click(button));

      expect(await screen.findByText('Tarefa vencida')).toBeInTheDocument();
      expect(screen.queryByText('Falha no resumo')).not.toBeInTheDocument();
    });

    it('ignora respostas que chegam depois de o painel ser desmontado', async () => {
      let resolveSummary;
      let rejectKanban;
      obterResumoAtividades.mockReturnValue(
        new Promise((resolve) => {
          resolveSummary = resolve;
        })
      );
      obterKanbanAtividades.mockReturnValue(
        new Promise((_, reject) => {
          rejectKanban = reject;
        })
      );

      const { unmount } = render(<DashboardClient />);
      unmount();
      resolveSummary(mockSummary);
      rejectKanban(new Error('tarde demais'));

      await Promise.resolve();
      expect(screen.queryByText('tarde demais')).not.toBeInTheDocument();
    });

    it('ignora falha do resumo e respostas do kanban que chegam depois da desmontagem', async () => {
      let rejectSummary;
      let resolveKanban;
      obterResumoAtividades.mockReturnValue(
        new Promise((_, reject) => {
          rejectSummary = reject;
        })
      );
      obterKanbanAtividades.mockReturnValue(
        new Promise((resolve) => {
          resolveKanban = resolve;
        })
      );

      const { unmount } = render(<DashboardClient />);
      unmount();
      rejectSummary(new Error('tarde demais'));
      resolveKanban(kanbanWithAllStages);

      await Promise.resolve();
      expect(screen.queryByText('Tarefa vencida')).not.toBeInTheDocument();
    });

    it('mantém o painel de atividades quando não há usuário autenticado', async () => {
      getCurrentUser.mockReturnValue(undefined);

      render(<DashboardClient />);

      expect(screen.getByText('Acesso negado')).toBeInTheDocument();
      expect(await screen.findByText('Em execução')).toBeInTheDocument();
    });
  });

  describe('referências de clientes e responsáveis', () => {
    it('usa o campo id quando os registros não trazem identificador específico', async () => {
      listarClientes.mockResolvedValue([
        { id: 1, nome: 'Cliente Alternativo' },
      ]);
      listarFuncionarios.mockResolvedValue([
        { id: 2, nome: 'Responsável Alternativo' },
      ]);

      render(<DashboardClient />);

      expect(
        (await screen.findAllByText('Cliente Alternativo')).length
      ).toBeGreaterThan(0);
    });

    it('informa a mensagem de erro recebida ao falhar o carregamento das referências', async () => {
      listarFuncionarios.mockRejectedValueOnce(new Error('Falha ao listar'));

      render(<DashboardClient />);

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Falha ao listar')
      );
    });
  });

  describe('componentes de atividades isolados', () => {
    it('exibe o resumo sem dados e o erro sem botão de nova tentativa', () => {
      const { rerender } = render(<ActivitySummary />);

      expect(screen.getAllByText('0')).toHaveLength(4);

      rerender(<ActivitySummary error="Falha" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Falha');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('exibe o erro das atividades recentes sem botão de nova tentativa', () => {
      render(<RecentActivities error="Falha" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Falha');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('processos críticos', () => {
    const daysAgo = (days) =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    const critical = (overrides) => ({
      ...process,
      data_realizado: null,
      data_inicio: null,
      ...overrides,
    });

    it('descreve a última movimentação em cada situação e alterna a lista', async () => {
      listarProcessosCriticos.mockResolvedValue([
        critical({
          processo_id: 1,
          cnj: '0000001-00.2026.8.26.0001',
          titulo: 'Movido ontem',
          data_realizado: daysAgo(1),
        }),
        critical({
          processo_id: 2,
          cnj: '0000002-00.2026.8.26.0002',
          titulo: 'Movido há dias',
          data_realizado: daysAgo(20),
        }),
        critical({
          processo_id: 3,
          cnj: '0000003-00.2026.8.26.0003',
          titulo: 'Só com início',
          data_inicio: '2026-01-10',
        }),
        critical({
          processo_id: 4,
          cnj: '0000004-00.2026.8.26.0004',
          titulo: 'Sem nenhuma data',
        }),
        critical({
          processo_id: 5,
          cnj: '0000005-00.2026.8.26.0005',
          titulo: 'Data ilegível',
          data_realizado: 'ilegível',
        }),
        critical({
          processo_id: undefined,
          id: 6,
          cnj: '0000006-00.2026.8.26.0006',
          titulo: 'Identificado por id',
          cliente_id: null,
        }),
        critical({
          processo_id: undefined,
          cnj: '0000007-00.2026.8.26.0007',
          titulo: 'Identificado pelo CNJ',
          cliente_id: null,
        }),
      ]);

      render(<DashboardClient />);

      await screen.findAllByText('Movido ontem');
      expect(screen.getAllByText('Há 1 dia').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Há 20 dias').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Desde o início: 10\/01\/2026/).length).toBe(
        2
      );
      expect(screen.getAllByText('Sem movimentação').length).toBeGreaterThan(0);

      const toggle = screen.getByRole('button', { name: /Ver lista/ });
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: /Ocultar/ })).toBeVisible();
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('exibe o estado de carregamento enquanto os críticos são buscados', () => {
      listarProcessosCriticos.mockReturnValue(new Promise(() => {}));

      render(<DashboardClient />);

      expect(
        screen.getByLabelText('Carregando processos críticos')
      ).toHaveAttribute('aria-busy', 'true');
    });

    it('usa mensagem padrão quando a falha dos críticos não é um Error', async () => {
      listarProcessosCriticos.mockRejectedValue('falha');

      render(<DashboardClient />);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível carregar os processos críticos.'
      );
    });

    it('ignora a resposta dos críticos que chega após a desmontagem', async () => {
      let finish;
      listarProcessosCriticos.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        })
      );

      const { unmount } = render(<DashboardClient />);
      unmount();
      finish([process]);

      await Promise.resolve();
      expect(screen.queryByText('Ação de Cobrança Teste')).toBeNull();
    });

    it('ignora a falha dos críticos que chega após a desmontagem', async () => {
      let fail;
      listarProcessosCriticos.mockReturnValue(
        new Promise((_, reject) => {
          fail = reject;
        })
      );

      const { unmount } = render(<DashboardClient />);
      unmount();
      fail(new Error('tarde demais'));

      await Promise.resolve();
      expect(screen.queryByText('tarde demais')).toBeNull();
    });

    it('atualiza a lista em segundo plano ao voltar o foco e ignora quando a aba está oculta', async () => {
      render(<DashboardClient />);
      await screen.findAllByText('Ação de Cobrança Teste');
      expect(listarProcessosCriticos).toHaveBeenCalledTimes(1);

      const visibility = vi.spyOn(document, 'visibilityState', 'get');

      visibility.mockReturnValue('hidden');
      window.dispatchEvent(new Event('focus'));
      expect(listarProcessosCriticos).toHaveBeenCalledTimes(1);

      let finishReload;
      listarProcessosCriticos.mockReturnValueOnce(
        new Promise((resolve) => {
          finishReload = () => resolve([process]);
        })
      );
      visibility.mockReturnValue('visible');
      window.dispatchEvent(new Event('focus'));

      expect(
        await screen.findByText('Atualizando em segundo plano')
      ).toBeInTheDocument();
      finishReload();
      await waitFor(() =>
        expect(
          screen.queryByText('Atualizando em segundo plano')
        ).not.toBeInTheDocument()
      );
      expect(listarProcessosCriticos).toHaveBeenCalledTimes(2);

      visibility.mockRestore();
    });

    it('informa quando o processo detalhado não é encontrado e permite tentar novamente', async () => {
      obterProcesso.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...process,
        descricao: 'Descrição recarregada',
      });

      render(<DashboardClient />);
      await screen.findAllByText('Ação de Cobrança Teste');

      fireEvent.click(screen.getAllByRole('button', { name: 'Analisar' })[0]);

      const dialog = await screen.findByRole('dialog');
      expect(
        await within(dialog).findByText(/Processo não encontrado ou removido\./)
      ).toBeInTheDocument();

      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Tentar novamente' })
      );

      expect(
        await within(dialog).findByText('Descrição recarregada')
      ).toBeInTheDocument();
    });

    it('usa mensagem padrão quando o detalhe falha sem Error e informa o erro recebido', async () => {
      obterProcesso
        .mockRejectedValueOnce('falha')
        .mockRejectedValueOnce(new Error('Falha ao detalhar'));

      render(<DashboardClient />);
      await screen.findAllByText('Ação de Cobrança Teste');

      fireEvent.click(screen.getAllByRole('button', { name: 'Analisar' })[0]);
      const dialog = await screen.findByRole('dialog');
      expect(
        await within(dialog).findByText(
          /Não foi possível carregar os detalhes do processo\./
        )
      ).toBeInTheDocument();

      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Tentar novamente' })
      );
      expect(
        await within(dialog).findByText(/Falha ao detalhar/)
      ).toBeInTheDocument();
    });

    it('exibe "Sem cliente" e ignora a análise quando o cartão é usado sem enriquecimento', () => {
      render(
        <CriticalProcessesCard
          processes={[
            { processo_id: 9, cnj: '0000009', titulo: 'Sem cliente nomeado' },
          ]}
        />
      );

      expect(screen.getAllByText('Sem cliente')).toHaveLength(2);
      fireEvent.click(screen.getAllByRole('button', { name: /Analisar/ })[0]);
      fireEvent.click(screen.getAllByRole('button', { name: /Analisar/ })[1]);
    });

    it('exibe o erro dos críticos sem botão de nova tentativa quando não há callback', () => {
      render(<CriticalProcessesCard error="Falha" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Falha');
      expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBe(
        null
      );
    });
  });
});
