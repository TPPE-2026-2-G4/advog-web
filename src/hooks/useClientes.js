'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
} from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

export function useClientes({
  initialClientes = [],
  initialFuncionarios = [],
} = {}) {
  const [clientes, setClientes] = useState(initialClientes);
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios);
  const [searchTerm, setSearchTerm] = useState('');
  const [responsavelFilter, setResponsavelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(
    () => initialClientes.length === 0
  );

  useEffect(() => {
    let isMounted = true;
    if (initialClientes.length === 0) {
      listarClientes()
        .then((dados) => {
          if (isMounted && Array.isArray(dados)) {
            setClientes(dados);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    if (initialFuncionarios.length === 0) {
      listarFuncionarios()
        .then((dados) => {
          if (isMounted && Array.isArray(dados)) {
            setFuncionarios(dados);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [initialClientes.length, initialFuncionarios.length]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage('');
    }, 4000);
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase();
        const nomeMatch = c.nome?.toLowerCase().includes(termo);
        const emailMatch = c.email?.toLowerCase().includes(termo);
        const doc = c.cpf || c.cnpj || c.documento || '';
        const termoDigits = termo.replace(/\D/g, '');
        const docDigits = doc.replace(/\D/g, '');
        const docMatch =
          (termoDigits.length > 0 && docDigits.includes(termoDigits)) ||
          (doc.length > 0 && doc.toLowerCase().includes(termo));

        if (!nomeMatch && !emailMatch && !docMatch) {
          return false;
        }
      }

      if (responsavelFilter) {
        const respIdNum = Number(responsavelFilter);
        const cRespId = Number(c.responsavel_id);

        if (respIdNum && cRespId) {
          if (cRespId !== respIdNum) return false;
        } else {
          const func = funcionarios.find(
            (f) =>
              String(f.funcionario_id || f.id) === String(responsavelFilter)
          );
          const funcNome = func ? func.nome.toLowerCase() : '';
          const cRespNome = (
            c.responsavel_nome ||
            (typeof c.responsavel === 'string'
              ? c.responsavel
              : c.responsavel?.nome) ||
            ''
          ).toLowerCase();

          if (!funcNome || !cRespNome.includes(funcNome)) {
            if (cRespId !== respIdNum) return false;
          }
        }
      }

      if (statusFilter) {
        const statusIdNum = Number(statusFilter);
        const cEtapaId = Number(c.etapa_id || c.status_id);
        if (cEtapaId !== statusIdNum) {
          return false;
        }
      }

      return true;
    });
  }, [clientes, searchTerm, responsavelFilter, statusFilter, funcionarios]);

  const handleCreateClient = async (dados) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      const criado = await criarCliente(dados);
      const clienteComDados = {
        ...dados,
        ...criado,
        cpf: criado?.cpf || dados.cpf || null,
        documento: criado?.documento || dados.documento || dados.cpf || null,
      };
      setClientes((prev) => [clienteComDados, ...prev]);
      setIsAddOpen(false);
      showFeedback('Cliente cadastrado com sucesso!');
      return clienteComDados;
    } catch (err) {
      const msg =
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Failed to fetch')
          ? 'Erro de conexão com o servidor. Tente novamente em instantes.'
          : err?.message || 'Erro ao cadastrar cliente.';
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateClient = async (id, dados) => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      const atualizado = await atualizarCliente(id, dados);
      setClientes((prev) =>
        prev.map((c) =>
          (c.cliente_id || c.id) === id
            ? {
                ...c,
                ...dados,
                ...atualizado,
                cpf: atualizado?.cpf || dados.cpf || c.cpf || null,
                documento:
                  atualizado?.documento ||
                  dados.documento ||
                  dados.cpf ||
                  c.documento ||
                  null,
              }
            : c
        )
      );
      setIsEditOpen(false);
      setEditingClient(null);
      showFeedback('Cliente atualizado com sucesso!');
      return atualizado;
    } catch (err) {
      const msg =
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Failed to fetch')
          ? 'Erro de conexão com o servidor. Tente novamente em instantes.'
          : err?.message || 'Erro ao atualizar cliente.';
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (id) => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      await excluirCliente(id);
      setClientes((prev) => prev.filter((c) => (c.cliente_id || c.id) !== id));
      setIsDeleteOpen(false);
      setDeletingClient(null);
      showFeedback('Cliente excluído com sucesso!');
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao excluir cliente.');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAdd = () => setIsAddOpen(true);
  const handleCloseAdd = () => setIsAddOpen(false);

  const handleOpenDetails = (client) => {
    setViewingClient(client);
    setIsDetailsOpen(true);
  };
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setViewingClient(null);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setIsEditOpen(true);
  };
  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingClient(null);
  };

  const handleOpenDelete = (client) => {
    setDeletingClient(client);
    setIsDeleteOpen(true);
  };
  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setDeletingClient(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setResponsavelFilter('');
    setStatusFilter('');
  };

  return {
    clientes,
    setClientes,
    funcionarios,
    setFuncionarios,
    searchTerm,
    setSearchTerm,
    responsavelFilter,
    setResponsavelFilter,
    statusFilter,
    setStatusFilter,
    filteredClientes,
    isAddOpen,
    handleOpenAdd,
    handleCloseAdd,
    isDetailsOpen,
    viewingClient,
    handleOpenDetails,
    handleCloseDetails,
    isEditOpen,
    editingClient,
    handleOpenEdit,
    handleCloseEdit,
    isDeleteOpen,
    deletingClient,
    handleOpenDelete,
    handleCloseDelete,
    handleCreateClient,
    handleUpdateClient,
    handleDeleteClient,
    handleClearFilters,
    isLoading,
    isSaving,
    isDeleting,
    feedbackMessage,
    setFeedbackMessage,
    errorMessage,
    setErrorMessage,
  };
}
