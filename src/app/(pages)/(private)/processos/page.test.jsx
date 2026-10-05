import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import ProcessosPage from './page';

vi.mock('@/services/processos', () => ({
  listarProcessos: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('./processosClient', () => ({
  default: ({ initialPage, initialError, responsaveis }) => (
    <output data-testid="processos-client">
      {JSON.stringify({ initialPage, initialError, responsaveis })}
    </output>
  ),
}));

const apiProcess = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo_proc: 'Caso Teste',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: null,
  responsavel_id: 3,
};

const funcionario = { funcionario_id: 3, nome: 'Ana Paula Ribeiro' };

describe('ProcessosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca a primeira página e os responsáveis no servidor', async () => {
    listarProcessos.mockResolvedValue({
      itens: [apiProcess],
      total: 1,
      page: 1,
      page_size: 5,
      total_pages: 1,
    });
    listarFuncionarios.mockResolvedValue([funcionario]);

    render(await ProcessosPage());

    expect(listarProcessos).toHaveBeenCalledWith({ page: 1, pageSize: 5 });

    const props = JSON.parse(
      screen.getByTestId('processos-client').textContent
    );
    expect(props.initialError).toBe('');
    expect(props.responsaveis).toEqual([
      { value: '3', label: 'Ana Paula Ribeiro' },
    ]);
    expect(props.initialPage).toEqual({
      itens: [
        {
          id: apiProcess.cnj,
          titulo: 'Caso Teste',
          cliente: 'Não informado',
          status: 'Ativo',
          tribunal: 'TJDFT',
          area: 'Civil',
          responsavel: 'Ana Paula Ribeiro',
          prazo: '2026-10-05',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    });
  });

  it('entrega um erro inicial sem derrubar a página', async () => {
    listarProcessos.mockRejectedValue(new Error('API indisponível'));
    listarFuncionarios.mockResolvedValue([]);

    render(await ProcessosPage());

    expect(screen.getByTestId('processos-client').textContent).toContain(
      '"initialError":"API indisponível"'
    );
  });

  it('usa mensagem padrão para rejeições desconhecidas', async () => {
    listarProcessos.mockRejectedValue('falha');
    listarFuncionarios.mockResolvedValue([]);

    render(await ProcessosPage());

    expect(screen.getByTestId('processos-client')).toHaveTextContent(
      'Não foi possível carregar os processos.'
    );
  });
});
