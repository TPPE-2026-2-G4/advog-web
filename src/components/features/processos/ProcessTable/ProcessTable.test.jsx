import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessTable from './ProcessTable';
import styles from './ProcessTable.module.css';

const createProcess = (index, status, prazo = '2099-10-05') => ({
  processo_id: index,
  cnj: `006123${index}-56.2026.8.26.0100`,
  titulo: `Caso ${index}`,
  cliente: `Cliente ${index}`,
  status,
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana Paula',
  data_prazo: prazo,
});

const processes = [
  createProcess(1, 'Ativo'),
  createProcess(2, 'Em Análise'),
  createProcess(3, 'Concluído'),
  createProcess(4, 'Arquivado', '2000-01-01'),
];

const renderTable = (overrides = {}) => {
  const props = {
    processes,
    totalItems: processes.length,
    currentPage: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    canEdit: true,
    canDelete: true,
    ...overrides,
  };

  render(<ProcessTable {...props} />);
  return props;
};

describe('ProcessTable', () => {
  it('renderiza colunas, dados e os quatro status', () => {
    renderTable();

    expect(screen.getByRole('table', { name: '' })).toBeInTheDocument();
    expect(screen.getByText(processes[0].cnj)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Caso 1' })).toBeInTheDocument();
    ['Ativo', 'Em Análise', 'Concluído', 'Arquivado'].forEach((status) => {
      expect(screen.getByText(status)).toBeInTheDocument();
    });
    const futureDeadlines = screen.getAllByText('05/10/2099');
    expect(futureDeadlines).toHaveLength(3);
    futureDeadlines.forEach((deadline) =>
      expect(deadline).not.toHaveClass(styles.criticalDeadline)
    );
    expect(screen.getByText('01/01/2000')).toHaveClass(styles.criticalDeadline);
  });

  it('expõe as três ações com nomes acessíveis', () => {
    const props = renderTable({ processes: [processes[0]], totalItems: 1 });

    fireEvent.click(
      screen.getByRole('button', {
        name: `Visualizar processo ${processes[0].cnj}`,
      })
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: `Editar processo ${processes[0].cnj}`,
      })
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: `Excluir processo ${processes[0].cnj}`,
      })
    );

    expect(props.onView).toHaveBeenCalledWith(processes[0]);
    expect(props.onEdit).toHaveBeenCalledWith(processes[0]);
    expect(props.onDelete).toHaveBeenCalledWith(processes[0]);
  });

  it('oculta edição e exclusão sem as permissões correspondentes', () => {
    renderTable({
      processes: [processes[0]],
      totalItems: 1,
      canEdit: false,
      canDelete: false,
    });

    expect(
      screen.queryByRole('button', { name: /Editar processo/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Excluir processo/ })
    ).not.toBeInTheDocument();
  });

  it('também abre o detalhe pelo título do caso', () => {
    const props = renderTable({ processes: [processes[0]], totalItems: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Caso 1' }));

    expect(props.onView).toHaveBeenCalledWith(processes[0]);
  });

  it('renderiza estado vazio sem paginação', () => {
    renderTable({ processes: [], totalItems: 0 });

    expect(screen.getByText('Nenhum processo cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('navega entre páginas e bloqueia os limites', () => {
    const props = renderTable({
      processes: [processes[0]],
      totalItems: 6,
      currentPage: 2,
      totalPages: 2,
    });
    const navigation = screen.getByRole('navigation', { name: 'Paginação' });

    expect(within(navigation).getByText('Página 2 de 2')).toBeInTheDocument();
    expect(
      screen.getByText('Mostrando 6–6 de 6 processos')
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole('button', { name: 'Próxima página' })
    ).toBeDisabled();

    fireEvent.click(
      within(navigation).getByRole('button', { name: 'Página anterior' })
    );
    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });
});
