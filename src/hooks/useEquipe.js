import { useState } from 'react';
import {
  criarFuncionario,
  excluirFuncionario,
  mudarAcessoFuncionario,
} from '@/services/funcionarios';
import { toTeamMember } from '@/utils/funcionario';

export function useEquipe(initialData) {
  const [members, setMembers] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [accessMember, setAccessMember] = useState(null);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  const [accessError, setAccessError] = useState('');

  const handleCreateUser = async (dados) => {
    const funcionario = await criarFuncionario(dados);
    const newMember = toTeamMember(funcionario);
    setMembers((current) => [...current, newMember]);
    return funcionario;
  };

  const handleOpenDeleteModal = (member) => {
    setSelectedMember(member);
    setDeleteError('');
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) setSelectedMember(null);
  };

  const handleDeleteUser = async () => {
    if (!selectedMember) return;

    setDeleteError('');
    setIsDeleting(true);
    try {
      await excluirFuncionario(selectedMember.funcionario_id);
      setMembers((current) =>
        current.filter(
          (currentMember) =>
            currentMember.funcionario_id !== selectedMember.funcionario_id
        )
      );
      setSelectedMember(null);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAccessModal = (member) => {
    setAccessMember(member);
    setAccessError('');
  };

  const handleCloseAccessModal = () => {
    if (!isUpdatingAccess) setAccessMember(null);
  };

  const handleChangeAccess = async () => {
    if (!accessMember) return;

    setAccessError('');
    setIsUpdatingAccess(true);
    try {
      const funcionario = await mudarAcessoFuncionario(
        accessMember.funcionario_id
      );
      const updatedMember = toTeamMember(funcionario);
      setMembers((current) =>
        current.map((member) =>
          member.funcionario_id === updatedMember.funcionario_id
            ? updatedMember
            : member
        )
      );
      setAccessMember(null);
    } catch (error) {
      setAccessError(error.message);
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  return {
    members,
    isModalOpen,
    selectedMember,
    isDeleting,
    deleteError,
    accessMember,
    isUpdatingAccess,
    accessError,
    totalUsers: members.length,
    activeUsers: members.filter((member) => member.status === 'Ativo').length,
    pendingUsers: members.filter((member) => member.status === 'Pendente')
      .length,
    setIsModalOpen,
    handleCreateUser,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteUser,
    handleOpenAccessModal,
    handleCloseAccessModal,
    handleChangeAccess,
  };
}
