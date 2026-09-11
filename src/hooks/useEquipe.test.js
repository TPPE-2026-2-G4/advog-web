import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  criarFuncionario,
  excluirFuncionario,
  mudarAcessoFuncionario,
} from '@/services/funcionarios';
import { atualizarCargo, criarCargo, excluirCargo } from '@/services/cargos';
import { createEmptyPermission } from '@/constants/permissions';
import { getInitials, toTeamMember } from '@/utils/funcionario';
import { useEquipe } from './useEquipe';

vi.mock('@/services/funcionarios', () => ({
  criarFuncionario: vi.fn(),
  excluirFuncionario: vi.fn(),
  mudarAcessoFuncionario: vi.fn(),
}));

vi.mock('@/services/cargos', () => ({
  atualizarCargo: vi.fn(),
  criarCargo: vi.fn(),
  excluirCargo: vi.fn(),
}));

vi.mock('@/utils/funcionario', () => ({
  getInitials: vi.fn(),
  toTeamMember: vi.fn(),
}));

const createMember = (overrides = {}) => ({
  funcionario_id: 1,
  initials: 'MS',
  nome_func: 'Maria Silva',
  email_func: 'maria@teste.local',
  cargo: 'Analista',
  status: 'Ativo',
  ...overrides,
});

const createFuncionario = (overrides = {}) => ({
  funcionario_id: 2,
  nome: 'João Santos',
  email: 'joao@teste.local',
  status: 'Pendente',
  ...overrides,
});

const withAllowedPermissions = (...permissionNames) => ({
  ...createEmptyPermission(),
  ...Object.fromEntries(permissionNames.map((name) => [name, true])),
});

const initialRoles = [
  {
    cargo_id: 1,
    nome_cargo: 'Administrador',
    permissao: withAllowedPermissions(...Object.keys(createEmptyPermission())),
  },
  {
    cargo_id: 2,
    nome_cargo: 'Advogado',
    permissao: withAllowedPermissions(
      'visualizar_processos',
      'criar_processos'
    ),
  },
  {
    cargo_id: 3,
    nome_cargo: 'Estagiário',
    permissao: withAllowedPermissions('visualizar_processos'),
  },
];

