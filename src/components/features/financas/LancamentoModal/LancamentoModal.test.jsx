import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LancamentoModal from './LancamentoModal';

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
    expect(screen.getByLabelText('Data')).toBeRequired();
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
    expect(screen.getByLabelText('Data')).toHaveValue('2026-09-10');
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
  });

  it('valida campos obrigatórios ao submeter', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Lançamento' }));

    expect(
      await screen.findByText('Por favor, informe o título do lançamento.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Honorários' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '0' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Lançamento' }));

    expect(
      await screen.findByText(
        'Por favor, informe um valor válido maior que zero.'
      )
    ).toBeInTheDocument();
  });

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
    fireEvent.change(screen.getByLabelText('Data'), {
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
      status: 'recebido',
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
          status: 'recebido',
        })
      );
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('atualiza data de pagamento e data de vencimento ao editar lançamento existente', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    const mockItem = {
      id: 99,
      tipo: 'entrada',
      titulo: 'Título Original',
      valor: 1000,
      data: '01/09/2026',
      dataIso: '2026-09-01',
      data_pagamento: '2026-09-01',
      dataVencimento: '05/09/2026',
      dataVencimentoIso: '2026-09-05',
      data_vencimento: '2026-09-05',
      status: 'recebido',
    };

    renderModal({ initialItem: mockItem, onSave, onClose });

    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText('Data de Vencimento'), {
      target: { value: '2026-09-15' },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 99,
          data_pagamento: '2026-09-10',
          data_vencimento: '2026-09-15',
          dataPagamentoIso: '2026-09-10',
          dataVencimentoIso: '2026-09-15',
          data: '10/09/2026',
          dataVencimento: '15/09/2026',
        })
      );
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('exibe erro caso a submissão falhe e clica em entrada', async () => {
    const handleSave = vi
      .fn()
      .mockRejectedValue(new Error('Erro forçado de salvamento'));
    renderModal({ onSave: handleSave });
    fireEvent.click(screen.getByRole('button', { name: 'Entrada' }));
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Teste' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Lançamento' }));
    await waitFor(() => {
      expect(
        screen.getByText('Erro forçado de salvamento')
      ).toBeInTheDocument();
    });
  });

  it('cobre fallbacks de formatação de data no payload (sem dataIso)', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    renderModal({ onSave });

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Teste Fallback Date' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '100' },
    });

    // Forçar data inválida para que dataIso retorne vazio e use formData.data
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Data de Vencimento'), {
      target: { value: 'T' },
    });

    fireEvent.submit(screen.getByRole('dialog'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('cobre fallbacks de valores iniciais faltantes em edição', () => {
    // Para atingir linhas 37-38, 41-45 (tipo e titulo fallback, valor fallback)
    const mockItem = {
      id: 99,
      // tipo ausente
      // titulo ausente
      // valor ausente
      status: 'pendente', // só para não dar problema no isStatusConcluido vazio
    };
    renderModal({ initialItem: mockItem, onSave: vi.fn(), onClose: vi.fn() });

    // Título fallback ''
    expect(screen.getByLabelText('Título')).toHaveValue('');
    // Valor fallback ''
    expect(screen.getByLabelText('Valor')).toHaveValue('');
    // Tipo fallback 'entrada'
    expect(screen.getByRole('button', { name: 'Entrada' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('cobre branch else if de status não-concluido e sem data', async () => {
    // Para atingir fallback date em submit e não-concluido status
    const onSave = vi.fn().mockResolvedValue({});
    const mockItem = {
      id: 99,
      status: 'pendente',
    };
    renderModal({ initialItem: mockItem, onSave, onClose: vi.fn() });

    // Preenche pra não dar erro
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2026-01-01' },
    });

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('cobre fallback message em catch block vazio', async () => {
    // Para atingir linha 168: err?.message || 'Erro ao salvar o lançamento financeiro.'
    const onSave = vi.fn().mockRejectedValue({}); // Sem mensagem
    const mockItem = { id: 99, status: 'pendente' };
    renderModal({ initialItem: mockItem, onSave, onClose: vi.fn() });

    // Preenche pra não dar erro de validacao
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'X' },
    });
    fireEvent.change(screen.getByLabelText('Valor'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2026-01-01' },
    });

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => {
      expect(
        screen.getByText('Erro ao salvar o lançamento financeiro.')
      ).toBeInTheDocument();
    });
  });
});
