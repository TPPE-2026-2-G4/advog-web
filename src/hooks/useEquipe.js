import { useState } from 'react';
import {
  criarFuncionario,
  excluirFuncionario,
  mudarAcessoFuncionario,
} from '@/services/funcionarios';
import { atualizarCargo, criarCargo, excluirCargo } from '@/services/cargos';
import { getInitials, toTeamMember } from '@/utils/funcionario';

const cloneRoles = (roles) =>
  roles.map((role) => ({
    ...role,
    ...(role.permissao && { permissao: { ...role.permissao } }),
  }));

const normalizeRoleName = (roleName = '') =>
  roleName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const isAdministrator = (member, roles) => {
  const role = roles.find(
    (currentRole) => String(currentRole.cargo_id) === String(member?.cargo_id)
  );
  const roleName = normalizeRoleName(role?.nome_cargo ?? member?.cargo);

  return roleName === 'admin' || roleName === 'administrador';
};

export function useEquipe(initialData, initialRoles = []) {
  const [members, setMembers] = useState(initialData);
  const [roles, setRoles] = useState(() => cloneRoles(initialRoles));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [accessMember, setAccessMember] = useState(null);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [permissionsRole, setPermissionsRole] = useState(null);
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [deleteRoleError, setDeleteRoleError] = useState('');

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
      const receivedMember = toTeamMember(funcionario);
      const updatedMember = {
        ...accessMember,
        status: receivedMember.status,
      };
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

  const handleOpenEditModal = (member) => {
    setEditingMember(member);
  };

  const handleCloseEditModal = () => {
    setEditingMember(null);
  };

  const handleUpdateUser = ({ nome, email, telefone, cargo }) => {
    if (!editingMember) return;

    const selectedRole = roles.find((role) => role.cargo_id === cargo);
    const updatedMember = {
      ...editingMember,
      nome_func: nome.trim(),
      email_func: email.trim(),
      telefone: telefone.trim(),
      cargo_id: selectedRole?.cargo_id ?? cargo,
      cargo: selectedRole?.nome_cargo ?? editingMember.cargo,
      initials: getInitials(nome),
    };

    setMembers((current) =>
      current.map((member) =>
        member.funcionario_id === editingMember.funcionario_id
          ? updatedMember
          : member
      )
    );

    return updatedMember;
  };

  const handleOpenPermissionsModal = (role) => {
    setPermissionsRole(role);
  };

  const handleClosePermissionsModal = () => {
    setPermissionsRole(null);
  };

  const handleUpdateRolePermissions = async ({ cargo_id, permissao }) => {
    const updatedRole = await atualizarCargo(cargo_id, { permissao });

    setRoles((current) =>
      current.map((role) =>
        String(role.cargo_id) === String(updatedRole.cargo_id)
          ? updatedRole
          : role
      )
    );

    return updatedRole;
  };

  const handleCreateRole = async ({ nome_cargo, descricao, permissao }) => {
    const roleName = nome_cargo.trim();
    const duplicatedRole = roles.some(
      (role) =>
        role.nome_cargo.toLocaleLowerCase('pt-BR') ===
        roleName.toLocaleLowerCase('pt-BR')
    );

    if (!roleName) {
      throw new Error('Informe o nome do cargo.');
    }

    if (duplicatedRole) {
      throw new Error('Já existe um cargo com esse nome.');
    }

    const cargo = await criarCargo({
      nome_cargo: roleName,
      descricao: descricao?.trim() || 'Cargo personalizado.',
      permissao,
    });

    setRoles((current) => [...current, cargo]);
    return cargo;
  };

  const handleOpenDeleteRoleModal = (role) => {
    setRoleToDelete(role);
    setDeleteRoleError('');
  };

  const handleCloseDeleteRoleModal = () => {
    if (!isDeletingRole) setRoleToDelete(null);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setDeleteRoleError('');
    setIsDeletingRole(true);

    try {
      await excluirCargo(roleToDelete.cargo_id);
      setRoles((current) =>
        current.filter(
          (role) => String(role.cargo_id) !== String(roleToDelete.cargo_id)
        )
      );
      setRoleToDelete(null);
    } catch (error) {
      setDeleteRoleError(error.message);
    } finally {
      setIsDeletingRole(false);
    }
  };

  const adminCount = members.filter((member) =>
    isAdministrator(member, roles)
  ).length;

  return {
    members,
    roles,
    isModalOpen,
    selectedMember,
    isDeleting,
    deleteError,
    accessMember,
    isUpdatingAccess,
    accessError,
    editingMember,
    permissionsRole,
    isNewRoleModalOpen,
    roleToDelete,
    isDeletingRole,
    deleteRoleError,
    isEditingOnlyAdmin:
      isAdministrator(editingMember, roles) && adminCount === 1,
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
    handleOpenEditModal,
    handleCloseEditModal,
    handleUpdateUser,
    handleOpenPermissionsModal,
    handleClosePermissionsModal,
    handleUpdateRolePermissions,
    setIsNewRoleModalOpen,
    handleCreateRole,
    handleOpenDeleteRoleModal,
    handleCloseDeleteRoleModal,
    handleDeleteRole,
  };
}
