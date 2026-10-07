import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import ProcessosClient from './processosClient';

vi.mock('@/services/clientes', () => ({ listarClientes: vi.fn() }));
vi.mock('@/services/funcionarios', () => ({ listarFuncionarios: vi.fn() }));
vi.mock('@/services/processos', () => ({
  atualizarProcesso: vi.fn(),
  criarProcesso: vi.fn(),
  excluirProcesso: vi.fn(),
  listarProcessos: vi.fn(),
}));

const processData = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Caso existente',
  descricao: null,
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_inicio: null,
  data_realizado: null,
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: 10,
  funcionario_id: 5,
};
const clientes = [{ cliente_id: 10, nome: 'Maria Silva' }];
const funcionarios = [{ funcionario_id: 5, nome: 'Ana Paula' }];

const setPermissions = (permissions) => {
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ cargo: { permissao: permissions } })
  );
};

describe('ProcessosClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    listarProcessos.mockResolvedValue([processData]);
    listarClientes.mockResolvedValue(clientes);
    listarFuncionarios.mockResolvedValue(funcionarios);
  });

  it('bloqueia a tela sem permissão de visualização', () => {
    setPermissions({ visualizar_processos: false });
    render(<ProcessosClient />);

    expect(screen.getByRole('alert')).toHaveTextContent('Acesso negado');
    expect(listarProcessos).not.toHaveBeenCalled();
  });

  it('carrega processos e resolve os nomes pelos IDs', async () => {
    setPermissions({
      visualizar_processos: true,
      criar_processos: true,
      editar_processos: true,
      excluir_processos: true,
    });
    render(<ProcessosClient />);

    expect(
      await screen.findByRole('button', { name: processData.titulo })
    ).toBeInTheDocument();
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(await screen.findByText('Ana Paula')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo Processo' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: `Editar processo ${processData.cnj}` })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: `Excluir processo ${processData.cnj}`,
      })
    ).toBeInTheDocument();
    expect(listarClientes).toHaveBeenCalledOnce();
    expect(listarFuncionarios).toHaveBeenCalledOnce();
  });

  it('oculta criação, edição e exclusão sem permissão', async () => {
    setPermissions({ visualizar_processos: true });
    render(<ProcessosClient />);

    await screen.findByRole('button', { name: processData.titulo });
    expect(
      screen.queryByRole('button', { name: 'Novo Processo' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Editar processo/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Excluir processo/ })
    ).not.toBeInTheDocument();
  });

  it('apresenta falhas ao carregar processos e referências', async () => {
    setPermissions({ visualizar_processos: true });
    listarProcessos.mockRejectedValue(new Error('Backend fora do ar'));
    listarClientes.mockRejectedValue(new Error('Falha nos clientes'));
    render(<ProcessosClient />);

    await waitFor(() => {
      expect(screen.getByText('Backend fora do ar')).toBeInTheDocument();
      expect(screen.getByText('Falha nos clientes')).toBeInTheDocument();
    });
  });
});
