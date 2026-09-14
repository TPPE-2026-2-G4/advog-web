import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFinancas } from './useFinancas';
import {
  atualizarFinancas,
  criarFinancas,
  excluirFinancas,
  mudarStatusLancamento,
} from '@/services/financas';

vi.mock('@/services/financas', () => ({
  criarFinancas: vi.fn(),
  atualizarFinancas: vi.fn(),
  excluirFinancas: vi.fn(),
  mudarStatusLancamento: vi.fn(),
}));

const mockData = [
  {
    id: 1,
    data: '01/08/2026',
    titulo: 'Honorários Iniciais',
    categoria: 'Honorários',
    tipo: 'entrada',
    valor: 5000,
    status: 'pago',
  },
  {
    id: 2,
    data: '05/08/2026',
    titulo: 'Custas Processuais',
    categoria: 'Custas',
    tipo: 'saida',
    valor: 250,
    status: 'pago',
  },
];

describe('useFinancas', () => {
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

  it('inicializa com os dados fornecidos e calcula o resumo', () => {
    const { result } = renderHook(() => useFinancas(mockData));

    expect(result.current.lancamentos).toEqual(mockData);
    expect(result.current.totalLancamentos).toBe(2);
    expect(result.current.resumo).toEqual({
      totalEntradas: 5000,
      totalSaidas: 250,
      saldo: 4750,
    });
  });

  it('inicializa com array vazio por padrão quando nenhum dado é fornecido', () => {
    const { result } = renderHook(() => useFinancas());

    expect(result.current.lancamentos).toEqual([]);
    expect(result.current.totalLancamentos).toBe(0);
  });

  it('exclui um lançamento via API e aciona o callback onDelete', async () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() => useFinancas(mockData, { onDelete }));

    await act(async () => {
      await result.current.handleDeleteLancamento(mockData[0]);
    });

    expect(excluirFinancas).toHaveBeenCalledWith(mockData[0].id);
    expect(result.current.lancamentos).toHaveLength(1);
    expect(result.current.lancamentos[0].id).toBe(2);
    expect(onDelete).toHaveBeenCalledWith(mockData[0]);
    expect(result.current.resumo.saldo).toBe(-250);
  });

  it('armazena deleteError quando a exclusão na API falha', async () => {
    excluirFinancas.mockRejectedValueOnce(
      new Error('Erro de conexão ao excluir.')
    );
    const { result } = renderHook(() => useFinancas(mockData));

    await act(async () => {
      await expect(
        result.current.handleDeleteLancamento(mockData[0])
      ).rejects.toThrow('Erro de conexão ao excluir.');
    });

    expect(result.current.deleteError).toBe('Erro de conexão ao excluir.');
    expect(result.current.lancamentos).toHaveLength(2);
  });

  it('seleciona um lançamento ao editar e aciona o callback onEdit', () => {
    const onEdit = vi.fn();
    const { result } = renderHook(() => useFinancas(mockData, { onEdit }));

    act(() => {
      result.current.handleEditLancamento(mockData[1]);
    });

    expect(result.current.selectedLancamento).toEqual(mockData[1]);
    expect(onEdit).toHaveBeenCalledWith(mockData[1]);
  });

  it('cria um novo lançamento via API e atualiza a lista e resumo', async () => {
    const onCreate = vi.fn();
    const { result } = renderHook(() => useFinancas(mockData, { onCreate }));

    const novo = {
      titulo: 'Novo Recebimento',
      tipo: 'entrada',
      valor: 1000,
      status: 'pago',
    };

    await act(async () => {
      await result.current.handleCreateLancamento(novo);
    });

    expect(criarFinancas).toHaveBeenCalledWith(novo);
    expect(result.current.lancamentos).toHaveLength(3);
    expect(result.current.lancamentos[0].titulo).toBe('Novo Recebimento');
    expect(onCreate).toHaveBeenCalledOnce();
    expect(result.current.resumo.saldo).toBe(5750);
  });

  it('armazena saveError quando a criação na API falha', async () => {
    criarFinancas.mockRejectedValueOnce(new Error('Falha ao criar'));
    const { result } = renderHook(() => useFinancas(mockData));

    await act(async () => {
      await expect(
        result.current.handleCreateLancamento({ titulo: 'Inválido' })
      ).rejects.toThrow('Falha ao criar');
    });

    expect(result.current.saveError).toBe('Falha ao criar');
  });

  it('permite alternar estados de modal', () => {
    const { result } = renderHook(() => useFinancas());

    expect(result.current.isNewModalOpen).toBe(false);
    expect(result.current.isReportModalOpen).toBe(false);

    act(() => {
      result.current.setIsNewModalOpen(true);
      result.current.setIsReportModalOpen(true);
    });

    expect(result.current.isNewModalOpen).toBe(true);
    expect(result.current.isReportModalOpen).toBe(true);
  });

  it('atualiza um lançamento existente com handleUpdateLancamento via API', async () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() => useFinancas(mockData, { onUpdate }));

    act(() => {
      result.current.handleEditLancamento(mockData[0]);
    });
    expect(result.current.selectedLancamento).toEqual(mockData[0]);

    await act(async () => {
      await result.current.handleUpdateLancamento({
        id: 1,
        titulo: 'Honorários Atualizados',
        valor: 7000,
      });
    });

    expect(atualizarFinancas).toHaveBeenCalledWith(1, {
      id: 1,
      titulo: 'Honorários Atualizados',
      valor: 7000,
    });
    expect(result.current.lancamentos[0].titulo).toBe('Honorários Atualizados');
    expect(result.current.lancamentos[0].valor).toBe(7000);
    expect(result.current.selectedLancamento).toBeNull();
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('armazena saveError quando a atualização na API falha', async () => {
    atualizarFinancas.mockRejectedValueOnce(new Error('Falha ao atualizar'));
    const { result } = renderHook(() => useFinancas(mockData));

    await act(async () => {
      await expect(
        result.current.handleUpdateLancamento({ id: 1, titulo: 'Teste' })
      ).rejects.toThrow('Falha ao atualizar');
    });

    expect(result.current.saveError).toBe('Falha ao atualizar');
  });

  it('alterna status via API com handleToggleStatus', async () => {
    const onToggleStatus = vi.fn();
    const pendenteEntrada = {
      id: 3,
      tipo: 'entrada',
      dataIso: '2026-10-01',
      status: 'pendente',
      valor: 500,
    };
    const pendenteSaida = {
      id: 4,
      tipo: 'saida',
      dataIso: '2026-10-01',
      status: 'pendente',
      valor: 250,
    };
    const { result } = renderHook(() =>
      useFinancas([pendenteEntrada, pendenteSaida], { onToggleStatus })
    );

    await act(async () => {
      await result.current.handleToggleStatus(pendenteEntrada);
    });
    expect(mudarStatusLancamento).toHaveBeenCalledWith(3, 'recebido');
    expect(result.current.lancamentos[0].status).toBe('recebido');
    expect(onToggleStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, status: 'recebido' })
    );

    await act(async () => {
      await result.current.handleToggleStatus(pendenteSaida);
    });
    expect(mudarStatusLancamento).toHaveBeenCalledWith(4, 'pago');
    expect(result.current.lancamentos[1].status).toBe('pago');
    expect(onToggleStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, status: 'pago' })
    );
  });

  it('armazena statusError quando a alternância de status na API falha', async () => {
    mudarStatusLancamento.mockRejectedValueOnce(new Error('Falha no status'));
    const { result } = renderHook(() => useFinancas(mockData));

    await act(async () => {
      await expect(
        result.current.handleToggleStatus(mockData[0])
      ).rejects.toThrow('Falha no status');
    });

    expect(result.current.statusError).toBe('Falha no status');
  });

  it('alterna status de pago/recebido para atrasado quando vencimento expirou', async () => {
    const recebidoVencido = {
      id: 4,
      tipo: 'entrada',
      dataVencimentoIso: '2020-01-01',
      status: 'recebido',
      valor: 200,
    };
    const { result } = renderHook(() => useFinancas([recebidoVencido]));

    await act(async () => {
      await result.current.handleToggleStatus(recebidoVencido);
    });

    expect(mudarStatusLancamento).toHaveBeenCalledWith(4, 'atrasado');
    expect(result.current.lancamentos[0].status).toBe('atrasado');
  });

  it('alterna status de pago para pendente quando vencimento é futuro', async () => {
    const pagoFuturo = {
      id: 5,
      tipo: 'saida',
      dataVencimentoIso: '2099-01-01',
      status: 'pago',
      valor: 300,
    };
    const { result } = renderHook(() => useFinancas([pagoFuturo]));

    await act(async () => {
      await result.current.handleToggleStatus(pagoFuturo);
    });

    expect(mudarStatusLancamento).toHaveBeenCalledWith(5, 'pendente');
    expect(result.current.lancamentos[0].status).toBe('pendente');
  });
});
