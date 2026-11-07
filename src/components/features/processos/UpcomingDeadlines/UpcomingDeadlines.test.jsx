import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UpcomingDeadlines from './UpcomingDeadlines';

const sampleProcesses = [
  {
    processo_id: 1,
    cnj: '0099012-34.2026.8.26.0602',
    titulo: 'Recurso de Apelação',
    cliente: 'Santos Corp.',
    descricao: 'Recurso',
    dias_restantes: 2,
    data_prazo: '2026-11-10',
  },
  {
    processo_id: 2,
    cnj: '0078901-23.2026.8.07.0001',
    titulo: 'Mandado de Segurança - Tech Solutions',
    cliente: 'Tech Solutions',
    descricao: '',
    area: 'Tributário',
    tribunal: 'TJDFT',
    dias_restantes: 4,
    data_prazo: '2026-11-12',
  },
  {
    id: 3,
    cnj: '',
    titulo: '',
    cliente: 'Sem cliente',
    descricao: null,
    area: '',
    tribunal: '',
    dias_restantes: 0,
    data_prazo: '2026-11-08',
  },
  {
    cnj: '0061234-56.2026.8.26.0100',
    titulo: 'Ação Trabalhista',
    descricao: 'Prazo Final',
    data_prazo: '2099-01-01',
  },
];

describe('UpcomingDeadlines', () => {
  it('renderiza a lista de prazos próximos com badges de urgência, subtítulos e ação Ver', () => {
    const onView = vi.fn();
    render(<UpcomingDeadlines processes={sampleProcesses} onView={onView} />);

    expect(
      screen.getByRole('heading', { name: 'Prazos Próximos' })
    ).toBeInTheDocument();

    expect(screen.getByText('0099012-34.2026.8.26.0602')).toBeInTheDocument();
    expect(
      screen.getByText('Recurso de Apelação - Santos Corp.')
    ).toBeInTheDocument();
    expect(screen.getByText('Recurso')).toBeInTheDocument();
    expect(screen.getByText('Vence em: 2 dia(s)')).toBeInTheDocument();

    expect(
      screen.getByText('Mandado de Segurança - Tech Solutions')
    ).toBeInTheDocument();
    expect(screen.getByText('Tributário · TJDFT')).toBeInTheDocument();
    expect(screen.getByText('Vence em: 4 dia(s)')).toBeInTheDocument();

    expect(screen.getByText('Processo sem título')).toBeInTheDocument();
    expect(screen.getByText('Prazo: 08/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Vence hoje')).toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: 'Ver' });
    expect(viewButtons).toHaveLength(4);

    fireEvent.click(viewButtons[0]);
    expect(onView).toHaveBeenCalledWith(sampleProcesses[0]);
  });

  it('não falha ao clicar em Ver quando onView não é informado e usa fallback 0 para data inválida', () => {
    render(
      <UpcomingDeadlines
        processes={[
          {
            processo_id: 99,
            cnj: '0000001-00.2026.8.26.0000',
            titulo: 'Caso sem data válida',
            data_prazo: 'invalida',
          },
        ]}
      />
    );

    expect(screen.getByText('Vence hoje')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));
  });

  it('exibe estado de carregamento', () => {
    render(<UpcomingDeadlines isLoading />);

    expect(
      screen.getByText('Carregando prazos próximos...')
    ).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });

  it('exibe estado vazio quando não há prazos próximos', () => {
    render(<UpcomingDeadlines processes={[]} windowDays={15} />);

    expect(
      screen.getByText('Nenhum prazo próximo nos próximos 15 dias.')
    ).toBeInTheDocument();
  });

  it('exibe erro com e sem botão de nova tentativa', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <UpcomingDeadlines error="Falha nos prazos" onRetry={onRetry} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Falha nos prazos');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<UpcomingDeadlines error="Falha sem retry" />);
    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
  });
});
