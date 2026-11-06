import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecentActivities from './RecentActivities';

const activities = [
  {
    atividade_id: 3,
    titulo: 'Petição atrasada',
    etapa: 'Em Execução',
    finalizada: false,
    atrasada: true,
    data_prazo: '2026-08-01T18:00:00',
    responsaveis: [{ funcionario_id: 1, nome: 'Ana Paula' }],
  },
  {
    atividade_id: 2,
    titulo: 'Homologação de acordo',
    etapa: 'Finalizado',
    finalizada: true,
    atrasada: false,
    data_prazo: '2026-08-25T18:00:00',
    responsaveis: [],
  },
  {
    atividade_id: 1,
    titulo: 'Redigir contrato',
    etapa: 'Backlog',
    finalizada: false,
    atrasada: false,
    data_prazo: '2026-12-05T18:00:00',
    responsaveis: [{ funcionario_id: 2, nome: 'Pedro' }],
  },
  {
    atividade_id: 0,
    titulo: 'Revisar estatuto',
    etapa: 'Revisão',
    finalizada: false,
    atrasada: false,
    data_prazo: '2026-12-10T18:00:00',
    responsaveis: [],
  },
];

describe('RecentActivities', () => {
  it('lista título, etapa, responsáveis e prazo de cada atividade', () => {
    render(<RecentActivities activities={activities} />);

    expect(
      screen.getByRole('heading', { name: 'Atividade Recente' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Petição atrasada')).toBeInTheDocument();
    expect(screen.getByText('Em Execução · Ana Paula')).toBeInTheDocument();
    expect(
      screen.getByText('Finalizado · Sem responsável')
    ).toBeInTheDocument();
    expect(screen.getByText('Prazo: 05/12/2026')).toBeInTheDocument();
  });

  it('destaca atividades atrasadas', () => {
    render(<RecentActivities activities={activities} />);

    expect(
      screen.getByText('Atrasada · Prazo: 01/08/2026')
    ).toBeInTheDocument();
    expect(screen.queryAllByText(/Atrasada ·/)).toHaveLength(1);
  });

  it('exibe mensagem de carregamento', () => {
    render(<RecentActivities isLoading />);

    expect(screen.getByText('Carregando atividades...')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há atividades', () => {
    render(<RecentActivities />);

    expect(
      screen.getByText('Nenhuma atividade registrada.')
    ).toBeInTheDocument();
  });

  it('exibe o erro e permite tentar novamente', () => {
    const onRetry = vi.fn();
    render(<RecentActivities error="Falha na API" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falha na API');

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('não exibe o botão de nova tentativa sem callback', () => {
    render(<RecentActivities error="Falha na API" />);

    expect(
      screen.queryByRole('button', { name: 'Tentar novamente' })
    ).not.toBeInTheDocument();
  });
});
