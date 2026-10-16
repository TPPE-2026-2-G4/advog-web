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

  it('busca clientes e funcionários e repassa para o componente ClientesClient', async () => {
    listarClientes.mockResolvedValue(mockClientes);
    listarFuncionarios.mockResolvedValue(mockFuncionarios);

    const elemento = await ClientesPage();

    expect(listarClientes).toHaveBeenCalledOnce();
    expect(listarFuncionarios).toHaveBeenCalledOnce();
    expect(elemento.props.initialClientes).toBe(mockClientes);
    expect(elemento.props.initialFuncionarios).toBe(mockFuncionarios);
  });

  it('funciona corretamente quando as listas retornam vazias', async () => {
    listarClientes.mockResolvedValue([]);
    listarFuncionarios.mockResolvedValue([]);

    const elemento = await ClientesPage();

    expect(listarClientes).toHaveBeenCalledOnce();
    expect(listarFuncionarios).toHaveBeenCalledOnce();
    expect(elemento.props.initialClientes).toEqual([]);
    expect(elemento.props.initialFuncionarios).toEqual([]);
  });

  it('propaga o erro caso listarClientes ou listarFuncionarios falhe', async () => {
    listarClientes.mockRejectedValue(new Error('Falha ao buscar clientes'));
    listarFuncionarios.mockResolvedValue([]);

    await expect(ClientesPage()).rejects.toThrow('Falha ao buscar clientes');
  });
});
