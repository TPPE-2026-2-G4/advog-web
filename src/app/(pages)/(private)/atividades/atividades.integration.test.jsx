import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AtividadesClient from './atividadesClient';
import { obterKanbanAtividades } from '@/services/atividades';
import { obterResumoAtividades } from '@/services/dashboard';
import { useKanbanAtividades } from '@/hooks/useKanbanAtividades';
import { useResumoAtividades } from '@/hooks/useResumoAtividades';

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
}));

vi.mock('@/services/dashboard', () => ({
  obterResumoAtividades: vi.fn(),
}));

const atividade = (id) => ({
  atividade_id: id,
  titulo: `Atividade ${id}`,
  data_prazo: '2026-12-01T18:00:00',
  processo_id: null,
  responsaveis: [],
});

const kanban = {
  escopo: 'escritorio',
  etapas: [
    { etapa_id: 4, nome: 'Finalizado', ordem: 4, atividades: [atividade(7)] },
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [atividade(1), atividade(2), atividade(3)],
    },
    {
      etapa_id: 3,
      nome: 'Revisão',
      ordem: 3,
      atividades: [atividade(5), atividade(6)],
    },
    {
      etapa_id: 2,
      nome: 'Em Execução',
      ordem: 2,
      atividades: [atividade(4)],
    },
  ],
};

describe('AtividadesClient integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterKanbanAtividades.mockResolvedValue(kanban);
  });

  it('exibe o total e a contagem de cada etapa na ordem do quadro', async () => {
    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );

    const labels = screen
      .getAllByRole('listitem')
      .map((item) => item.firstChild.textContent);
    expect(labels).toEqual([
      'Total',
      'Backlog',
      'Em Execução',
      'Revisão',
      'Finalizado',
    ]);
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('1');
  });

  it('mostra traços enquanto os dados carregam', () => {
    obterKanbanAtividades.mockReturnValue(new Promise(() => {}));

    render(<AtividadesClient />);

    expect(screen.getByText('Total').nextSibling).toHaveTextContent('—');
  });

  it('permite tentar novamente quando o carregamento falha', async () => {
    obterKanbanAtividades
      .mockRejectedValueOnce(new Error('Falha ao carregar o quadro'))
      .mockResolvedValueOnce(kanban);

    render(<AtividadesClient />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Falha ao carregar o quadro'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() =>
      expect(screen.getByText('Total').nextSibling).toHaveTextContent('7')
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('usa mensagem padrão quando a falha não é uma instância de Error', async () => {
    obterKanbanAtividades.mockRejectedValue('falha');

    render(<AtividadesClient />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as atividades.'
    );
  });

  it('exibe o quadro do usuário quando a API não devolve o escopo do escritório', async () => {
    obterKanbanAtividades.mockResolvedValue({
      escopo: 'usuario',
      etapas: [{ etapa_id: 1, nome: 'Backlog', ordem: 1 }],
    });
    const { result } = renderHook(() => useKanbanAtividades());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scope).toBe('usuario');
  });

  it('ignora respostas do quadro que chegam depois da desmontagem', async () => {
    let resolveKanban;
    let rejectKanban;
    obterKanbanAtividades
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveKanban = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectKanban = reject;
        })
      );

    const first = render(<AtividadesClient />);
    first.unmount();
    resolveKanban(kanban);

    const second = render(<AtividadesClient />);
    second.unmount();
    rejectKanban(new Error('tarde demais'));

    await Promise.resolve();
    expect(screen.queryByText('tarde demais')).not.toBeInTheDocument();
  });

  describe('hooks de atividades desabilitados', () => {
    it('não consultam a API quando desabilitados', () => {
      const kanbanHook = renderHook(() => useKanbanAtividades(false));
      const summaryHook = renderHook(() => useResumoAtividades(false));

      expect(kanbanHook.result.current.isLoading).toBe(false);
      expect(summaryHook.result.current.isLoading).toBe(false);
      expect(obterKanbanAtividades).not.toHaveBeenCalled();
      expect(obterResumoAtividades).not.toHaveBeenCalled();
    });
  });

  describe('resumo de atividades', () => {
    it('recarrega o resumo, trata falhas e ignora respostas tardias', async () => {
      obterResumoAtividades
        .mockRejectedValueOnce('falha')
        .mockResolvedValueOnce({ escopo: 'escritorio', pendentes: 2 });
      const { result, rerender } = renderHook(() => useResumoAtividades());

      await waitFor(() =>
        expect(result.current.error).toBe(
          'Não foi possível carregar o resumo de atividades.'
        )
      );

      result.current.reload();
      rerender();
      await waitFor(() => expect(result.current.summary.pendentes).toBe(2));
      expect(result.current.error).toBe('');
    });

    it('usa a mensagem do erro recebido e ignora respostas após a desmontagem', async () => {
      obterResumoAtividades.mockRejectedValueOnce(new Error('Falha na API'));
      const failed = renderHook(() => useResumoAtividades());
      await waitFor(() =>
        expect(failed.result.current.error).toBe('Falha na API')
      );

      let resolveSummary;
      let rejectSummary;
      obterResumoAtividades
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveSummary = resolve;
          })
        )
        .mockReturnValueOnce(
          new Promise((_, reject) => {
            rejectSummary = reject;
          })
        );
      renderHook(() => useResumoAtividades()).unmount();
      resolveSummary({ pendentes: 9 });
      renderHook(() => useResumoAtividades()).unmount();
      rejectSummary(new Error('tarde demais'));

      await Promise.resolve();
      expect(failed.result.current.summary.pendentes).toBe(0);
    });
  });
});
