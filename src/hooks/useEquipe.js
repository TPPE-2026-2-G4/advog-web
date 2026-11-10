import { useState } from 'react';
import {
  criarFuncionario,
  excluirFuncionario,
  mudarAcessoFuncionario,
  mudarCargoFuncionario,
} from '@/services/funcionarios';
import { atualizarCargo, criarCargo, excluirCargo } from '@/services/cargos';
import {
  isAdministratorAccount,
  isAdministratorRole,
  normalizeRoleName,
  toTeamMember,
} from '@/utils/funcionario';

const cloneRoles = (roles = []) =>
  roles.map((role) => ({
    ...role,
    ...(role.permissao && { permissao: { ...role.permissao } }),
  }));

export function useEquipe(initialData = [], initialRoles = []) {
  const [members, setMembers] = useState(() =>
    (initialData || []).filter(
      (member) => !isAdministratorAccount(member, initialRoles)
    )
  );
  const [roles, setRoles] = useState(() =>
    cloneRoles(initialRoles).filter((role) => !isAdministratorRole(role))
  );
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
    if (!isAdministratorAccount(newMember, initialRoles)) {
      setMembers((current) => [...current, newMember]);
    }
    return funcionario;
  };

  const handleOpenDeleteModal = (member) => {
    if (isAdministratorAccount(member, initialRoles)) return;
    setSelectedMember(member);
    setDeleteError('');
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) setSelectedMember(null);
  };

  const handleDeleteUser = async () => {
    if (
      !selectedMember ||
      isAdministratorAccount(selectedMember, initialRoles)
    ) {
      return;
    }

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
    if (isAdministratorAccount(member, initialRoles)) return;
    setAccessMember(member);
    setAccessError('');
  };

  const handleCloseAccessModal = () => {
    if (!isUpdatingAccess) setAccessMember(null);
  };

  const handleChangeAccess = async () => {
    if (!accessMember || isAdministratorAccount(accessMember, initialRoles)) {
      return;
    }

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
    if (isAdministratorAccount(member, initialRoles)) return;
    setEditingMember(member);
  };

  const handleCloseEditModal = () => {
    setEditingMember(null);
  };

  const handleUpdateUser = async ({ cargo }) => {
    if (!editingMember || isAdministratorAccount(editingMember, initialRoles)) {
      return;
    }

    const funcionario = await mudarCargoFuncionario(
      editingMember.funcionario_id,
      cargo
    );
    const updatedMember = toTeamMember(funcionario);

    setMembers((current) =>
      current.map((member) =>
        member.funcionario_id === editingMember.funcionario_id
          ? { ...member, ...updatedMember }
          : member
      )
    );

    return funcionario;
  };

  const handleOpenPermissionsModal = (role) => {
    if (isAdministratorRole(role)) return;
    setPermissionsRole(role);
  };

  const handleClosePermissionsModal = () => {
    setPermissionsRole(null);
  };

  const handleUpdateRolePermissions = async ({ cargo_id, permissao }) => {
    const isTargetAdmin =
      isAdministratorRole(
        initialRoles.find((r) => String(r.cargo_id) === String(cargo_id))
      ) ||
      isAdministratorRole(
        roles.find((r) => String(r.cargo_id) === String(cargo_id))
      );

    if (isTargetAdmin) {
      throw new Error(
        'Não é possível editar as permissões do cargo de administrador.'
      );
    }

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
    if (!roleName) {
      throw new Error('Informe o nome do cargo.');
    }

    if (isAdministratorRole(roleName)) {
      throw new Error('Já existe um cargo com esse nome.');
    }

    const duplicatedRole = roles.some(
      (role) =>
        normalizeRoleName(role.nome_cargo) === normalizeRoleName(roleName)
    );

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
    if (isAdministratorRole(role)) return;
    setRoleToDelete(role);
    setDeleteRoleError('');
  };

  const handleCloseDeleteRoleModal = () => {
    if (!isDeletingRole) setRoleToDelete(null);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete || isAdministratorRole(roleToDelete)) return;

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
    isEditingOnlyAdmin: false,
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
