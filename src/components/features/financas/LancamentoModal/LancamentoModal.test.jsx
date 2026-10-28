import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LancamentoModal from './LancamentoModal';

vi.mock('@/services/financas', () => ({
  listarCategorias: vi.fn().mockResolvedValue([
    { categoria_id: 1, nome: 'Honorários' },
    { categoria_id: 2, nome: 'Custas' },
    { categoria_id: 3, nome: 'Despesas Operacionais' },
    { categoria_id: 4, nome: 'Consultoria' },
    { categoria_id: 5, nome: 'Outros' },
  ]),
  criarCategoria: vi
    .fn()
    .mockResolvedValue({ categoria_id: 99, nome: 'Nova Categoria' }),
  excluirCategoria: vi.fn().mockResolvedValue(true),
  obterResumoFinancas: vi.fn(),
}));

const renderModal = (props = {}) =>
  render(
    <LancamentoModal
      isOpen
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue({})}
      {...props}
    />
  );

describe('LancamentoModal', () => {
  it('não renderiza quando isOpen é falso', () => {
    renderModal({ isOpen: false });

    expect(
      screen.queryByRole('heading', { name: /Lançamento Financeiro/i })
    ).not.toBeInTheDocument();
  });

  it('renderiza título de novo lançamento e todos os campos esperados', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Novo Lançamento Financeiro' })
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Entrada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saída' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toBeRequired();
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor')).toBeRequired();
    expect(screen.getByLabelText('Data de Criação')).toBeRequired();
    expect(screen.getByLabelText('Data de Vencimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Este lançamento é recorrente')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Salvar Lançamento' })
    ).toBeInTheDocument();
  });

  it('renderiza dados preenchidos e título de edição quando initialItem é fornecido', () => {
    const mockItem = {
      id: 10,
      tipo: 'saida',
      titulo: 'Conta de Energia',
      descricao: 'Referente ao mês',
      valor: 350.5,
      data: '10/09/2026',
      dataIso: '2026-09-10',
      dataVencimento: '15/09/2026',
      dataVencimentoIso: '2026-09-15',
      categoria: 'Despesas Operacionais',
      recorrente: true,
      status: 'pendente',
    };

    renderModal({ initialItem: mockItem });

    expect(
      screen.getByRole('heading', { name: 'Editar Lançamento Financeiro' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Conta de Energia');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Referente ao mês');
    expect(screen.getByLabelText('Valor')).toHaveValue('350.5');
    expect(screen.getByLabelText('Data de Criação')).toHaveValue('2026-09-10');
    expect(screen.getByLabelText('Data de Vencimento')).toHaveValue(
      '2026-09-15'
    );
    expect(screen.getByLabelText('Categoria')).toHaveValue(
      'Despesas Operacionais'
    );
    expect(screen.getByLabelText('Este lançamento é recorrente')).toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Salvar Alterações' })
    ).toBeInTheDocument();
  });

  it('permite alternar entre Entrada e Saída', () => {
    renderModal();

    const entradaBtn = screen.getByRole('button', { name: 'Entrada' });
    const saidaBtn = screen.getByRole('button', { name: 'Saída' });

    expect(entradaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(saidaBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(saidaBtn);
    expect(entradaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(saidaBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(entradaBtn);
    expect(entradaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(saidaBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it.each([
    {
      scenario: 'título em branco',
      titulo: '   ',
      valor: '100',
      expectedError: 'Por favor, informe o título do lançamento.',
    },
    {
      scenario: 'valor igual a zero',
      titulo: 'Honorários',
      valor: '0',
      expectedError: 'Por favor, informe um valor válido maior que zero.',
    },
    {
      scenario: 'valor inválido não numérico',
      titulo: 'Honorários',
      valor: 'abc',
      expectedError: 'Por favor, informe um valor válido maior que zero.',
    },
  ])(
    'valida campos obrigatórios ao submeter com $scenario',
    async ({ titulo, valor, expectedError }) => {
      renderModal();

      fireEvent.change(screen.getByLabelText('Título'), {
        target: { value: titulo },
      });
      fireEvent.change(screen.getByLabelText('Valor'), {
        target: { value: valor },
      });
      fireEvent.submit(
        screen.getByRole('button', { name: 'Salvar Lançamento' })
      );

      expect(await screen.findByText(expectedError)).toBeInTheDocument();
    }
  );

  it('submete novo lançamento com sucesso', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    renderModal({ onSave, onClose });

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Honorários Consultoria' },
    });
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Assessoria mensal' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '1500,50' },
    });
    fireEvent.change(screen.getByLabelText('Data de Criação'), {
      target: { value: '2026-09-15' },
    });
    fireEvent.change(screen.getByLabelText('Data de Vencimento'), {
      target: { value: '2026-09-20' },
    });
    fireEvent.change(screen.getByLabelText('Categoria'), {
      target: { value: 'Consultoria' },
    });
    fireEvent.click(screen.getByLabelText('Este lançamento é recorrente'));

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Lançamento' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'entrada',
          titulo: 'Honorários Consultoria',
          descricao: 'Assessoria mensal',
          valor: 1500.5,
          dataIso: '2026-09-15',
          data: '15/09/2026',
          dataVencimentoIso: '2026-09-20',
          dataVencimento: '20/09/2026',
          categoria: 'Consultoria',
          recorrente: true,
        })
      );
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('salva alterações ao editar um item existente', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    const mockItem = {
      id: 99,
      tipo: 'entrada',
      titulo: 'Título Original',
      valor: 1000,
      data: '01/09/2026',
      dataIso: '2026-09-01',
      status: 'realizado',
    };

    renderModal({ initialItem: mockItem, onSave, onClose });

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Título Atualizado' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '2500' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 99,
          titulo: 'Título Atualizado',
          valor: 2500,
          status: 'realizado',
        })
      );
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it.each([
    {
      scenario: 'ambas as datas (criação e vencimento)',
      initialData: '2026-09-01',
      initialVencimento: '2026-09-05',
      newData: '2026-09-10',
      newVencimento: '2026-09-15',
      expectedPayload: {
        data: '10/09/2026',
        dataIso: '2026-09-10',
        data_pagamento: '2026-09-10',
        dataPagamentoIso: '2026-09-10',
        dataVencimento: '15/09/2026',
        dataVencimentoIso: '2026-09-15',
        data_vencimento: '2026-09-15',
      },
    },
    {
      scenario: 'apenas a data de criação preservando o vencimento',
      initialData: '2026-10-01',
      initialVencimento: '2026-10-20',
      newData: '2026-10-05',
      newVencimento: null,
      expectedPayload: {
        data: '05/10/2026',
        dataIso: '2026-10-05',
        data_pagamento: '2026-10-05',
        dataVencimento: '20/10/2026',
        dataVencimentoIso: '2026-10-20',
        data_vencimento: '2026-10-20',
      },
    },
    {
      scenario: 'apenas a data de vencimento preservando a data de criação',
      initialData: '2026-10-01',
      initialVencimento: '2026-10-20',
      newData: null,
      newVencimento: '2026-10-25',
      expectedPayload: {
        data: '01/10/2026',
        dataIso: '2026-10-01',
        data_pagamento: '2026-10-01',
        dataVencimento: '25/10/2026',
        dataVencimentoIso: '2026-10-25',
        data_vencimento: '2026-10-25',
      },
    },
  ])(
    'atualiza $scenario ao editar lançamento existente',
    async ({
      initialData,
      initialVencimento,
      newData,
      newVencimento,
      expectedPayload,
    }) => {
      const onSave = vi.fn().mockResolvedValue({});
      const onClose = vi.fn();
      const mockItem = {
        id: 100,
        tipo: 'entrada',
        titulo: 'Título Original',
        valor: 1000,
        dataIso: initialData,
        data_pagamento: initialData,
        dataVencimentoIso: initialVencimento,
        data_vencimento: initialVencimento,
        status: 'pendente',
      };

      renderModal({ initialItem: mockItem, onSave, onClose });

      if (newData) {
        fireEvent.change(screen.getByLabelText('Data de Criação'), {
          target: { value: newData },
        });
      }
      if (newVencimento) {
        fireEvent.change(screen.getByLabelText('Data de Vencimento'), {
          target: { value: newVencimento },
        });
      }

      fireEvent.submit(
        screen.getByRole('button', { name: 'Salvar Alterações' })
      );

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 100,
            ...expectedPayload,
          })
        );
        expect(onClose).toHaveBeenCalledOnce();
      });
    }
  );

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    {
      description: 'erro com mensagem específica',
      rejectedValue: new Error('Erro forçado de salvamento'),
      expectedMessage: 'Erro forçado de salvamento',
    },
    {
      description: 'erro sem mensagem definida (fallback)',
      rejectedValue: {},
      expectedMessage: 'Erro ao salvar o lançamento financeiro.',
    },
  ])(
    'exibe $description caso a submissão falhe',
    async ({ rejectedValue, expectedMessage }) => {
      const handleSave = vi.fn().mockRejectedValue(rejectedValue);
      renderModal({ onSave: handleSave });

      fireEvent.change(screen.getByLabelText('Título'), {
        target: { value: 'Teste' },
      });
      fireEvent.change(screen.getByLabelText('Valor'), {
        target: { value: '100' },
      });
      fireEvent.submit(screen.getByRole('dialog'));

      await waitFor(() => {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      });
    }
  );

  it('cobre fallbacks de formatação de data no payload e valores iniciais faltantes em edição', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const mockItem = {
      id: 99,
      status: 'pendente',
    };
    renderModal({ initialItem: mockItem, onSave, onClose: vi.fn() });

    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByLabelText('Valor')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Entrada' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Teste Fallback Date' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Data de Criação'), {
      target: { value: 'T' },
    });
    fireEvent.change(screen.getByLabelText('Data de Vencimento'), {
      target: { value: 'T' },
    });

    fireEvent.submit(screen.getByRole('dialog'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });
});
