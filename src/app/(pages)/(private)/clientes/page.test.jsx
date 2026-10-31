import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientesPage from './page';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

vi.mock('@/services/clientes', () => ({
  listarClientes: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('./clientesClient', () => ({
  default: () => null,
}));

const mockClientes = [
  {
    cliente_id: 1,
    nome: 'Carlos Drummond',
    email: 'carlos@teste.com',
    telefone: '11987654321',
    etapa_id: 1,
  },
  {
    cliente_id: 2,
    nome: 'Clarice Lispector',
    email: 'clarice@teste.com',
    telefone: '21987654321',
    etapa_id: 4,
  },
];

const mockFuncionarios = [
  {
    funcionario_id: 10,
    nome: 'Dra. Roberta',
    email: 'roberta@adv.com',
  },
  {
    funcionario_id: 20,
    nome: 'Dr. Lucas',
    email: 'lucas@adv.com',
  },
];

describe('ClientesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    {
      cenario: 'listas preenchidas',
      clientes: mockClientes,
      funcionarios: mockFuncionarios,
    },
    {
      cenario: 'listas vazias',
      clientes: [],
      funcionarios: [],
    },
  ])(
    'busca clientes e funcionários ($cenario) e repassa para o ClientesClient',
    async ({ clientes, funcionarios }) => {
      listarClientes.mockResolvedValue(clientes);
      listarFuncionarios.mockResolvedValue(funcionarios);

      const elemento = await ClientesPage();

      expect(listarClientes).toHaveBeenCalledOnce();
      expect(listarFuncionarios).toHaveBeenCalledOnce();
      expect(elemento.props.initialClientes).toEqual(clientes);
      expect(elemento.props.initialFuncionarios).toEqual(funcionarios);
    }
  );

  it.each([
    {
      servico: 'listarClientes',
      setup: () => {
        listarClientes.mockRejectedValue(new Error('Falha ao buscar clientes'));
        listarFuncionarios.mockResolvedValue([]);
      },
      mensagemErro: 'Falha ao buscar clientes',
    },
    {
      servico: 'listarFuncionarios',
      setup: () => {
        listarClientes.mockResolvedValue([]);
        listarFuncionarios.mockRejectedValue(
          new Error('Falha ao buscar funcionários')
        );
      },
      mensagemErro: 'Falha ao buscar funcionários',
    },
  ])('propaga o erro caso $servico falhe', async ({ setup, mensagemErro }) => {
    setup();

    await expect(ClientesPage()).rejects.toThrow(mensagemErro);
  });
});
