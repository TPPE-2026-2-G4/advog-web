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
  it('renderiza colunas, dados básicos e destaca prazos vencidos', () => {
    renderTable();

    expect(screen.getByRole('table', { name: '' })).toBeInTheDocument();
    expect(screen.getByText(processes[0].cnj)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Caso 1' })).toBeInTheDocument();

    const futureDeadlines = screen.getAllByText('05/10/2099');
    expect(futureDeadlines).toHaveLength(3);
    futureDeadlines.forEach((deadline) =>
      expect(deadline).not.toHaveClass(styles.criticalDeadline)
    );
    expect(screen.getByText('01/01/2000')).toHaveClass(styles.criticalDeadline);
  });

  it.each([
    { status: 'Ativo', expectedClass: styles.statusActive },
    { status: 'Em Análise', expectedClass: styles.statusPending },
    { status: 'Concluído', expectedClass: styles.statusCompleted },
    { status: 'Arquivado', expectedClass: styles.statusArchived },
  ])(
    'renderiza o badge de status "$status" com a classe de estilo adequada',
    ({ status, expectedClass }) => {
      renderTable();

      const badge = screen.getByText(status);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedClass);
    }
  );

  it.each([
    { actionPrefix: 'Visualizar processo', callbackKey: 'onView' },
    { actionPrefix: 'Editar processo', callbackKey: 'onEdit' },
    { actionPrefix: 'Excluir processo', callbackKey: 'onDelete' },
  ])(
    'aciona $callbackKey ao clicar em "$actionPrefix"',
    ({ actionPrefix, callbackKey }) => {
      const props = renderTable({ processes: [processes[0]], totalItems: 1 });

      fireEvent.click(
        screen.getByRole('button', {
          name: `${actionPrefix} ${processes[0].cnj}`,
        })
      );

      expect(props[callbackKey]).toHaveBeenCalledWith(processes[0]);
    }
  );

  it.each([
    { canEdit: false, canDelete: false },
    { canEdit: true, canDelete: false },
    { canEdit: false, canDelete: true },
  ])(
    'controla visibilidade dos botões de ação conforme permissões (canEdit=$canEdit, canDelete=$canDelete)',
    ({ canEdit, canDelete }) => {
      renderTable({
        processes: [processes[0]],
        totalItems: 1,
        canEdit,
        canDelete,
      });

      const editBtn = screen.queryByRole('button', { name: /Editar processo/ });
      const deleteBtn = screen.queryByRole('button', {
        name: /Excluir processo/,
      });

      if (canEdit) {
        expect(editBtn).toBeInTheDocument();
      } else {
        expect(editBtn).not.toBeInTheDocument();
      }

      if (canDelete) {
        expect(deleteBtn).toBeInTheDocument();
      } else {
        expect(deleteBtn).not.toBeInTheDocument();
      }
    }
  );

  it('também abre o detalhe pelo título do caso', () => {
    const props = renderTable({ processes: [processes[0]], totalItems: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Caso 1' }));

    expect(props.onView).toHaveBeenCalledWith(processes[0]);
  });

  it.each([
    {
      hasActiveFilters: false,
      expectedTitle: 'Nenhum processo cadastrado',
      expectedDescription:
        'Cadastre o primeiro processo para começar a gerenciá-lo.',
    },
    {
      hasActiveFilters: true,
      expectedTitle: 'Nenhum processo encontrado',
      expectedDescription: 'Ajuste os filtros para ver outros resultados.',
    },
  ])(
    'renderiza estado vazio (hasActiveFilters=$hasActiveFilters) sem paginação',
    ({ hasActiveFilters, expectedTitle, expectedDescription }) => {
      renderTable({ processes: [], totalItems: 0, hasActiveFilters });

      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      expect(screen.getByText(expectedDescription)).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    }
  );

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