describe('useEquipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInitials.mockImplementation((name) =>
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    );
    toTeamMember.mockImplementation((funcionario) => ({
      funcionario_id: funcionario.funcionario_id,
      initials: 'JS',
      nome_func: funcionario.nome,
      email_func: funcionario.email,
      cargo: 'Não informado',
      status: funcionario.status,
    }));
  });

  it('inicializa os membros e contadores com os dados fornecidos', () => {
    const initialData = [
      createMember({ funcionario_id: 1, status: 'Ativo' }),
      createMember({ funcionario_id: 2, status: 'Ativo' }),
      createMember({ funcionario_id: 3, status: 'Pendente' }),
      createMember({ funcionario_id: 4, status: 'Inativo' }),
    ];

    const { result } = renderHook(() => useEquipe(initialData, initialRoles));

    expect(result.current.members).toEqual(initialData);
    expect(result.current.totalUsers).toBe(4);
    expect(result.current.activeUsers).toBe(2);
    expect(result.current.pendingUsers).toBe(1);
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.selectedMember).toBeNull();
    expect(result.current.accessMember).toBeNull();
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.isUpdatingAccess).toBe(false);
    expect(result.current.deleteError).toBe('');
    expect(result.current.accessError).toBe('');
    expect(result.current.roles).toEqual(initialRoles);
    expect(result.current.editingMember).toBeNull();
    expect(result.current.permissionsRole).toBeNull();
    expect(result.current.isNewRoleModalOpen).toBe(false);
    expect(result.current.roleToDelete).toBeNull();
    expect(result.current.isDeletingRole).toBe(false);
    expect(result.current.deleteRoleError).toBe('');
  });

  it.each([
    ['Ativo', 1, 0],
    ['Inativo', 0, 0],
    ['Pendente', 0, 1],
  ])(
    'conta corretamente um membro com status %s',
    (status, expectedActive, expectedPending) => {
      const { result } = renderHook(() =>
        useEquipe([createMember({ status })])
      );

      expect(result.current.totalUsers).toBe(1);
      expect(result.current.activeUsers).toBe(expectedActive);
      expect(result.current.pendingUsers).toBe(expectedPending);
    }
  );

  it('atualiza apenas o membro selecionado ao alterar o acesso', async () => {
    const member = createMember({ status: 'Ativo' });
    const otherMember = createMember({
      funcionario_id: 2,
      nome_func: 'João Santos',
      status: 'Pendente',
    });
    const funcionario = createFuncionario({
      funcionario_id: member.funcionario_id,
      status: 'Inativo',
    });
    const updatedMember = { ...member, status: 'Inativo' };
    mudarAcessoFuncionario.mockResolvedValue(funcionario);
    toTeamMember.mockReturnValue(updatedMember);
    const { result } = renderHook(() =>
      useEquipe([member, otherMember], initialRoles)
    );

    act(() => result.current.handleOpenAccessModal(member));
    await act(async () => {
      await result.current.handleChangeAccess();
    });

    expect(result.current.members).toEqual([updatedMember, otherMember]);
  });

  it('abre e fecha o modal de criação', () => {
    const { result } = renderHook(() => useEquipe([]));

    act(() => result.current.setIsModalOpen(true));
    expect(result.current.isModalOpen).toBe(true);

    act(() => result.current.setIsModalOpen(false));
    expect(result.current.isModalOpen).toBe(false);
  });

  it('cria um membro e adiciona o resultado convertido à lista', async () => {
    const funcionario = createFuncionario();
    const newMember = createMember({
      funcionario_id: 2,
      nome_func: 'João Santos',
      email_func: 'joao@teste.local',
      status: 'Pendente',
    });
    criarFuncionario.mockResolvedValue(funcionario);
    toTeamMember.mockReturnValue(newMember);
    const { result } = renderHook(() => useEquipe([]));
    const dados = {
      nome: funcionario.nome,
      email: funcionario.email,
      cargo_id: 2,
    };

    await act(async () => {
      await result.current.handleCreateUser(dados);
    });

    expect(criarFuncionario).toHaveBeenCalledOnce();
    expect(criarFuncionario).toHaveBeenCalledWith(dados);
    expect(toTeamMember).toHaveBeenCalledWith(funcionario);
    expect(result.current.members).toEqual([newMember]);
  });

  it('propaga erros de criação sem alterar a lista', async () => {
    const error = new Error('E-mail já cadastrado');
    criarFuncionario.mockRejectedValue(error);
    const initialData = [createMember()];
    const { result } = renderHook(() => useEquipe(initialData));

    await expect(
      act(async () => {
        await result.current.handleCreateUser({
          nome: 'Maria Silva',
          email: 'maria@teste.local',
          cargo_id: 2,
        });
      })
    ).rejects.toThrow('E-mail já cadastrado');

    expect(result.current.members).toEqual(initialData);
  });

  it('seleciona um membro e limpa o erro ao abrir a exclusão', () => {
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenDeleteModal(member));

    expect(result.current.selectedMember).toEqual(member);
    expect(result.current.deleteError).toBe('');
  });

  it('fecha o modal de exclusão quando não há exclusão em andamento', () => {
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenDeleteModal(member));
    act(() => result.current.handleCloseDeleteModal());

    expect(result.current.selectedMember).toBeNull();
  });

  it('não faz nada ao confirmar a exclusão sem um membro selecionado', async () => {
    const { result } = renderHook(() => useEquipe([]));

    await act(async () => {
      await result.current.handleDeleteUser();
    });

    expect(excluirFuncionario).not.toHaveBeenCalled();
    expect(result.current.members).toEqual([]);
  });

  it('exclui o membro selecionado e fecha o modal de exclusão', async () => {
    const member = createMember();
    const otherMember = createMember({ funcionario_id: 2 });
    excluirFuncionario.mockResolvedValue(undefined);
    const { result } = renderHook(() => useEquipe([member, otherMember]));

    act(() => result.current.handleOpenDeleteModal(member));
    await act(async () => {
      await result.current.handleDeleteUser();
    });

    expect(excluirFuncionario).toHaveBeenCalledOnce();
    expect(excluirFuncionario).toHaveBeenCalledWith(member.funcionario_id);
    expect(result.current.members).toEqual([otherMember]);
    expect(result.current.selectedMember).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it('mantém o membro selecionado e expõe erros de exclusão', async () => {
    const member = createMember();
    excluirFuncionario.mockRejectedValue(
      new Error('Funcionário não encontrado')
    );
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenDeleteModal(member));
    await act(async () => {
      await result.current.handleDeleteUser();
    });

    expect(result.current.members).toEqual([member]);
    expect(result.current.selectedMember).toEqual(member);
    expect(result.current.deleteError).toBe('Funcionário não encontrado');
    expect(result.current.isDeleting).toBe(false);
  });

  it('seleciona um membro e limpa o erro ao abrir a alteração de acesso', () => {
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenAccessModal(member));

    expect(result.current.accessMember).toEqual(member);
    expect(result.current.accessError).toBe('');
  });

  it('fecha o modal de acesso quando não há atualização em andamento', () => {
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenAccessModal(member));
    act(() => result.current.handleCloseAccessModal());

    expect(result.current.accessMember).toBeNull();
  });

  it('não faz nada ao confirmar a alteração sem um membro selecionado', async () => {
    const { result } = renderHook(() => useEquipe([]));

    await act(async () => {
      await result.current.handleChangeAccess();
    });

    expect(mudarAcessoFuncionario).not.toHaveBeenCalled();
    expect(result.current.members).toEqual([]);
  });

  it.each([
    ['Ativo', 'Inativo'],
    ['Inativo', 'Ativo'],
  ])(
    'atualiza um membro de %s para %s após alterar o acesso',
    async (currentStatus, nextStatus) => {
      const member = createMember({ status: currentStatus });
      const funcionario = createFuncionario({
        funcionario_id: member.funcionario_id,
        status: nextStatus,
      });
      const updatedMember = { ...member, status: nextStatus };
      mudarAcessoFuncionario.mockResolvedValue(funcionario);
      toTeamMember.mockReturnValue(updatedMember);
      const { result } = renderHook(() => useEquipe([member]));

      act(() => result.current.handleOpenAccessModal(member));
      await act(async () => {
        await result.current.handleChangeAccess();
      });

      expect(mudarAcessoFuncionario).toHaveBeenCalledWith(
        member.funcionario_id
      );
      expect(toTeamMember).toHaveBeenCalledWith(funcionario);
      expect(result.current.members).toEqual([updatedMember]);
      expect(result.current.accessMember).toBeNull();
      expect(result.current.isUpdatingAccess).toBe(false);
    }
  );

  it('mantém o membro e expõe erros quando a atualização de acesso falha', async () => {
    const member = createMember({ status: 'Ativo' });
    mudarAcessoFuncionario.mockRejectedValue(
      new Error('Funcionário ainda não ativou a conta')
    );
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenAccessModal(member));
    await act(async () => {
      await result.current.handleChangeAccess();
    });

    expect(result.current.members).toEqual([member]);
    expect(result.current.accessMember).toEqual(member);
    expect(result.current.accessError).toBe(
      'Funcionário ainda não ativou a conta'
    );
    expect(result.current.isUpdatingAccess).toBe(false);
  });

  it('não fecha o modal de exclusão enquanto a exclusão está em andamento', async () => {
    let resolveDeletion;
    excluirFuncionario.mockReturnValue(
      new Promise((resolve) => {
        resolveDeletion = resolve;
      })
    );
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenDeleteModal(member));
    let deletionPromise;
    act(() => {
      deletionPromise = result.current.handleDeleteUser();
    });

    await waitFor(() => expect(result.current.isDeleting).toBe(true));
    act(() => result.current.handleCloseDeleteModal());
    expect(result.current.selectedMember).toEqual(member);

    await act(async () => {
      resolveDeletion();
      await deletionPromise;
    });
  });

  it('não fecha o modal de acesso enquanto a atualização está em andamento', async () => {
    let resolveUpdate;
    mudarAcessoFuncionario.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() => result.current.handleOpenAccessModal(member));
    let updatePromise;
    act(() => {
      updatePromise = result.current.handleChangeAccess();
    });

    await waitFor(() => expect(result.current.isUpdatingAccess).toBe(true));
    act(() => result.current.handleCloseAccessModal());
    expect(result.current.accessMember).toEqual(member);

    await act(async () => {
      resolveUpdate({ ...member, status: 'Inativo' });
      await updatePromise;
    });
  });

  it('abre, atualiza e fecha a edição de um membro', () => {
    const member = createMember({
      cargo_id: 3,
      cargo: 'Estagiário',
    });
    const otherMember = createMember({
      funcionario_id: 2,
      nome_func: 'Outro Usuário',
    });
    const { result } = renderHook(() =>
      useEquipe([member, otherMember], initialRoles)
    );

    act(() => result.current.handleOpenEditModal(member));
    expect(result.current.editingMember).toEqual(member);

    act(() =>
      result.current.handleUpdateUser({
        nome: '  Maria Souza  ',
        email: '  maria.souza@teste.local  ',
        telefone: ' (61) 99999-0000 ',
        cargo: 2,
      })
    );

    expect(result.current.members).toEqual([
      {
        ...member,
        initials: 'MS',
        nome_func: 'Maria Souza',
        email_func: 'maria.souza@teste.local',
        telefone: '(61) 99999-0000',
        cargo_id: 2,
        cargo: 'Advogado',
      },
      otherMember,
    ]);
    expect(getInitials).toHaveBeenCalledWith('  Maria Souza  ');

    act(() => result.current.handleCloseEditModal());
    expect(result.current.editingMember).toBeNull();
  });

  it('não altera membros quando não há uma edição selecionada', () => {
    const member = createMember();
    const { result } = renderHook(() => useEquipe([member]));

    act(() =>
      result.current.handleUpdateUser({
        nome: 'Outro nome',
        email: 'outro@teste.local',
        telefone: '',
        cargo: 'admin',
      })
    );

    expect(result.current.members).toEqual([member]);
  });

  it('protege a troca de cargo apenas do único administrador', () => {
    const admin = createMember({
      cargo_id: 1,
      cargo: 'Administrador',
    });
    const secondAdmin = createMember({
      funcionario_id: 2,
      cargo_id: 1,
      cargo: 'Administrador',
    });
    const { result } = renderHook(() => useEquipe([admin], initialRoles));

    act(() => result.current.handleOpenEditModal(admin));
    expect(result.current.isEditingOnlyAdmin).toBe(true);

    const { result: multipleAdminsResult } = renderHook(() =>
      useEquipe([admin, secondAdmin], initialRoles)
    );
    act(() => multipleAdminsResult.current.handleOpenEditModal(admin));
    expect(multipleAdminsResult.current.isEditingOnlyAdmin).toBe(false);
  });

  it('abre, persiste e fecha as permissões de um cargo', async () => {
    const { result } = renderHook(() => useEquipe([], initialRoles));
    const role = result.current.roles[1];
    const permission = withAllowedPermissions(
      'visualizar_processos',
      'visualizar_equipe'
    );
    const cargo = {
      cargo_id: role.cargo_id,
      nome_cargo: role.nome_cargo,
      descricao: role.descricao,
      permissao: permission,
    };
    atualizarCargo.mockResolvedValue(cargo);

    act(() => result.current.handleOpenPermissionsModal(role));
    expect(result.current.permissionsRole).toEqual(role);

    await act(async () => {
      await result.current.handleUpdateRolePermissions({
        cargo_id: role.cargo_id,
        permissao: permission,
      });
    });

    expect(atualizarCargo).toHaveBeenCalledWith(role.cargo_id, {
      permissao: permission,
    });
    expect(result.current.roles[1]).toEqual(cargo);

    act(() => result.current.handleClosePermissionsModal());
    expect(result.current.permissionsRole).toBeNull();
  });

  it('abre e fecha o modal de novo cargo', () => {
    const { result } = renderHook(() => useEquipe([]));

    act(() => result.current.setIsNewRoleModalOpen(true));
    expect(result.current.isNewRoleModalOpen).toBe(true);

    act(() => result.current.setIsNewRoleModalOpen(false));
    expect(result.current.isNewRoleModalOpen).toBe(false);
  });

  it('cria cargos pela API e usa o identificador retornado', async () => {
    const { result } = renderHook(() => useEquipe([], initialRoles));
    const permission = withAllowedPermissions('visualizar_processos');
    const cargo = {
      cargo_id: 17,
      nome_cargo: 'Sócio Sênior',
      descricao: 'Cargo personalizado.',
      permissao: permission,
    };
    criarCargo.mockResolvedValue(cargo);

    await act(async () => {
      await result.current.handleCreateRole({
        nome_cargo: '  Sócio Sênior  ',
        permissao: permission,
      });
    });

    expect(criarCargo).toHaveBeenCalledWith({
      nome_cargo: 'Sócio Sênior',
      descricao: 'Cargo personalizado.',
      permissao: permission,
    });
    expect(result.current.roles.at(-1)).toMatchObject({
      cargo_id: 17,
      nome_cargo: 'Sócio Sênior',
      permissao: permission,
    });
  });

  it('normaliza a descrição informada ao criar um cargo', async () => {
    const permission = createEmptyPermission();
    const cargo = {
      cargo_id: 18,
      nome_cargo: 'Paralegal',
      descricao: 'Apoio à equipe jurídica.',
      permissao: permission,
    };
    criarCargo.mockResolvedValue(cargo);
    const { result } = renderHook(() => useEquipe([], initialRoles));

    await act(async () => {
      await result.current.handleCreateRole({
        nome_cargo: 'Paralegal',
        descricao: '  Apoio à equipe jurídica.  ',
        permissao: permission,
      });
    });

    expect(criarCargo).toHaveBeenCalledWith({
      nome_cargo: 'Paralegal',
      descricao: 'Apoio à equipe jurídica.',
      permissao: permission,
    });
  });

  it('não faz nada ao confirmar a exclusão sem um cargo selecionado', async () => {
    const { result } = renderHook(() => useEquipe([], initialRoles));

    await act(async () => {
      await result.current.handleDeleteRole();
    });

    expect(excluirCargo).not.toHaveBeenCalled();
    expect(result.current.roles).toEqual(initialRoles);
  });

  it('exclui o cargo selecionado pela API e fecha o modal', async () => {
    excluirCargo.mockResolvedValue(initialRoles[2]);
    const { result } = renderHook(() => useEquipe([], initialRoles));

    act(() => result.current.handleOpenDeleteRoleModal(initialRoles[2]));
    await act(async () => {
      await result.current.handleDeleteRole();
    });

    expect(excluirCargo).toHaveBeenCalledOnce();
    expect(excluirCargo).toHaveBeenCalledWith(3);
    expect(result.current.roles).toEqual(initialRoles.slice(0, 2));
    expect(result.current.roleToDelete).toBeNull();
    expect(result.current.isDeletingRole).toBe(false);
  });

  it('mantém o cargo e mostra a regra do backend quando a exclusão falha', async () => {
    const message = 'Não é possível excluir um cargo associado a funcionários';
    excluirCargo.mockRejectedValue(new Error(message));
    const { result } = renderHook(() => useEquipe([], initialRoles));

    act(() => result.current.handleOpenDeleteRoleModal(initialRoles[1]));
    await act(async () => {
      await result.current.handleDeleteRole();
    });

    expect(result.current.roles).toEqual(initialRoles);
    expect(result.current.roleToDelete).toEqual(initialRoles[1]);
    expect(result.current.deleteRoleError).toBe(message);
    expect(result.current.isDeletingRole).toBe(false);
  });

  it('fecha o modal de cargo e limpa o erro ao abri-lo novamente', async () => {
    excluirCargo.mockRejectedValueOnce(new Error('Falha ao excluir'));
    const { result } = renderHook(() => useEquipe([], initialRoles));

    act(() => result.current.handleOpenDeleteRoleModal(initialRoles[0]));
    await act(async () => {
      await result.current.handleDeleteRole();
    });
    expect(result.current.deleteRoleError).toBe('Falha ao excluir');

    act(() => result.current.handleOpenDeleteRoleModal(initialRoles[1]));
    expect(result.current.roleToDelete).toEqual(initialRoles[1]);
    expect(result.current.deleteRoleError).toBe('');

    act(() => result.current.handleCloseDeleteRoleModal());
    expect(result.current.roleToDelete).toBeNull();
  });

  it('não fecha o modal de cargo enquanto a exclusão está em andamento', async () => {
    let resolveDeletion;
    excluirCargo.mockReturnValue(
      new Promise((resolve) => {
        resolveDeletion = resolve;
      })
    );
    const { result } = renderHook(() => useEquipe([], initialRoles));

    act(() => result.current.handleOpenDeleteRoleModal(initialRoles[2]));
    let deletionPromise;
    act(() => {
      deletionPromise = result.current.handleDeleteRole();
    });

    await waitFor(() => expect(result.current.isDeletingRole).toBe(true));
    act(() => result.current.handleCloseDeleteRoleModal());
    expect(result.current.roleToDelete).toEqual(initialRoles[2]);

    await act(async () => {
      resolveDeletion(initialRoles[2]);
      await deletionPromise;
    });
  });

  it.each([
    ['', 'Informe o nome do cargo.'],
    ['  ADMINISTRADOR  ', 'Já existe um cargo com esse nome.'],
  ])('rejeita o cargo inválido "%s"', async (nome_cargo, message) => {
    const { result } = renderHook(() => useEquipe([], initialRoles));

    await expect(
      result.current.handleCreateRole({
        nome_cargo,
        permissao: createEmptyPermission(),
      })
    ).rejects.toThrow(message);
    expect(criarCargo).not.toHaveBeenCalled();
    expect(result.current.roles).toHaveLength(initialRoles.length);
  });

  it('inicializa os cargos com os dados fornecidos pela página', () => {
    const rolesFromApi = [
      {
        cargo_id: 8,
        nome_cargo: 'Paralegal',
        descricao: null,
        permissao: withAllowedPermissions('visualizar_processos'),
      },
    ];

    const { result } = renderHook(() => useEquipe([], rolesFromApi));

    expect(result.current.roles).toEqual(rolesFromApi);
  });
});
