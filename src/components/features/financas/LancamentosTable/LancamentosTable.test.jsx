import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LancamentosTable from './LancamentosTable';

const mockLancamentos = [
  {
    id: 1,
    data: '01/08/2026',
    dataIso: '2026-08-01',
    titulo: 'Honorários Iniciais - João Santos',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 5000,
    status: 'realizado',
  },
  {
    id: 2,
    data: '05/08/2026',
    dataIso: '2026-08-05',
    titulo: 'Custas Processuais - Maria Souza',
    descricao: 'Custas',
    categoria: 'Custas',
    tipo: 'saida',
    valor: 250,
    status: 'realizado',
  },
  {
    id: 3,
    data: '10/08/2026',
    dataIso: '2026-08-10',
    titulo: 'Honorários de Êxito - Costa Indústrias',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 8500,
    status: 'realizado',
  },
  {
    id: 4,
    data: '15/08/2026',
    dataIso: '2026-08-15',
    titulo: 'Aluguel do Escritório - Agosto/2026',
    descricao: 'Despesas Operacionais',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 3200,
    status: 'realizado',
  },
  {
    id: 5,
    data: '18/08/2026',
    dataIso: '2026-08-18',
    titulo: 'Consultoria Jurídica - Tech Solutions',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 4200,
    status: 'pendente',
  },
  {
    id: 6,
    data: '22/08/2026',
    dataIso: '2026-08-22',
    titulo: 'Software Jurídico Mensalidade',
    descricao: 'Despesas Operacionais',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 450,
    status: 'realizado',
  },
  {
    id: 7,
    data: '25/08/2026',
    dataIso: '2026-08-25',
    titulo: 'Honorários Recorrentes - ABC Ltda',
    descricao: 'Honorários',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 3000,
    status: 'realizado',
  },
  {
    id: 8,
    data: '28/08/2026',
    dataIso: '2026-08-28',
    titulo: 'Material de Escritório',
    descricao: 'Despesas Operacionais',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 180,
    status: 'pendente',
  },
  {
    id: 9,
    data: '30/08/2026',
    titulo: 'Sem data ISO',
    categoria: 'Outros',
    tipo: 'saida',
    valor: 100,
    status: 'realizado',
  },
  {
    id: 10,
    titulo: 'Sem data alguma',
    categoria: 'Outros',
    tipo: 'saida',
    valor: 50,
    status: 'realizado',
  },
];

