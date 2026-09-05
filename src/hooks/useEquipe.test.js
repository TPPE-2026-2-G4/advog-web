import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  criarFuncionario,
  excluirFuncionario,
  mudarAcessoFuncionario,
} from '@/services/funcionarios';
import { toTeamMember } from '@/utils/funcionario';
import { useEquipe } from './useEquipe';

vi.mock('@/services/funcionarios', () => ({
  criarFuncionario: vi.fn(),
  excluirFuncionario: vi.fn(),
  mudarAcessoFuncionario: vi.fn(),
}));

vi.mock('@/utils/funcionario', () => ({
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

describe('useEquipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const { result } = renderHook(() => useEquipe(initialData));

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
    const { result } = renderHook(() => useEquipe([member, otherMember]));

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
    const dados = { nome: funcionario.nome, email: funcionario.email };

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
});
