import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardClient from './dashboardClient';
import { listarClientes } from '@/services/clientes';
import { listarFuncionarios } from '@/services/funcionarios';
import {
  listarDocumentos,
  listarProcessosCriticos,
  obterProcesso,
  obterUrlDocumento,
  uploadDocumento,
} from '@/services/processos';
import { getCurrentUser } from '@/utils/authSession';

vi.mock('@/services/clientes', () => ({
  listarClientes: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

vi.mock('@/services/processos', () => ({
  listarProcessosCriticos: vi.fn(),
  obterProcesso: vi.fn(),
  listarDocumentos: vi.fn(),
  obterUrlDocumento: vi.fn(),
  uploadDocumento: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

const process = {
  processo_id: 101,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Ação de Cobrança Teste',
  status: 'Ativo',
  tribunal: 'TJSP',
  area: 'Civil',
  data_inicio: '2026-01-10T10:00:00',
  data_realizado: '2026-09-01T12:00:00',
  data_prazo: '2026-11-10T18:00:00',
  cliente_id: 1,
  funcionario_id: 2,
};

describe('DashboardClient integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: { visualizar_processos: true },
      },
    });

    listarClientes.mockResolvedValue([
      { cliente_id: 1, nome: 'Empresa Alpha Ltda' },
    ]);
    listarFuncionarios.mockResolvedValue([
      { funcionario_id: 2, nome: 'Dr. Roberto Dias' },
    ]);
    listarProcessosCriticos.mockResolvedValue([process]);
    obterProcesso.mockResolvedValue({
      ...process,
      descricao: 'Descrição completa do caso crítico',
    });
    listarDocumentos.mockResolvedValue([]);
    obterUrlDocumento.mockResolvedValue({ url: '' });
    uploadDocumento.mockResolvedValue({});
  });

  it('bloqueia acesso sem permissão', () => {
    getCurrentUser.mockReturnValue({
      cargo: {
        permissao: { visualizar_processos: false },
      },
    });

    render(<DashboardClient />);

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(listarProcessosCriticos).not.toHaveBeenCalled();
  });

  it('lista processos críticos, enriquece nomes e abre detalhes para análise', async () => {
    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
      expect(screen.getAllByText('Empresa Alpha Ltda')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Analisar' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText('Descrição completa do caso crítico')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('mostra fallback de erro ao carregar referências com erro não-Error', async () => {
    listarClientes.mockRejectedValueOnce('falha inesperada');

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Não foi possível carregar clientes e responsáveis.'
      );
    });
  });

  it('permite tentar novamente quando a listagem de críticos falha', async () => {
    listarProcessosCriticos
      .mockRejectedValueOnce(new Error('Falha ao listar críticos'))
      .mockResolvedValueOnce([]);

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Falha ao listar críticos'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Nenhum processo sem movimentação há 15 dias ou mais\./i
        )
      ).toBeInTheDocument();
    });
  });
});