describe('LancamentosTable', () => {
  it('renderiza o título da tabela e estado vazio quando não há lançamentos', () => {
    render(<LancamentosTable lancamentos={[]} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Lançamentos Recentes' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Nenhum lançamento encontrado.')
    ).toBeInTheDocument();
  });

  it('renderiza tipos, formatação monetária e status corretamente', () => {
    render(
      <LancamentosTable
        lancamentos={[
          mockLancamentos[0],
          mockLancamentos[1],
          mockLancamentos[4],
        ]}
      />
    );

    // Valor formatado em BRL
    expect(screen.getByText('R$ 5.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.200,00')).toBeInTheDocument();

    // Tipo
    expect(screen.getAllByText('Entrada').length).toBeGreaterThanOrEqual(2);

    // Status: entrada exibe Realizado, saída exibe Realizado
    expect(screen.getAllByText('Realizado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Realizado').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(2);
  });

  it('avança para a próxima página e volta', () => {
    render(<LancamentosTable lancamentos={mockLancamentos} pageSize={5} />);

    const prevBtn = screen.getByRole('button', { name: 'Página anterior' });
    const nextBtn = screen.getByRole('button', { name: 'Próxima página' });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);

    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(
      screen.getByText('Exibindo 6–10 de 10 resultados')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Software Jurídico Mensalidade')
    ).toBeInTheDocument();
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('chama onFilter ao mudar categoria e status via dropdown', () => {
    const handleFilter = vi.fn();
    render(
      <LancamentosTable
        lancamentos={mockLancamentos}
        pageSize={10}
        onFilter={handleFilter}
      />
    );

    const selectCategoria = screen.getByLabelText('Filtrar por categoria');
    const selectStatus = screen.getByLabelText('Filtrar por status');

    fireEvent.change(selectCategoria, { target: { value: 'Honorários' } });

    expect(handleFilter).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'Honorários' })
    );

    fireEvent.change(selectCategoria, { target: { value: '' } }); // reset

    fireEvent.change(selectStatus, { target: { value: 'pendente' } });
    expect(handleFilter).toHaveBeenCalledWith(
      expect.objectContaining({ situacao: 'Previsto' })
    );
  });

  it('chama onFilter ao mudar intervalo de datas', () => {
    const handleFilter = vi.fn();
    render(
      <LancamentosTable
        lancamentos={mockLancamentos}
        pageSize={10}
        onFilter={handleFilter}
      />
    );

    const inputDe = screen.getByLabelText('Data inicial');
    const inputAte = screen.getByLabelText('Data final');

    fireEvent.change(inputDe, { target: { value: '2026-08-10' } });
    expect(handleFilter).toHaveBeenCalledWith(
      expect.objectContaining({ inicio: '2026-08-10' })
    );

    fireEvent.change(inputAte, { target: { value: '2026-08-20' } });
    expect(handleFilter).toHaveBeenCalledWith(
      expect.objectContaining({ fim: '2026-08-20' })
    );
  });

  it('limpa os filtros aplicados ao clicar no botão Limpar e aciona onFilter com undefined', () => {
    const handleFilter = vi.fn();
    render(
      <LancamentosTable
        lancamentos={mockLancamentos}
        pageSize={10}
        onFilter={handleFilter}
      />
    );

    const selectStatus = screen.getByLabelText('Filtrar por status');
    const inputDe = screen.getByLabelText('Data inicial');
    const clearBtn = screen.getByRole('button', { name: /Limpar/i });

    fireEvent.change(selectStatus, { target: { value: 'pendente' } });
    fireEvent.change(inputDe, { target: { value: '2026-08-15' } });

    // Clear mocks before pressing clear to check exactly the last call
    handleFilter.mockClear();

    fireEvent.click(clearBtn);

    expect(inputDe.value).toBe('');
    expect(selectStatus.value).toBe('');

    expect(handleFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        inicio: undefined,
        fim: undefined,
        categoria: undefined,
        situacao: undefined,
      })
    );
  });

  it('chama onEdit e onDelete ao clicar nos botões de ação', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <LancamentosTable
        lancamentos={[mockLancamentos[0]]}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const editBtn = screen.getByRole('button', { name: 'Editar lançamento' });
    const deleteBtn = screen.getByRole('button', {
      name: 'Excluir lançamento',
    });

    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledOnce();
    expect(handleEdit).toHaveBeenCalledWith(mockLancamentos[0]);

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledOnce();
    expect(handleDelete).toHaveBeenCalledWith(mockLancamentos[0]);
  });

  it('exibe botão de X quando o lançamento está realizado e aciona onToggleStatus', () => {
    const handleToggleStatus = vi.fn();
    const realizadoItem = { ...mockLancamentos[0], status: 'realizado' };

    render(
      <LancamentosTable
        lancamentos={[realizadoItem]}
        onToggleStatus={handleToggleStatus}
      />
    );

    const toggleBtn = screen.getByRole('button', {
      name: 'Marcar como pendente',
    });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(handleToggleStatus).toHaveBeenCalledOnce();
    expect(handleToggleStatus).toHaveBeenCalledWith(realizadoItem);
  });

  it('exibe botão de correto (Check) quando o lançamento está pendente ou atrasado e aciona onToggleStatus', () => {
    const handleToggleStatus = vi.fn();
    const pendenteEntrada = {
      ...mockLancamentos[4],
      tipo: 'entrada',
      status: 'pendente',
    };
    const atrasadoSaida = {
      ...mockLancamentos[1],
      tipo: 'saida',
      status: 'atrasado',
    };

    render(
      <LancamentosTable
        lancamentos={[pendenteEntrada, atrasadoSaida]}
        onToggleStatus={handleToggleStatus}
      />
    );

    const checkEntrada = screen.getByRole('button', {
      name: 'Marcar como recebido',
    });
    const checkSaida = screen.getByRole('button', {
      name: 'Marcar como realizado',
    });
    expect(checkEntrada).toBeInTheDocument();
    expect(checkSaida).toBeInTheDocument();

    fireEvent.click(checkEntrada);
    expect(handleToggleStatus).toHaveBeenCalledWith(pendenteEntrada);

    fireEvent.click(checkSaida);
    expect(handleToggleStatus).toHaveBeenCalledWith(atrasadoSaida);
  });

  it('renderiza o badge de atrasado e aciona onFilter para status atrasado', () => {
    const handleFilter = vi.fn();
    const atrasadoItem = {
      id: 99,
      data: '01/01/2026',
      dataIso: '2026-01-01',
      titulo: 'Boleto Vencido',
      categoria: 'Despesas Operacionais',
      tipo: 'saida',
      valor: 500,
      status: 'atrasado',
    };

    render(
      <LancamentosTable
        lancamentos={[...mockLancamentos, atrasadoItem]}
        pageSize={15}
        onFilter={handleFilter}
      />
    );

    expect(screen.getAllByText('Atrasado').length).toBeGreaterThanOrEqual(2);

    const selectStatus = screen.getByLabelText('Filtrar por status');
    fireEvent.change(selectStatus, { target: { value: 'atrasado' } });

    expect(handleFilter).toHaveBeenCalledWith(
      expect.objectContaining({ situacao: 'Atrasado' })
    );
  });
});
