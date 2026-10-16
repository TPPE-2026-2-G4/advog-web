import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  calcularResumoFinanceiro,
  getStatusConcluido,
  isStatusConcluido,
  verificarStatusPorVencimento,
} from '@/utils/financas';
import {
  atualizarFinancas,
  criarFinancas,
  excluirFinancas,
  listarFinancas,
  excluirCategoria,
  obterResumoFinancas,
  listarCategorias,
  mudarStatusLancamento,
} from '@/services/financas';

export function useFinancas(initialData, options = {}) {
  const [lancamentos, setLancamentos] = useState(initialData || []);
  const [categorias, setCategorias] = useState(() => {
    const cats = [];
    if (initialData && Array.isArray(initialData)) {
      const seen = new Set();
      initialData.forEach((l) => {
        if (l.categoria && l.categoria !== 'Outros' && !seen.has(l.categoria)) {
          seen.add(l.categoria);
          cats.push({
            categoria_id: l.categoria_id,
            nome_categoria: l.categoria,
          });
        }
      });
    }
    return cats;
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 5,
    total: 0,
    totalPages: 1,
  });
  const [resumoBackend, setResumoBackend] = useState(null);

  useEffect(() => {
    listarCategorias()
      .then((cats) => {
        if (cats && Array.isArray(cats)) {
          setCategorias((prev) => {
            const map = new Map();
            prev.forEach((c) => {
              const name = c.nome_categoria || c.nome;
              if (name) map.set(name, c);
            });
            cats.forEach((c) => {
              const name = c.nome_categoria || c.nome;
              if (name) map.set(name, c);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(console.error);
  }, []);

  const lancamentosMapeados = useMemo(() => {
    if (!categorias.length) return lancamentos;
    return lancamentos.map((lanc) => {
      if (
        lanc.categoria_id &&
        (!lanc.categoria || lanc.categoria === 'Outros')
      ) {
        const cat = categorias.find(
          (c) => c.categoria_id === lanc.categoria_id
        );
        if (cat) {
          return { ...lanc, categoria: cat.nome_categoria };
        }
      }
      return lanc;
    });
  }, [lancamentos, categorias]);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Mantemos o resumo local como fallback caso o backend falhe, mas usamos o backend se disponível
  const resumoLocal = useMemo(
    () => calcularResumoFinanceiro(lancamentos),
    [lancamentos]
  );

  const resumo = useMemo(() => {
    if (resumoBackend) {
      return {
        totalEntradas:
          resumoBackend.realizado.total_entradas +
          resumoBackend.pendente.total_entradas +
          resumoBackend.atrasado.total_entradas,
        totalSaidas:
          resumoBackend.realizado.total_saidas +
          resumoBackend.pendente.total_saidas +
          resumoBackend.atrasado.total_saidas,
        saldo:
          resumoBackend.realizado.total_entradas +
          resumoBackend.pendente.total_entradas +
          resumoBackend.atrasado.total_entradas -
          (resumoBackend.realizado.total_saidas +
            resumoBackend.pendente.total_saidas +
            resumoBackend.atrasado.total_saidas),
      };
    }
    return resumoLocal;
  }, [resumoBackend, resumoLocal]);

  const handleDeleteLancamento = async (item) => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await excluirFinancas(item.id);

      const otherLancamentos = lancamentos.filter(
        (entry) => entry.id !== item.id
      );

      setLancamentos(otherLancamentos);
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      options.onDelete?.(item);

      if (item.categoria_id) {
        const hasMore = otherLancamentos.some(
          (entry) => entry.categoria_id === item.categoria_id
        );
        if (!hasMore) {
          excluirCategoria(item.categoria_id)
            .then(() =>
              setCategorias((prev) =>
                prev.filter((c) => c.categoria_id !== item.categoria_id)
              )
            )
            .catch(console.error);
        }
      }
    } catch (err) {
      setDeleteError(err?.message || 'Erro ao excluir lançamento.');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditLancamento = (item) => {
    setSelectedLancamento(item);
    options.onEdit?.(item);
  };

  const handleCreateLancamento = async (item) => {
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await criarFinancas(item);
      const resolvedData =
        response?.data_pagamento || response?.dataPagamento
          ? response.data
          : item.data || response?.data;
      const resolvedDataIso =
        response?.data_pagamento || response?.dataPagamentoIso
          ? response.dataIso
          : item.dataIso || response?.dataIso;
      const resolvedVencimento =
        response?.data_vencimento || response?.dataVencimento
          ? response.dataVencimento
          : item.dataVencimento;
      const resolvedVencimentoIso =
        response?.data_vencimento || response?.dataVencimentoIso
          ? response.dataVencimentoIso
          : item.dataVencimentoIso;

      const newItem = {
        ...item,
        ...(response || {}),
        data: resolvedData,
        dataIso: resolvedDataIso,
        dataVencimento: resolvedVencimento,
        dataVencimentoIso: resolvedVencimentoIso,
        categoria:
          response && response.categoria !== 'Outros' && response.categoria
            ? response.categoria
            : item.categoria || 'Outros',
        id: response?.id || item.id || Date.now(),
      };
      setLancamentos((current = []) => [newItem, ...current]);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
      if (newItem.categoria && newItem.categoria !== 'Outros') {
        setCategorias((prev) => {
          const exists = prev.some(
            (c) => (c.nome_categoria || c.nome) === newItem.categoria
          );
          if (!exists) {
            return [
              ...prev,
              {
                categoria_id: newItem.categoria_id,
                nome_categoria: newItem.categoria,
              },
            ];
          }
          return prev;
        });
      }
      options.onCreate?.(newItem);
      setIsNewModalOpen(false);
      return newItem;
    } catch (err) {
      setSaveError(err?.message || 'Erro ao criar lançamento.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLancamento = async (item) => {
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await atualizarFinancas(item.id, item);
      const resolvedData =
        response?.data_pagamento || response?.dataPagamento
          ? response.data
          : item.data || response?.data;
      const resolvedDataIso =
        response?.data_pagamento || response?.dataPagamentoIso
          ? response.dataIso
          : item.dataIso || response?.dataIso;
      const resolvedVencimento =
        response?.data_vencimento || response?.dataVencimento
          ? response.dataVencimento
          : item.dataVencimento;
      const resolvedVencimentoIso =
        response?.data_vencimento || response?.dataVencimentoIso
          ? response.dataVencimentoIso
          : item.dataVencimentoIso;

      const updated = {
        ...item,
        ...(response || {}),
        data: resolvedData,
        dataIso: resolvedDataIso,
        dataVencimento: resolvedVencimento,
        dataVencimentoIso: resolvedVencimentoIso,
        categoria:
          response && response.categoria !== 'Outros' && response.categoria
            ? response.categoria
            : item.categoria || 'Outros',
      };

      const oldItem = lancamentos.find((entry) => entry.id === item.id);

      setLancamentos((current = []) =>
        current.map((entry) => (entry.id === item.id ? updated : entry))
      );
      options.onUpdate?.(updated);
      setSelectedLancamento(null);

      if (
        oldItem &&
        oldItem.categoria_id &&
        oldItem.categoria_id !== updated.categoria_id
      ) {
        const otherLancamentos = lancamentos.filter(
          (entry) => entry.id !== item.id
        );
        const hasMore = otherLancamentos.some(
          (entry) => entry.categoria_id === oldItem.categoria_id
        );
        if (!hasMore) {
          excluirCategoria(oldItem.categoria_id)
            .then(() =>
              setCategorias((prev) =>
                prev.filter((c) => c.categoria_id !== oldItem.categoria_id)
              )
            )
            .catch(console.error);
        }
      }

      return updated;
    } catch (err) {
      setSaveError(err?.message || 'Erro ao atualizar lançamento.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    setIsUpdatingStatus(true);
    setStatusError('');
    try {
      const response = await mudarStatusLancamento(item.id);
      const updated = {
        ...item,
        ...(response || {}),
        status: response?.status,
      };

      setLancamentos((current = []) =>
        current.map((entry) => (entry.id === item.id ? updated : entry))
      );
      options.onToggleStatus?.(updated);
      return updated;
    } catch (err) {
      setStatusError(err?.message || 'Erro ao atualizar status.');
      throw err;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFilterLancamentos = useCallback(
    async (filters) => {
      try {
        const page = filters.page || 1;
        const pageSize = filters.page_size || pagination.pageSize;

        const [data, resumoData, novasCats] = await Promise.all([
          listarFinancas({ ...filters, page, page_size: pageSize }),
          obterResumoFinancas(filters),
          listarCategorias(),
        ]);

        if (novasCats && Array.isArray(novasCats)) {
          setCategorias((prev) => {
            const map = new Map();
            prev.forEach((c) => {
              const name = c.nome_categoria || c.nome;
              if (name) map.set(name, c);
            });
            novasCats.forEach((c) => {
              const name = c.nome_categoria || c.nome;
              if (name) map.set(name, c);
            });
            return Array.from(map.values());
          });
        }

        if (data && Array.isArray(data.itens)) {
          setLancamentos(data.itens);
          setPagination({
            page: data.page || page,
            pageSize: data.page_size || pageSize,
            total: data.total || 0,
            totalPages: data.total_pages || 1,
          });
        } else {
          const arr = data || [];
          setLancamentos(arr);
          setPagination((prev) => ({
            ...prev,
            total: arr.length,
            totalPages: Math.ceil(arr.length / prev.pageSize) || 1,
          }));
        }

        if (resumoData) {
          setResumoBackend(resumoData);
        }
      } catch (err) {
        console.error('Erro ao filtrar lançamentos:', err);
      }
    },
    [pagination.pageSize]
  );

  return {
    lancamentos: lancamentosMapeados,
    categorias,
    setLancamentos,
    pagination,
    resumo,
    totalLancamentos: pagination.total || lancamentos.length,
    isNewModalOpen,
    setIsNewModalOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    selectedLancamento,
    setSelectedLancamento,
    isSaving,
    saveError,
    isDeleting,
    deleteError,
    isUpdatingStatus,
    statusError,
    handleDeleteLancamento,
    handleEditLancamento,
    handleCreateLancamento,
    handleUpdateLancamento,
    handleToggleStatus,
    handleFilterLancamentos,
  };
}
