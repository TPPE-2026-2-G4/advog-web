import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CriticalProcessesCard from './CriticalProcessesCard';

const mockProcesses = [
  {
    processo_id: 1,
    cnj: '0061234-56.2026.8.26.0100',
    titulo: 'Processo Trabalhista João',
    cliente: 'João Santos',
    data_realizado: '2026-10-01',
    data_inicio: '2026-08-01',
  },
  {
    processo_id: 2,
    cnj: '0087890-12.2026.8.26.0577',
    titulo: 'Revisão Contratual Maria',
    cliente: 'Maria Oliveira',
    data_realizado: null,
    data_inicio: '2026-07-15',
  },
];

describe('CriticalProcessesCard', () => {
  it('renderiza título, contador e lista de processos na tabela', () => {
    const handleAnalyze = vi.fn();
    render(
      <CriticalProcessesCard
        processes={mockProcesses}
        onAnalyze={handleAnalyze}
      />
    );

    expect(
      screen.getByText('Processos Críticos (Sem movimentação)')
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(
      screen.getAllByText('0061234-56.2026.8.26.0100')[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Processo Trabalhista João')[0]
    ).toBeInTheDocument();
    expect(screen.getAllByText('João Santos')[0]).toBeInTheDocument();

    expect(
      screen.getAllByText('0087890-12.2026.8.26.0577')[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Revisão Contratual Maria')[0]
    ).toBeInTheDocument();
    expect(screen.getAllByText('Maria Oliveira')[0]).toBeInTheDocument();

    const analyzeButtons = screen.getAllByRole('button', { name: 'Analisar' });
    expect(analyzeButtons).toHaveLength(2);

    fireEvent.click(analyzeButtons[0]);
    expect(handleAnalyze).toHaveBeenCalledWith(mockProcesses[0]);
  });

  it('exibe data formatada para data_realizado e fallback para data_inicio', () => {
    render(<CriticalProcessesCard processes={mockProcesses} />);

    expect(screen.getAllByText('01/10/2026')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Sem movimentação')[0]).toBeInTheDocument();
    expect(
      screen.getAllByText('Desde o início: 15/07/2026')[0]
    ).toBeInTheDocument();
  });

  it('renderiza estado de carregamento com aria-busy', () => {
    render(<CriticalProcessesCard isLoading={true} processes={[]} />);

    const loadingRegion = screen.getByLabelText(
      'Carregando processos críticos'
    );
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
  });

  it('renderiza estado vazio quando não há processos críticos', () => {
    render(
      <CriticalProcessesCard
        processes={[]}
        isLoading={false}
        thresholdDays={15}
      />
    );

    expect(
      screen.getByText('Nenhum processo sem movimentação há 15 dias ou mais.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Todos os seus processos em andamento estão com movimentações recentes.'
      )
    ).toBeInTheDocument();
  });

  it('renderiza mensagem de erro e botão de retentativa', () => {
    const handleRetry = vi.fn();
    render(
      <CriticalProcessesCard
        error="Falha na conexão com o servidor"
        onRetry={handleRetry}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Falha na conexão com o servidor');

    const retryButton = screen.getByRole('button', {
      name: 'Tentar novamente',
    });
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalled();
  });

  it('exibe indicador de atualização em segundo plano quando isReloading é true', () => {
    render(
      <CriticalProcessesCard processes={mockProcesses} isReloading={true} />
    );

    expect(
      screen.getByText('Atualizando em segundo plano')
    ).toBeInTheDocument();
  });

  it('alterna o accordion mobile ao clicar no botão de expansão', () => {
    render(<CriticalProcessesCard processes={mockProcesses} />);

    const toggle = screen.getByRole('button', { name: /ver lista/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ocultar')).toBeInTheDocument();

    const mobileButtons = screen.getAllByRole('button', {
      name: 'Analisar Processo',
    });
    expect(mobileButtons).toHaveLength(2);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('cobre ramificações de dias no singular, dados ausentes e cliques sem callbacks', () => {
    const handleAnalyze = vi.fn();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const proc1Day = {
      processo_id: 99,
      cnj: '0011111-11.2026.8.26.0100',
      titulo: 'Processo 1 Dia',
      cliente: '',
      data_realizado: yesterday,
      data_inicio: null,
    };
    const procNoDates = {
      id: 'custom-id',
      cnj: '0022222-22.2026.8.26.0200',
      titulo: 'Processo Sem Datas',
      cliente: null,
      data_realizado: null,
      data_inicio: null,
    };

    render(
      <CriticalProcessesCard
        processes={[proc1Day, procNoDates]}
        onAnalyze={handleAnalyze}
      />
    );

    expect(screen.getAllByText('Há 1 dia')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Sem cliente')[0]).toBeInTheDocument();

    const mobileButtons = screen.getAllByRole('button', {
      name: 'Analisar Processo',
    });
    fireEvent.click(mobileButtons[0]);
    expect(handleAnalyze).toHaveBeenCalledWith(proc1Day);

    // Render sem onAnalyze e sem onRetry
    const { unmount } = render(
      <CriticalProcessesCard processes={[proc1Day]} error="Erro sem retry" />
    );
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
    unmount();

    render(<CriticalProcessesCard processes={[proc1Day]} />);
    const buttons = screen.getAllByRole('button', { name: 'Analisar' });
    fireEvent.click(buttons[0]); // Sem onAnalyze fornecido não deve quebrar
  });
});
