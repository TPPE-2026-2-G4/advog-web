import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientesPage from './page';
import { listarClientesPaginado } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';

vi.mock('@/services/clientes', () => ({
  listarClientesPaginado: vi.fn(),
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

const paginaCom = (itens) => ({
  itens,
  total: itens.length,
  page: 1,
  pageSize: 10,
  totalPages: 1,
});

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
      clientes: paginaCom(mockClientes),
      funcionarios: mockFuncionarios,
    },
    {
      cenario: 'listas vazias',
      clientes: paginaCom([]),
      funcionarios: [],
    },
  ])(
    'busca clientes e funcionários ($cenario) e repassa para o ClientesClient',
    async ({ clientes, funcionarios }) => {
      listarClientesPaginado.mockResolvedValue(clientes);
      listarFuncionarios.mockResolvedValue(funcionarios);

      const elemento = await ClientesPage();
      const clientProps = elemento.props.children?.props || elemento.props;

      expect(listarClientesPaginado).toHaveBeenCalledOnce();
      expect(listarClientesPaginado).toHaveBeenCalledWith({ page: 1 });
      expect(listarFuncionarios).toHaveBeenCalledOnce();
      expect(clientProps.initialPage).toEqual(clientes);
      expect(clientProps.initialFuncionarios).toEqual(funcionarios);
    }
  );

  it.each([
    {
      servico: 'listarClientesPaginado',
      setup: () => {
        listarClientesPaginado.mockRejectedValue(
          new Error('Falha ao buscar clientes')
        );
        listarFuncionarios.mockResolvedValue([]);
      },
      mensagemErro: 'Falha ao buscar clientes',
    },
    {
      servico: 'listarFuncionarios',
      setup: () => {
        listarClientesPaginado.mockResolvedValue(paginaCom([]));
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
