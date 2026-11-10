import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProdutividadeEquipe } from '@/hooks/useProdutividadeEquipe';
import ProdutividadeEquipe from './TeamProductivity';
import styles from './TeamProductivity.module.css';

vi.mock('@/hooks/useProdutividadeEquipe', () => ({
  useProdutividadeEquipe: vi.fn(),
}));

describe('ProdutividadeEquipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProdutividadeEquipe.mockReturnValue({
      productivity: [],
      isLoading: false,
      error: '',
    });
  });

  it('não renderiza o componente quando não pode visualizar', () => {
    const { container } = render(<ProdutividadeEquipe />);

    expect(container).toBeEmptyDOMElement();
    expect(useProdutividadeEquipe).toHaveBeenCalledWith(false);
  });

  it('renderiza o título e os cabeçalhos da tabela quando pode visualizar', () => {
    render(<ProdutividadeEquipe canView />);

    expect(
      screen.getByRole('heading', { name: 'Produtividade da Equipe' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Responsável' })
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Finalizadas' })
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Em andamento' })
    ).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'A fazer' })).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Atrasadas' })
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Progresso' })
    ).toBeVisible();
    expect(useProdutividadeEquipe).toHaveBeenCalledWith(true);
  });

  it('renderiza os dados da pessoa, os badges e o progresso', () => {
    useProdutividadeEquipe.mockReturnValue({
      productivity: [
        {
          funcionario_id: 7,
          nome: 'Ana Costa',
          finalizadas: 4,
          em_andamento: 2,
          a_fazer: 3,
          atrasadas: 1,
          progresso: 76,
        },
      ],
      isLoading: false,
      error: '',
    });

    render(<ProdutividadeEquipe canView />);

    const row = screen.getByRole('row', { name: /Ana Costa/ });
    const cells = within(row).getAllByRole('cell');

    expect(within(row).getByRole('rowheader')).toHaveTextContent('Ana Costa');
    expect(cells[0]).toHaveTextContent('4');
    expect(cells[1]).toHaveTextContent('2');
    expect(cells[2]).toHaveTextContent('3');
    expect(cells[3]).toHaveTextContent('1');
    expect(cells[4]).toHaveTextContent('76%');
    expect(cells[0].querySelector(`.${styles.badgeSuccess}`)).toHaveTextContent(
      '4'
    );
    expect(cells[1].querySelector(`.${styles.badgeInfo}`)).toHaveTextContent(
      '2'
    );
    expect(cells[2].querySelector(`.${styles.badgeWarning}`)).toHaveTextContent(
      '3'
    );
    expect(cells[3].querySelector(`.${styles.badgeDanger}`)).toHaveTextContent(
      '1'
    );
    expect(cells[4].querySelector(`.${styles.progressFill}`)).toHaveStyle({
      width: '76%',
    });
  });

  it('mostra travessões para contagens zeradas e percentual zero', () => {
    useProdutividadeEquipe.mockReturnValue({
      productivity: [
        {
          funcionario_id: 8,
          nome: 'Bruno Lima',
          finalizadas: 0,
          em_andamento: 0,
          a_fazer: 0,
          atrasadas: 0,
          progresso: 0,
        },
      ],
      isLoading: false,
      error: '',
    });

    render(<ProdutividadeEquipe canView />);

    const row = screen.getByRole('row', { name: /Bruno Lima/ });
    const cells = within(row).getAllByRole('cell');

    expect(cells.slice(0, 4).map((cell) => cell.textContent.trim())).toEqual([
      '—',
      '—',
      '—',
      '—',
    ]);
    expect(cells[4]).toHaveTextContent('0%');
  });

  it('mostra travessões nas métricas enquanto carrega', () => {
    useProdutividadeEquipe.mockReturnValue({
      productivity: [
        {
          funcionario_id: 9,
          nome: 'Carla Souza',
          finalizadas: 4,
          em_andamento: 2,
          a_fazer: 1,
          atrasadas: 1,
          progresso: 55,
        },
      ],
      isLoading: true,
      error: '',
    });

    render(<ProdutividadeEquipe canView />);

    const row = screen.getByRole('row', { name: /Carla Souza/ });
    const cells = within(row).getAllByRole('cell');

    expect(cells.map((cell) => cell.textContent.trim())).toEqual([
      '—',
      '—',
      '—',
      '—',
      '—',
    ]);
    expect(cells[4].querySelector(`.${styles.progressFill}`)).toHaveStyle({
      width: '0%',
    });
  });

  it('exibe o erro retornado pelo hook', () => {
    useProdutividadeEquipe.mockReturnValue({
      productivity: [],
      isLoading: false,
      error: 'Não foi possível carregar a produtividade da equipe.',
    });

    render(<ProdutividadeEquipe canView />);

    expect(
      screen.getByText('Não foi possível carregar a produtividade da equipe.')
    ).toBeInTheDocument();
  });

  it('não renderiza linha correspondente à conta administradora', () => {
    useProdutividadeEquipe.mockReturnValue({
      productivity: [
        {
          funcionario_id: 1,
          nome: 'Administrador',
          finalizadas: 0,
          em_andamento: 0,
          a_fazer: 0,
          atrasadas: 0,
          progresso: 0,
        },
        {
          funcionario_id: 2,
          nome: 'Ana Costa',
          finalizadas: 4,
          em_andamento: 2,
          a_fazer: 3,
          atrasadas: 1,
          progresso: 76,
        },
      ],
      isLoading: false,
      error: '',
    });

    render(<ProdutividadeEquipe canView />);

    expect(screen.queryByText('Administrador')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
  });
});
