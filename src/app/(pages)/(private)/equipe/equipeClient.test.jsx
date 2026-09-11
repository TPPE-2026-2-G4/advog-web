import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createEmptyPermission } from '@/constants/permissions';
import EquipeClient from './equipeClient';
import { useEquipe } from '@/hooks/useEquipe';

vi.mock('@/hooks/useEquipe', () => ({
  useEquipe: vi.fn(),
}));

vi.mock('@/components/ui/statCard/statCard', () => ({
  default: ({ title, value }) => (
    <div data-testid="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  ),
}));

vi.mock('@/components/ui/teamTable/teamTable', () => ({
  default: ({ members, roles, onDelete, onChangeAccess, onEdit }) => (
    <div data-testid="team-table">
      <span>{members.length} membros</span>
      <span>{roles.length} cargos disponíveis</span>
      <button type="button" onClick={() => onDelete(members[0])}>
        Excluir primeiro
      </button>
      <button type="button" onClick={() => onChangeAccess(members[0])}>
        Alterar acesso primeiro
      </button>
      <button type="button" onClick={() => onEdit(members[0])}>
        Editar primeiro
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/rolesTable/rolesTable', () => ({
  default: ({ roles, onCreateRole, onEditPermissions, onDeleteRole }) => (
    <div data-testid="roles-table">
      <span>{roles.length} cargos</span>
      <button type="button" onClick={onCreateRole}>
        Criar cargo teste
      </button>
      <button type="button" onClick={() => onEditPermissions(roles[0])}>
        Editar permissões teste
      </button>
      <button type="button" onClick={() => onDeleteRole(roles[0])}>
        Excluir cargo teste
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/addUserModal/addUserModal', () => ({
  default: ({ isOpen, roles, onClose, onCreated }) => (
    <div data-testid="add-modal">
      <span>{String(isOpen)}</span>
      <span>{roles.length} cargos no cadastro</span>
      <button type="button" onClick={onClose}>
        Fechar adicionar
      </button>
      <button
        type="button"
        onClick={() =>
          onCreated({
            nome: 'Novo',
            email: 'novo@teste.local',
            cargo_id: roles[0].cargo_id,
          })
        }
      >
        Criar teste
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/deleteUserModal/deleteUserModal', () => ({
  default: ({ member, isOpen, onClose, onConfirm }) => (
    <div data-testid="delete-modal">
      <span>{String(isOpen)}</span>
      <span>{member?.nome_func || 'sem membro'}</span>
      <button type="button" onClick={onClose}>
        Fechar excluir
      </button>
      <button type="button" onClick={onConfirm}>
        Confirmar excluir
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/accessStatusModal/accessStatusModal', () => ({
  default: ({ member, isOpen, onClose, onConfirm }) => (
    <div data-testid="access-modal">
      <span>{String(isOpen)}</span>
      <span>{member?.nome_func || 'sem membro'}</span>
      <button type="button" onClick={onClose}>
        Fechar acesso
      </button>
      <button type="button" onClick={onConfirm}>
        Confirmar acesso
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/editUserModal/editUserModal', () => ({
  default: ({ member, isOpen, onClose, onSave }) => (
    <div data-testid="edit-user-modal">
      <span>{String(isOpen)}</span>
      <span>{member?.nome_func || 'sem membro'}</span>
      <button type="button" onClick={onClose}>
        Fechar edição
      </button>
      <button
        type="button"
        onClick={() =>
          onSave({
            nome: 'Nome Editado',
            email: 'editado@teste.local',
            cargo: 'advogado',
          })
        }
      >
        Salvar edição
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/rolePermissionsModal/rolePermissionsModal', () => ({
  default: ({ role, isOpen, onClose, onSave }) => (
    <div data-testid="permissions-modal">
      <span>{String(isOpen)}</span>
      <span>{role?.nome_cargo || 'sem cargo'}</span>
      <button type="button" onClick={onClose}>
        Fechar permissões
      </button>
      <button
        type="button"
        onClick={() =>
          onSave({
            cargo_id: role.cargo_id,
            permissao: {
              ...createEmptyPermission(),
              visualizar_equipe: true,
            },
          })
        }
      >
        Salvar permissões
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/newRoleModal/newRoleModal', () => ({
  default: ({ isOpen, onClose, onCreate }) => (
    <div data-testid="new-role-modal">
      <span>{String(isOpen)}</span>
      <button type="button" onClick={onClose}>
        Fechar novo cargo
      </button>
      <button
        type="button"
        onClick={() =>
          onCreate({
            nome_cargo: 'Paralegal',
            descricao: '',
            permissao: createEmptyPermission(),
          })
        }
      >
        Criar novo cargo
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/deleteRoleModal/deleteRoleModal', () => ({
  default: ({ role, isOpen, isDeleting, error, onClose, onConfirm }) => (
    <div data-testid="delete-role-modal">
      <span>{String(isOpen)}</span>
      <span>{role?.nome_cargo || 'sem cargo'}</span>
      <span>{String(isDeleting)}</span>
      <span>{error}</span>
      <button type="button" onClick={onClose}>
        Fechar exclusão de cargo
      </button>
      <button type="button" onClick={onConfirm}>
        Confirmar exclusão de cargo
      </button>
    </div>
  ),
}));

const member = {
  funcionario_id: 1,
  nome_func: 'Maria Silva',
  status: 'Ativo',
};

const role = {
  cargo_id: 1,
  nome_cargo: 'Administrador',
  permissao: {
    ...createEmptyPermission(),
    visualizar_equipe: true,
  },
};

const createHookState = (overrides = {}) => ({
  members: [member],
  roles: [role],
  isModalOpen: false,
  selectedMember: null,
  isDeleting: false,
  deleteError: '',
  totalUsers: 1,
  activeUsers: 1,
  pendingUsers: 0,
  setIsModalOpen: vi.fn(),
  handleCreateUser: vi.fn(),
  handleOpenDeleteModal: vi.fn(),
  handleCloseDeleteModal: vi.fn(),
  handleDeleteUser: vi.fn(),
  accessMember: null,
  isUpdatingAccess: false,
  accessError: '',
  handleOpenAccessModal: vi.fn(),
  handleCloseAccessModal: vi.fn(),
  handleChangeAccess: vi.fn(),
  editingMember: null,
  isEditingOnlyAdmin: false,
  handleOpenEditModal: vi.fn(),
  handleCloseEditModal: vi.fn(),
  handleUpdateUser: vi.fn(),
  permissionsRole: null,
  handleOpenPermissionsModal: vi.fn(),
  handleClosePermissionsModal: vi.fn(),
  handleUpdateRolePermissions: vi.fn(),
  isNewRoleModalOpen: false,
  setIsNewRoleModalOpen: vi.fn(),
  handleCreateRole: vi.fn(),
  roleToDelete: null,
  isDeletingRole: false,
  deleteRoleError: '',
  handleOpenDeleteRoleModal: vi.fn(),
  handleCloseDeleteRoleModal: vi.fn(),
  handleDeleteRole: vi.fn(),
  ...overrides,
});

describe('EquipeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título, indicadores, tabela e referência de cargos', () => {
    const hookState = createHookState();
    useEquipe.mockReturnValue(hookState);
    const initialRoles = [role];

    render(<EquipeClient initialData={[member]} initialRoles={initialRoles} />);

    expect(
      screen.getByRole('heading', { name: 'Gestão de Usuários e Permissões' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Controle de acesso baseado em cargos (RBAC)')
    ).toBeInTheDocument();
    expect(screen.getByTestId('team-table')).toBeInTheDocument();
    expect(screen.getByTestId('roles-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('stat-card')).toHaveLength(3);
    expect(useEquipe).toHaveBeenCalledWith([member], initialRoles);
    expect(screen.getByText('1 cargos disponíveis')).toBeInTheDocument();
  });

  it('passa os contadores corretos para os cards', () => {
    useEquipe.mockReturnValue(
      createHookState({ totalUsers: 4, activeUsers: 2, pendingUsers: 1 })
    );

    render(<EquipeClient initialData={[]} />);

    const cards = screen.getAllByTestId('stat-card');
    expect(cards[0]).toHaveTextContent('4');
    expect(cards[1]).toHaveTextContent('2');
    expect(cards[2]).toHaveTextContent('1');
  });

  it('abre o modal de adicionar ao clicar no botão', () => {
    const setIsModalOpen = vi.fn();
    useEquipe.mockReturnValue(createHookState({ setIsModalOpen }));

    render(<EquipeClient initialData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Usuário/i }));

    expect(setIsModalOpen).toHaveBeenCalledWith(true);
  });

  it('renderiza o modal de adicionar aberto e encaminha seus callbacks', () => {
    const hookState = createHookState({ isModalOpen: true });
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);

    expect(screen.getByTestId('add-modal')).toHaveTextContent('true');
    expect(screen.getByTestId('add-modal')).toHaveTextContent(
      '1 cargos no cadastro'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fechar adicionar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar teste' }));
    expect(hookState.setIsModalOpen).toHaveBeenCalledWith(false);
    expect(hookState.handleCreateUser).toHaveBeenCalledWith({
      nome: 'Novo',
      email: 'novo@teste.local',
      cargo_id: 1,
    });
  });

  it('encaminha os callbacks de usuário para a tabela', () => {
    const hookState = createHookState();
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir primeiro' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Alterar acesso primeiro' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar primeiro' }));

    expect(hookState.handleOpenDeleteModal).toHaveBeenCalledWith(member);
    expect(hookState.handleOpenAccessModal).toHaveBeenCalledWith(member);
    expect(hookState.handleOpenEditModal).toHaveBeenCalledWith(member);
  });

  it('encaminha as ações da referência de cargos', () => {
    const hookState = createHookState();
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Criar cargo teste' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Editar permissões teste' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Excluir cargo teste' })
    );

    expect(hookState.setIsNewRoleModalOpen).toHaveBeenCalledWith(true);
    expect(hookState.handleOpenPermissionsModal).toHaveBeenCalledWith(role);
    expect(hookState.handleOpenDeleteRoleModal).toHaveBeenCalledWith(role);
  });

  it('passa os estados e callbacks aos três modais da US03', () => {
    const hookState = createHookState({
      editingMember: member,
      permissionsRole: role,
      isNewRoleModalOpen: true,
    });
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);

    expect(screen.getByTestId('edit-user-modal')).toHaveTextContent('true');
    expect(screen.getByTestId('permissions-modal')).toHaveTextContent('true');
    expect(screen.getByTestId('new-role-modal')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar permissões' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar novo cargo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar edição' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar permissões' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fechar novo cargo' }));

    expect(hookState.handleUpdateUser).toHaveBeenCalledOnce();
    expect(hookState.handleUpdateRolePermissions).toHaveBeenCalledOnce();
    expect(hookState.handleCreateRole).toHaveBeenCalledOnce();
    expect(hookState.handleCloseEditModal).toHaveBeenCalledOnce();
    expect(hookState.handleClosePermissionsModal).toHaveBeenCalledOnce();
    expect(hookState.setIsNewRoleModalOpen).toHaveBeenCalledWith(false);
  });

  it('passa o membro e o estado de exclusão ao modal correspondente', () => {
    const hookState = createHookState({
      selectedMember: member,
      isDeleting: true,
      deleteError: 'Falha ao excluir',
    });
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);

    expect(screen.getByTestId('delete-modal')).toHaveTextContent('true');
    expect(screen.getByTestId('delete-modal')).toHaveTextContent('Maria Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar excluir' }));
    expect(hookState.handleDeleteUser).toHaveBeenCalledOnce();
  });

  it('passa o membro e o estado de acesso ao modal correspondente', () => {
    const hookState = createHookState({
      accessMember: member,
      isUpdatingAccess: true,
      accessError: 'Falha ao atualizar',
    });
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);

    expect(screen.getByTestId('access-modal')).toHaveTextContent('true');
    expect(screen.getByTestId('access-modal')).toHaveTextContent('Maria Silva');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar acesso' }));
    expect(hookState.handleChangeAccess).toHaveBeenCalledOnce();
  });

  it('passa o cargo, carregamento, erro e callbacks ao modal de exclusão', () => {
    const hookState = createHookState({
      roleToDelete: role,
      isDeletingRole: true,
      deleteRoleError: 'Cargo associado a funcionários',
    });
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);

    const modal = screen.getByTestId('delete-role-modal');
    expect(modal).toHaveTextContent('Administrador');
    expect(modal).toHaveTextContent('true');
    expect(modal).toHaveTextContent('Cargo associado a funcionários');
    fireEvent.click(
      screen.getByRole('button', { name: 'Fechar exclusão de cargo' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar exclusão de cargo' })
    );

    expect(hookState.handleCloseDeleteRoleModal).toHaveBeenCalledOnce();
    expect(hookState.handleDeleteRole).toHaveBeenCalledOnce();
  });
});
