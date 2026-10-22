import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import { toProcessPage } from '@/utils/processo';
import ProcessosClient from './processosClient';

vi.mock('@/services/processos', () => ({
  atualizarProcesso: vi.fn(),
  criarProcesso: vi.fn(),
  excluirProcesso: vi.fn(),
  listarProcessos: vi.fn(),
}));

vi.mock('@/services/clientes', () => ({
  listarClientes: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

const mockClientes = [{ cliente_id: 1, nome: 'João da Silva' }];
const mockFuncionarios = [{ funcionario_id: 2, nome: 'Dr. Lucas Mendes' }];
const responsaveis = [{ value: '2', label: 'Dr. Lucas Mendes' }];

const currentUser = {
  cargo: {
    permissao: {
      visualizar_processos: true,
      criar_processos: true,
      editar_processos: true,
      excluir_processos: true,
    },
  },
};

const apiProcessoDatajud = {
  processo_id: 10,
  cnj: '0061234-56.2026.8.26.0100',
  titulo_proc: 'Ação de Cobrança Datajud',
  descricao_proc: 'Processo atualizado via integração Datajud',
  cliente_id: 1,
  responsavel_id: 2,
  status: 'Ativo',
  tribunal: 'TJSP',
  area: 'Civil',
  data_inicio: '2026-01-10T10:00:00',
  data_realizado: '2026-10-22T12:00:00',
  data_prazo: '2026-11-01T18:00:00',
};

const apiPage = {
  itens: [apiProcessoDatajud],
  total: 1,
  page: 1,
  page_size: 10,
  total_pages: 1,
};

describe('US19 - Visualização e Sincronização Datajud de Processos (Integração)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('current_user', JSON.stringify(currentUser));
    listarClientes.mockResolvedValue(mockClientes);
    listarFuncionarios.mockResolvedValue(mockFuncionarios);
  });

  it('exibe o processo na tabela, abre o modal de detalhes e visualiza movimentações sincronizadas via Datajud', async () => {
    render(
      <ProcessosClient
        initialPage={toProcessPage(apiPage)}
        initialError=""
        responsaveis={responsaveis}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Gestão de Processos' })
    ).toBeInTheDocument();
    expect(screen.getByText('Ação de Cobrança Datajud')).toBeInTheDocument();
    expect(screen.getByText('0061234-56.2026.8.26.0100')).toBeInTheDocument();
    expect(screen.getByText('TJSP')).toBeInTheDocument();

    const viewButton = screen.getByRole('button', {
      name: 'Visualizar processo 0061234-56.2026.8.26.0100',
    });
    fireEvent.click(viewButton);

    expect(
      await screen.findByRole('heading', { name: 'Ação de Cobrança Datajud' })
    ).toBeInTheDocument();
    expect(screen.getByText('Resumo')).toBeInTheDocument();
    expect(screen.getByText('22/10/2026')).toBeInTheDocument();

    const tabMovimentacoes = screen.getByRole('tab', { name: 'Movimentações' });
    fireEvent.click(tabMovimentacoes);

    expect(
      screen.getByText('Atualização de Movimentação Sincronizada')
    ).toBeInTheDocument();
    expect(screen.getByText('DataJud')).toBeInTheDocument();
    expect(screen.getByText(/22\/10\/2026/)).toBeInTheDocument();

    const tabDocumentos = screen.getByRole('tab', { name: 'Documentos' });
    fireEvent.click(tabDocumentos);
    expect(screen.getByText('Nenhum documento anexado.')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Fechar' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Ação de Cobrança Datajud' })
      ).not.toBeInTheDocument();
    });
  });
});
