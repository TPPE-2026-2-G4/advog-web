import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActivityStageSummary from './ActivityStageSummary';

const stages = [
  { etapa_id: 1, nome: 'Backlog', quantidade: 3 },
  { etapa_id: 2, nome: 'Em Execução', quantidade: 5 },
  { etapa_id: 3, nome: 'Revisão', quantidade: 2 },
  { etapa_id: 4, nome: 'Finalizado', quantidade: 4 },
];

describe('ActivityStageSummary', () => {
  it('renderiza o total e uma contagem por etapa', () => {
    render(<ActivityStageSummary total={14} stages={stages} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Total').nextSibling).toHaveTextContent('14');
    expect(screen.getByText('Backlog').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Em Execução').nextSibling).toHaveTextContent('5');
    expect(screen.getByText('Revisão').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Finalizado').nextSibling).toHaveTextContent('4');
  });

  it('exibe apenas o total quando não há etapas', () => {
    render(<ActivityStageSummary />);

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Total').nextSibling).toHaveTextContent('0');
  });

  it('exibe um traço nas contagens enquanto carrega', () => {
    render(<ActivityStageSummary total={14} stages={stages} isLoading />);

    expect(screen.getAllByText('—')).toHaveLength(5);
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
  });

  it('exibe o erro e permite tentar novamente', () => {
    const onRetry = vi.fn();
    render(<ActivityStageSummary error="Falha na API" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falha na API');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('não exibe o botão de nova tentativa sem callback', () => {
    render(<ActivityStageSummary error="Falha na API" />);

    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
  });
});
