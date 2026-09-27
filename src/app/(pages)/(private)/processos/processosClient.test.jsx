import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from '@/services/processos';
import ProcessosClient from './processosClient';

vi.mock('@/services/processos', () => ({
  atualizarProcesso: vi.fn(),
  criarProcesso: vi.fn(),
  excluirProcesso: vi.fn(),
  listarProcessos: vi.fn(),
}));

const existingProcess = {
  id: '0061234-56.2026.8.26.0100',
  titulo: 'Caso existente',
  cliente: 'Maria Silva',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana Paula',
  prazo: '2026-10-05',
  diasRestantes: 8,
};

const createdProcess = {
  ...existingProcess,
  id: '0061235-56.2026.8.26.0100',
  titulo: 'Novo caso',
  status: 'Em Análise',
};

const fillCreationForm = () => {
  fireEvent.change(screen.getByLabelText('Número do Processo'), {
    target: { value: createdProcess.id },
  });
  fireEvent.change(screen.getByLabelText('Tribunal'), {
    target: { value: createdProcess.tribunal },
  });
  fireEvent.change(screen.getByLabelText('Título do Caso'), {
    target: { value: createdProcess.titulo },
  });
  fireEvent.change(screen.getByLabelText('Cliente'), {
    target: { value: createdProcess.cliente },
  });
  fireEvent.change(screen.getByLabelText('Área de Atuação'), {
    target: { value: createdProcess.area },
  });
  fireEvent.change(screen.getByLabelText('Responsável'), {
    target: { value: createdProcess.responsavel },
  });
  fireEvent.change(screen.getByLabelText('Próximo Prazo'), {
    target: { value: createdProcess.prazo },
  });
};

describe('ProcessosClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executa o fluxo cadastrar, visualizar, editar e excluir', async () => {
    criarProcesso.mockResolvedValue(createdProcess);
    atualizarProcesso.mockImplementation(async (_id, data) => ({
      ...createdProcess,
      ...data,
    }));
    excluirProcesso.mockResolvedValue(undefined);
    render(<ProcessosClient initialData={[existingProcess]} />);

    expect(screen.getByText('1 processo encontrado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Novo Processo' }));
    fillCreationForm();
    fireEvent.submit(screen.getByRole('dialog'));

    expect(
      await screen.findByText('2 processos encontrados')
    ).toBeInTheDocument();
    expect(criarProcesso).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: createdProcess.titulo })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: `Visualizar processo ${createdProcess.id}`,
      })
    );
    expect(
      screen.getByRole('heading', { name: createdProcess.titulo })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    fireEvent.click(
      screen.getByRole('button', {
        name: `Editar processo ${createdProcess.id}`,
      })
    );
    fireEvent.change(screen.getByLabelText('Título do Caso'), {
      target: { value: 'Caso atualizado' },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    expect(await screen.findByText('Caso atualizado')).toBeInTheDocument();
    expect(atualizarProcesso).toHaveBeenCalledWith(
      createdProcess.id,
      expect.not.objectContaining({ id: expect.anything() })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: `Excluir processo ${createdProcess.id}`,
      })
    );
    expect(
      screen.getByRole('heading', { name: 'Excluir processo?' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir processo' }));

    await waitFor(() => {
      expect(screen.getByText('1 processo encontrado')).toBeInTheDocument();
    });
    expect(excluirProcesso).toHaveBeenCalledWith(createdProcess.id);
    expect(screen.queryByText('Caso atualizado')).not.toBeInTheDocument();
  });

  it('mostra falha inicial e recarrega a lista', async () => {
    listarProcessos.mockResolvedValue([existingProcess]);
    render(
      <ProcessosClient initialData={[]} initialError="API indisponível" />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('API indisponível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('button', { name: existingProcess.titulo })
    ).toBeInTheDocument();
    expect(listarProcessos).toHaveBeenCalledOnce();
  });

  it('mantém o erro e indica a recarga enquanto a requisição está pendente', async () => {
    listarProcessos.mockReturnValue(new Promise(() => {}));
    render(
      <ProcessosClient initialData={[]} initialError="API indisponível" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('button', { name: 'Tentando novamente' })
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('API indisponível');
  });

  it('mantém o estado de erro quando a recarga falha novamente', async () => {
    listarProcessos.mockRejectedValue(new Error('Backend fora do ar'));
    render(
      <ProcessosClient initialData={[]} initialError="API indisponível" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend fora do ar'
    );
  });
});
