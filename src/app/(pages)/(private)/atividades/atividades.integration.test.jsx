import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AtividadesClient from './atividadesClient';
import { obterKanbanAtividades } from '@/services/atividades';

vi.mock('@/services/atividades', () => ({
  obterKanbanAtividades: vi.fn(),
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
});
