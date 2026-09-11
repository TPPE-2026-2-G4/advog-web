'use client';

import { Plus, Users, UserCheck, Clock } from 'lucide-react';
import StatCard from '@/components/ui/StatCard/StatCard';
import TeamTable from '@/components/ui/TeamTable/TeamTable';
import RoleTables from '@/components/ui/RolesTable/RolesTable';
import AddUserModal from '@/components/ui/AddUserModal/AddUserModal';
import DeleteUserModal from '@/components/ui/DeleteUserModal/DeleteUserModal';
import AccessStatusModal from '@/components/ui/AccessStatusModal/AccessStatusModal';
import { useEquipe } from '@/hooks/useEquipe';
import styles from './equipe.module.css';

export default function EquipeClient({ initialData }) {
  const {
    members,
    isModalOpen,
    selectedMember,
    isDeleting,
    deleteError,
    totalUsers,
    activeUsers,
    pendingUsers,
    setIsModalOpen,
    handleCreateUser,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeleteUser,
    accessMember,
    isUpdatingAccess,
    accessError,
    handleOpenAccessModal,
    handleCloseAccessModal,
    handleChangeAccess,
  } = useEquipe(initialData);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Gestão de Usuários e Permissões</h1>
          <p className={styles.subtitle}>
            Controle de acesso baseado em cargos (RBAC)
          </p>
        </div>

        <button
          className={styles.addButton}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} />
          Adicionar Usuário
        </button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Total de Usuários"
          value={totalUsers}
          icon={Users}
          iconColor="#C1A077"
        />
        <StatCard
          title="Usuários Ativos"
          value={activeUsers}
          icon={UserCheck}
          iconColor="#166534"
          valueColor="#166534"
        />
        <StatCard
          title="Usuários Pendentes"
          value={pendingUsers}
          icon={Clock}
          iconColor="#A16207"
          valueColor="#A16207"
        />
      </div>

      <TeamTable
        members={members}
        onDelete={handleOpenDeleteModal}
        onChangeAccess={handleOpenAccessModal}
      />

      <RoleTables />

      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreateUser}
      />

      <DeleteUserModal
        member={selectedMember}
        isOpen={Boolean(selectedMember)}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteUser}
      />

      <AccessStatusModal
        member={accessMember}
        isOpen={Boolean(accessMember)}
        isUpdating={isUpdatingAccess}
        error={accessError}
        onClose={handleCloseAccessModal}
        onConfirm={handleChangeAccess}
      />
    </div>
  );
}
