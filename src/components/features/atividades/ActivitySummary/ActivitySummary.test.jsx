import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActivitySummary from './ActivitySummary';

const summary = {
  escopo: 'escritorio',
  pendentes: 3,
  em_execucao: 7,
  concluidas: 4,
  atrasadas: 2,
};

describe('ActivitySummary', () => {
  it('renderiza o título, o escopo e os quatro totais', () => {
    render(<ActivitySummary summary={summary} />);

    expect(
      screen.getByRole('heading', { name: 'Resumo de Atividades' })
    ).toBeInTheDocument();
    expect(screen.getByText('Atividades do escritório')).toBeInTheDocument();
    expect(screen.getByText('Pendentes').previousSibling).toHaveTextContent(
      '3'
    );
    expect(screen.getByText('Em execução').previousSibling).toHaveTextContent(
      '7'
    );
    expect(screen.getByText('Concluídas').previousSibling).toHaveTextContent(
      '4'
    );
    expect(screen.getByText('Atrasadas').previousSibling).toHaveTextContent(
      '2'
    );
  });

  it('descreve o escopo do usuário', () => {
    render(<ActivitySummary summary={{ ...summary, escopo: 'usuario' }} />);

    expect(screen.getByText('Minhas atividades')).toBeInTheDocument();
  });

  it('exibe um traço nos totais enquanto carrega', () => {
    render(<ActivitySummary summary={summary} isLoading />);

    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });

  it('exibe zero quando não há resumo', () => {
    render(<ActivitySummary />);

    expect(screen.getByText('Pendentes').previousSibling).toHaveTextContent(
      '0'
    );
    expect(screen.queryByText('Minhas atividades')).not.toBeInTheDocument();
  });

  it('exibe o erro e permite tentar novamente', () => {
    const onRetry = vi.fn();
    render(
      <ActivitySummary
        summary={summary}
        error="Falha na API"
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Falha na API');
    expect(screen.queryByText('Pendentes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('não exibe o botão de nova tentativa sem callback', () => {
    render(<ActivitySummary error="Falha na API" />);

    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
  });
});
