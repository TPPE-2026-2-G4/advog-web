import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessSummary from './ProcessSummary';

const summary = {
  total: 7,
  em_andamento: 4,
  em_analise: 2,
  finalizados: 1,
  proximos_do_prazo: 2,
  atrasados: 1,
};

describe('ProcessSummary', () => {
  it('renderiza o título e os quatro totais do resumo de processos', () => {
    render(<ProcessSummary summary={summary} />);

    expect(
      screen.getByRole('heading', { name: 'Resumo de Processos' })
    ).toBeInTheDocument();
    expect(screen.getByText('Em andamento').previousSibling).toHaveTextContent(
      '4'
    );
    expect(screen.getByText('Em análise').previousSibling).toHaveTextContent(
      '2'
    );
    expect(screen.getByText('Finalizados').previousSibling).toHaveTextContent(
      '1'
    );
    expect(
      screen.getByText('Próximos do prazo').previousSibling
    ).toHaveTextContent('2');
  });

  it('exibe um traço nos totais enquanto carrega', () => {
    render(<ProcessSummary summary={summary} isLoading />);

    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });

  it('exibe zero quando não há resumo', () => {
    render(<ProcessSummary />);

    expect(screen.getByText('Em andamento').previousSibling).toHaveTextContent(
      '0'
    );
    expect(screen.getByText('Em análise').previousSibling).toHaveTextContent(
      '0'
    );
    expect(screen.getByText('Finalizados').previousSibling).toHaveTextContent(
      '0'
    );
    expect(
      screen.getByText('Próximos do prazo').previousSibling
    ).toHaveTextContent('0');
  });

  it('exibe o erro e permite tentar novamente', () => {
    const onRetry = vi.fn();
    render(
      <ProcessSummary
        summary={summary}
        error="Falha ao carregar resumo"
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao carregar resumo'
    );
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('não exibe o botão de nova tentativa sem callback', () => {
    render(<ProcessSummary error="Falha ao carregar resumo" />);

    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
  });
});
