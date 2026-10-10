import {
  atualizarFinancas,
  criarFinancas,
  excluirFinancas,
  listarCategorias,
  obterResumoFinancas,
  listarFinancas,
} from '@/services/financas';
import FinancasClient from './financasClient';

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
    status: 'realizado',
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
    status: 'realizado',
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
    status: 'realizado',
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
    status: 'realizado',
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
    status: 'realizado',
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
    status: 'realizado',
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
  listarFinancas: vi.fn(),
  criarFinancas: vi.fn(),
  atualizarFinancas: vi.fn(),
  excluirFinancas: vi.fn(),
  atualizarFinancas: vi.fn(),
  listarCategorias: vi
    .fn()
    .mockResolvedValue([{ categoria_id: 1, nome: 'Honorários' }]),
  criarCategoria: vi
    .fn()
    .mockResolvedValue({ categoria_id: 2, nome: 'Nova Categoria' }),
  excluirCategoria: vi.fn().mockResolvedValue(true),
  obterResumoFinancas: vi.fn(),
}));

describe('FinancasClient', () => {
  let currentLancamentos = [];

  beforeEach(() => {
    vi.clearAllMocks();
    currentLancamentos = [...mockLancamentos];

    listarFinancas.mockImplementation(async () => ({
      itens: currentLancamentos,
      total: currentLancamentos.length,
      page: 1,
      page_size: currentLancamentos.length,
    }));
    obterResumoFinancas.mockResolvedValue({
      realizado: { total_entradas: 5000, total_saidas: 1000 },
      pendente: { total_entradas: 0, total_saidas: 0 },
      atrasado: { total_entradas: 0, total_saidas: 0 },
    });
    criarFinancas.mockImplementation(async (item) => {
      const newItem = { ...item, id: item.id || 99 };
      currentLancamentos = [newItem, ...currentLancamentos];
      return newItem;
    });
    atualizarFinancas.mockImplementation(async (id, item) => {
      const updated = { ...item, id };
      currentLancamentos = currentLancamentos.map((l) =>
        l.id === id ? updated : l
      );
      return updated;
    });
    excluirFinancas.mockImplementation(async (id) => {
      currentLancamentos = currentLancamentos.filter((l) => l.id !== id);
    });
    atualizarFinancas.mockImplementation(async (id, status) => ({
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

    await waitFor(() => {
      expect(listarFinancas).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const editButtons = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editButtons[0]);
    expect(handleEditLancamento).toHaveBeenCalledOnce();

    const closeButtons = screen.getAllByRole('button', { name: 'Fechar' });
    fireEvent.click(closeButtons[0]);

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(deleteButtons[0]);

    const dialogs = screen.getAllByRole('dialog');
    const deleteDialog = dialogs[dialogs.length - 1];
    const modalConfirmButton =
      deleteDialog.querySelector('.deleteButton') ||
      screen.getAllByRole('button', { name: 'Excluir lançamento' }).pop();
    fireEvent.click(modalConfirmButton);

    await waitFor(() => {
      expect(excluirFinancas).toHaveBeenCalledWith(1);
      expect(handleDeleteLancamento).toHaveBeenCalledOnce();
      expect(
        screen.queryByText('Honorários Iniciais - João Santos')
      ).not.toBeInTheDocument();
    });
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

    const modalConfirmButton =
      screen.getByRole('dialog').querySelector('.deleteButton') ||
      screen.getAllByRole('button', { name: 'Excluir lançamento' }).pop();
    fireEvent.click(modalConfirmButton);

    await waitFor(() => {
      expect(
        screen.getAllByText('Erro de conexão com o servidor.')[0]
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
    fireEvent.change(screen.getByLabelText('Categoria'), {
      target: { value: 'Honorários' },
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

    const toggleButtons = screen.getAllByRole('button', {
      name: 'Marcar como pendente',
    });
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(atualizarFinancas).toHaveBeenCalled();
      expect(handleToggleStatus).toHaveBeenCalledOnce();
    });
  });

  it('fecha o modal de exclusão ao clicar em Cancelar', async () => {
    render(<FinancasClient initialData={mockLancamentos} />);
    const deleteButtons = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(deleteButtons[0]);
    const cancelButton = screen
      .getAllByRole('button', { name: 'Cancelar' })
      .pop();
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro na tela caso a alteração de status falhe', async () => {
    atualizarFinancas.mockRejectedValueOnce(
      new Error('Erro ao alterar status.')
    );
    render(<FinancasClient initialData={mockLancamentos} />);
    const toggleButtons = screen.getAllByRole('button', {
      name: 'Marcar como pendente',
    });
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Erro ao alterar status.')).toBeInTheDocument();
    });
  });
});
