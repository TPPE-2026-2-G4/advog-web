import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  default: ({ members, onDelete, onChangeAccess }) => (
    <div data-testid="team-table">
      <span>{members.length} membros</span>
      <button type="button" onClick={() => onDelete(members[0])}>
        Excluir primeiro
      </button>
      <button type="button" onClick={() => onChangeAccess(members[0])}>
        Alterar acesso primeiro
      </button>
    </div>
  ),
}));

vi.mock('@/components/ui/rolesTable/rolesTable', () => ({
  default: () => <div data-testid="roles-table">Cargos</div>,
}));

vi.mock('@/components/ui/addUserModal/addUserModal', () => ({
  default: ({ isOpen, onClose, onCreated }) => (
    <div data-testid="add-modal">
      <span>{String(isOpen)}</span>
      <button type="button" onClick={onClose}>
        Fechar adicionar
      </button>
      <button type="button" onClick={() => onCreated({ nome: 'Novo' })}>
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

const member = {
  funcionario_id: 1,
  nome_func: 'Maria Silva',
  status: 'Ativo',
};

const createHookState = (overrides = {}) => ({
  members: [member],
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
  ...overrides,
});

describe('EquipeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título, indicadores, tabela e referência de cargos', () => {
    const hookState = createHookState();
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[member]} />);

    expect(
      screen.getByRole('heading', { name: 'Gestão de Usuários e Permissões' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Controle de acesso baseado em cargos (RBAC)')
    ).toBeInTheDocument();
    expect(screen.getByTestId('team-table')).toBeInTheDocument();
    expect(screen.getByTestId('roles-table')).toBeInTheDocument();
    expect(screen.getAllByTestId('stat-card')).toHaveLength(3);
    expect(useEquipe).toHaveBeenCalledWith([member]);
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
    fireEvent.click(screen.getByRole('button', { name: 'Fechar adicionar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar teste' }));
    expect(hookState.setIsModalOpen).toHaveBeenCalledWith(false);
    expect(hookState.handleCreateUser).toHaveBeenCalledWith({ nome: 'Novo' });
  });

  it('encaminha os callbacks de exclusão e alteração de acesso para a tabela', () => {
    const hookState = createHookState();
    useEquipe.mockReturnValue(hookState);

    render(<EquipeClient initialData={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir primeiro' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Alterar acesso primeiro' })
    );

    expect(hookState.handleOpenDeleteModal).toHaveBeenCalledWith(member);
    expect(hookState.handleOpenAccessModal).toHaveBeenCalledWith(member);
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
});
