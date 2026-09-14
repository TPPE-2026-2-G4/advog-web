import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinancasClient from './financasClient';
import {
  atualizarFinancas,
  criarFinancas,
  excluirFinancas,
  mudarStatusLancamento,
} from '@/services/financas';

const mockLancamentos = [
  {
    id: 1,
    data: '01/08/2026',
    dataIso: '2026-08-01',
    dataPagamento: '01/08/2026',
    dataPagamentoIso: '2026-08-01',
    data_pagamento: '2026-08-01',
    dataVencimento: '01/08/2026',
    dataVencimentoIso: '2026-08-01',
    data_vencimento: '2026-08-01',
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
    dataPagamento: '05/08/2026',
    dataPagamentoIso: '2026-08-05',
    data_pagamento: '2026-08-05',
    dataVencimento: '05/08/2026',
    dataVencimentoIso: '2026-08-05',
    data_vencimento: '2026-08-05',
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
    dataPagamento: '10/08/2026',
    dataPagamentoIso: '2026-08-10',
    data_pagamento: '2026-08-10',
    dataVencimento: '10/08/2026',
    dataVencimentoIso: '2026-08-10',
    data_vencimento: '2026-08-10',
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
    dataPagamento: '15/08/2026',
    dataPagamentoIso: '2026-08-15',
    data_pagamento: '2026-08-15',
    dataVencimento: '15/08/2026',
    dataVencimentoIso: '2026-08-15',
    data_vencimento: '2026-08-15',
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
    dataPagamento: null,
    dataPagamentoIso: null,
    data_pagamento: null,
    dataVencimento: '18/08/2026',
    dataVencimentoIso: '2026-08-18',
    data_vencimento: '2026-08-18',
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
    dataPagamento: '22/08/2026',
    dataPagamentoIso: '2026-08-22',
    data_pagamento: '22/08/2026',
    dataVencimento: '22/08/2026',
    dataVencimentoIso: '2026-08-22',
    data_vencimento: '22/08/2026',
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
    dataPagamento: '25/08/2026',
    dataPagamentoIso: '2026-08-25',
    data_pagamento: '25/08/2026',
    dataVencimento: '25/08/2026',
    dataVencimentoIso: '2026-08-25',
    data_vencimento: '2026-08-25',
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
    dataPagamento: null,
    dataPagamentoIso: null,
    data_pagamento: null,
    dataVencimento: '28/08/2026',
    dataVencimentoIso: '2026-08-28',
    data_vencimento: '28/08/2026',
    titulo: 'Material de Escritório',
    descricao: 'Despesas Operacionais',
    categoria: 'Despesas Operacionais',
    tipo: 'saida',
    valor: 180,
    status: 'pendente',
  },
];

vi.mock('@/services/financas', () => ({
  criarFinancas: vi.fn(),
  atualizarFinancas: vi.fn(),
  excluirFinancas: vi.fn(),
  mudarStatusLancamento: vi.fn(),
}));

