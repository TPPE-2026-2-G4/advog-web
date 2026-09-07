import { beforeEach, describe, expect, it, vi } from 'vitest';
import EquipePage from './page';
import { listarFuncionarios } from '@/services/funcionarios';
import { toTeamMember } from '@/utils/funcionario';

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('@/utils/funcionario', () => ({
  toTeamMember: vi.fn(),
}));

vi.mock('./equipeClient', () => ({
  default: () => null,
}));

const funcionarios = [
  {
    funcionario_id: 1,
    nome: 'Maria Silva',
    email: 'maria@teste.local',
    status: 'Ativo',
  },
  {
    funcionario_id: 2,
    nome: 'João Santos',
    email: 'joao@teste.local',
    status: 'Pendente',
  },
];

describe('EquipePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [funcionarios, 2],
    [[], 0],
  ])(
    'busca %s funcionários e prepara %s membros para o cliente',
    async (resposta, quantidadeEsperada) => {
      const membros = resposta.map((funcionario) => ({
        funcionario_id: funcionario.funcionario_id,
        nome_func: funcionario.nome,
      }));
      listarFuncionarios.mockResolvedValue(resposta);
      toTeamMember.mockImplementation((funcionario) =>
        membros.find(
          (membro) => membro.funcionario_id === funcionario.funcionario_id
        )
      );

      const elemento = await EquipePage();

      expect(listarFuncionarios).toHaveBeenCalledOnce();
      expect(toTeamMember).toHaveBeenCalledTimes(resposta.length);
      expect(elemento.props.initialData).toHaveLength(quantidadeEsperada);
      expect(elemento.props.initialData).toEqual(membros);
    }
  );

  it('mantém a ordem retornada pela API ao preparar os membros', async () => {
    listarFuncionarios.mockResolvedValue(funcionarios);
    toTeamMember.mockImplementation((funcionario) => ({
      funcionario_id: funcionario.funcionario_id,
      nome_func: funcionario.nome,
    }));

    const elemento = await EquipePage();

    expect(
      elemento.props.initialData.map((membro) => membro.funcionario_id)
    ).toEqual([1, 2]);
  });
});
