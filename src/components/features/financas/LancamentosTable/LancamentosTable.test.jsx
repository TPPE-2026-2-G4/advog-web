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
    status: 'pago',
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
    status: 'pago',
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
    status: 'pago',
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
    status: 'pago',
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
    status: 'pago',
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
    status: 'pago',
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

    // Status: entrada exibe Recebido, saída exibe Pago
    expect(screen.getAllByText('Recebido').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pago').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pendente').length).toBeGreaterThanOrEqual(1);
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

  it('exibe botão de X quando o lançamento está pago e aciona onToggleStatus', () => {
    const handleToggleStatus = vi.fn();
    const pagoItem = { ...mockLancamentos[0], status: 'pago' };

    render(
      <LancamentosTable
        lancamentos={[pagoItem]}
        onToggleStatus={handleToggleStatus}
      />
    );

    const toggleBtn = screen.getByRole('button', {
      name: 'Marcar como pendente',
    });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(handleToggleStatus).toHaveBeenCalledOnce();
    expect(handleToggleStatus).toHaveBeenCalledWith(pagoItem);
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
      name: 'Marcar como pago',
    });
    expect(checkEntrada).toBeInTheDocument();
    expect(checkSaida).toBeInTheDocument();

    fireEvent.click(checkEntrada);
    expect(handleToggleStatus).toHaveBeenCalledWith(pendenteEntrada);

    fireEvent.click(checkSaida);
    expect(handleToggleStatus).toHaveBeenCalledWith(atrasadoSaida);
  });

  it('renderiza o badge de atrasado corretamente', () => {
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

    render(<LancamentosTable lancamentos={[atrasadoItem]} pageSize={15} />);

    expect(screen.getAllByText('Atrasado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Boleto Vencido')).toBeInTheDocument();
  });
});