describe('FinancasClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    criarFinancas.mockImplementation(async (item) => ({
      ...item,
      id: item.id || 99,
    }));
    atualizarFinancas.mockImplementation(async (id, item) => ({
      ...item,
      id,
    }));
    excluirFinancas.mockImplementation(async () => {});
    mudarStatusLancamento.mockImplementation(async (id, status) => ({
      id,
      status,
    }));
  });

  it('renderiza o título e subtítulo corretamente', () => {
    render(<FinancasClient initialData={mockLancamentos} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Controle Financeiro' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Gestão de receitas e despesas')
    ).toBeInTheDocument();
  });

  it('renderiza os botões de ação com os textos esperados', () => {
    render(<FinancasClient initialData={mockLancamentos} />);

    expect(
      screen.getByRole('button', { name: /Relatório/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Novo Lançamento/i })
    ).toBeInTheDocument();
  });

  it('dispara as ações ao clicar nos botões', () => {
    const handleExportReport = vi.fn();
    const handleNewEntry = vi.fn();

    render(
      <FinancasClient
        initialData={mockLancamentos}
        onExportReport={handleExportReport}
        onNewEntry={handleNewEntry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));
    expect(handleExportReport).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: /Novo Lançamento/i }));
    expect(handleNewEntry).toHaveBeenCalledOnce();
  });

  it('renderiza a tabela de lançamentos recentes com os dados iniciais', () => {
    render(<FinancasClient initialData={mockLancamentos} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Lançamentos Recentes' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Honorários Iniciais - João Santos')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Exibindo 1–5 de 8 resultados')
    ).toBeInTheDocument();
  });

  it('permite acionar edição e exclusão de lançamentos', async () => {
    const handleEditLancamento = vi.fn();
    const handleDeleteLancamento = vi.fn();

    render(
      <FinancasClient
        initialData={mockLancamentos}
        onEditLancamento={handleEditLancamento}
        onDeleteLancamento={handleDeleteLancamento}
      />
    );

    const editButtons = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editButtons[0]);
    expect(handleEditLancamento).toHaveBeenCalledOnce();

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(deleteButtons[0]);

    // O modal deve abrir. Clicar no botão de confirmação do modal
    const modalConfirmButton =
      screen.getByRole('dialog').querySelector('.deleteButton') ||
      screen.getAllByRole('button', { name: 'Excluir lançamento' }).pop();
    fireEvent.click(modalConfirmButton);

    await waitFor(() => {
      expect(excluirFinancas).toHaveBeenCalledWith(1);
      expect(handleDeleteLancamento).toHaveBeenCalledOnce();
    });

    // O item foi removido da lista
    expect(
      screen.queryByText('Honorários Iniciais - João Santos')
    ).not.toBeInTheDocument();
  });

  it('exibe mensagem de erro na tela caso a exclusão falhe', async () => {
    excluirFinancas.mockRejectedValueOnce(
      new Error('Erro de conexão com o servidor.')
    );

    render(<FinancasClient initialData={mockLancamentos} />);

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(deleteButtons[0]);

    // O modal deve abrir. Clicar no botão de confirmação do modal
    const modalConfirmButton =
      screen.getByRole('dialog').querySelector('.deleteButton') ||
      screen.getAllByRole('button', { name: 'Excluir lançamento' }).pop();
    fireEvent.click(modalConfirmButton);

    await waitFor(() => {
      expect(
        screen.getByText('Erro de conexão com o servidor.')
      ).toBeInTheDocument();
    });
  });

  it('abre o modal ao clicar em Novo Lançamento e permite criar um lançamento', async () => {
    const handleSaveLancamento = vi.fn();

    render(
      <FinancasClient
        initialData={mockLancamentos}
        onSaveLancamento={handleSaveLancamento}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Novo Lançamento/i }));

    expect(
      screen.getByRole('heading', { name: 'Novo Lançamento Financeiro' })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Novo Contrato Empresarial' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '12000' },
    });
    fireEvent.change(screen.getByLabelText('Data de Vencimento'), {
      target: { value: '2026-10-15' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Lançamento' }));

    await waitFor(() => {
      expect(criarFinancas).toHaveBeenCalled();
      expect(screen.getByText('Novo Contrato Empresarial')).toBeInTheDocument();
      expect(handleSaveLancamento).toHaveBeenCalledOnce();
    });
  });

  it('abre o modal ao clicar em Editar e permite atualizar o lançamento', async () => {
    render(<FinancasClient initialData={mockLancamentos} />);

    const editButtons = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editButtons[0]);

    expect(
      screen.getByRole('heading', { name: 'Editar Lançamento Financeiro' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue(
      'Honorários Iniciais - João Santos'
    );

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Honorários Iniciais - João Silva' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => {
      expect(atualizarFinancas).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          titulo: 'Honorários Iniciais - João Silva',
        })
      );
      expect(
        screen.getByText('Honorários Iniciais - João Silva')
      ).toBeInTheDocument();
    });
  });

  it('permite alternar o status do lançamento através do botão de ação', async () => {
    const handleToggleStatus = vi.fn();

    render(
      <FinancasClient
        initialData={mockLancamentos}
        onToggleStatus={handleToggleStatus}
      />
    );

    // Primeiro item é Pago, então possui botão com X ("Marcar como pendente")
    const toggleButtons = screen.getAllByRole('button', {
      name: 'Marcar como pendente',
    });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(mudarStatusLancamento).toHaveBeenCalled();
      expect(handleToggleStatus).toHaveBeenCalledOnce();
    });
  });
});
