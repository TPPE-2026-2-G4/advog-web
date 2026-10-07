import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarProcesso,
  criarProcesso,
  excluirProcesso,
  listarProcessos,
} from '@/services/processos';
import { toProcessPage, toResponsavelNames } from '@/utils/processo';
import ProcessosClient from './processosClient';

vi.mock('@/services/processos', () => ({
  atualizarProcesso: vi.fn(),
  criarProcesso: vi.fn(),
  excluirProcesso: vi.fn(),
  listarProcessos: vi.fn(),
}));

const responsaveis = [{ value: '3', label: 'Ana Paula Ribeiro' }];

const apiProcess = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo_proc: 'Caso existente',
  descricao_proc: null,
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: 4,
  responsavel_id: 3,
};

const createdApiProcess = {
  ...apiProcess,
  processo_id: 2,
  cnj: '0061235-56.2026.8.26.0100',
  titulo_proc: 'Novo caso',
  status: 'Em Análise',
};

const apiPage = (itens, extra = {}) => ({
  itens,
  total: itens.length,
  page: 1,
  page_size: 5,
  total_pages: 1,
  ...extra,
});

const fillCreationForm = (process) => {
  fireEvent.change(screen.getByLabelText('Número do Processo'), {
    target: { value: process.cnj },
  });
  fireEvent.change(screen.getByLabelText('Tribunal'), {
    target: { value: process.tribunal },
  });
  fireEvent.change(screen.getByLabelText('Título do Caso'), {
    target: { value: process.titulo_proc },
  });
  fireEvent.change(screen.getByLabelText('Cliente'), {
    target: { value: 'Maria Silva' },
  });
  fireEvent.change(screen.getByLabelText('Área de Atuação'), {
    target: { value: process.area },
  });
  fireEvent.change(screen.getByLabelText('Responsável'), {
    target: { value: 'Ana Paula Ribeiro' },
  });
  fireEvent.change(screen.getByLabelText('Próximo Prazo'), {
    target: { value: '2026-10-05' },
  });
};

const renderClient = (overrides = {}) =>
  render(
    <ProcessosClient
      initialPage={toProcessPage(
        apiPage([apiProcess]),
        toResponsavelNames(responsaveis)
      )}
      initialError=""
      responsaveis={responsaveis}
      {...overrides}
    />
  );

describe('ProcessosClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe a página inicial com responsável resolvido e total do servidor', () => {
    renderClient();

    expect(screen.getByText('1 processo encontrado')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table')).getByText('Ana Paula Ribeiro')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /filtrar por status/i })
    ).toBeInTheDocument();
    expect(listarProcessos).not.toHaveBeenCalled();
  });

  it('consulta o servidor ao filtrar por status e volta à primeira página', async () => {
    listarProcessos.mockResolvedValue(apiPage([]));
    renderClient();

    fireEvent.change(
      screen.getByRole('combobox', { name: /filtrar por status/i }),
      {
        target: { value: 'Concluído' },
      }
    );

    expect(
      await screen.findByText('Nenhum processo encontrado')
    ).toBeInTheDocument();
    expect(listarProcessos).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'Concluído',
        page: 1,
        pageSize: 5,
      })
    );
  });

  it('aplica a busca por texto após uma pausa na digitação', async () => {
    listarProcessos.mockResolvedValue(apiPage([apiProcess]));
    renderClient();

    fireEvent.change(
      screen.getByPlaceholderText(/buscar por número, cliente ou título/i),
      { target: { value: '0061234' } }
    );

    await waitFor(() => {
      expect(listarProcessos).toHaveBeenCalledWith(
        expect.objectContaining({ busca: '0061234' })
      );
    });
  });

  it('não consulta o servidor com intervalo de prazo inválido', async () => {
    listarProcessos.mockResolvedValue(apiPage([]));
    renderClient();

    fireEvent.change(screen.getByLabelText('De'), {
      target: { value: '2026-10-10' },
    });
    await waitFor(() => {
      expect(listarProcessos).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('Até'), {
      target: { value: '2026-10-01' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à data final.'
    );
    expect(listarProcessos).toHaveBeenCalledTimes(1);
  });

  it('mantém os filtros visíveis quando a listagem falha', () => {
    renderClient({ initialError: 'API indisponível', initialPage: undefined });

    expect(screen.getByRole('alert')).toHaveTextContent('API indisponível');
    expect(
      screen.getByRole('combobox', { name: /filtrar por status/i })
    ).toBeInTheDocument();
  });

  it('fecha o detalhe do processo visualizado', () => {
    renderClient();

    fireEvent.click(
      screen.getByRole('button', {
        name: `Visualizar processo ${apiProcess.cnj}`,
      })
    );
    expect(
      screen.getByRole('heading', { name: apiProcess.titulo_proc })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(
      screen.queryByRole('heading', { name: apiProcess.titulo_proc })
    ).not.toBeInTheDocument();
  });

  it('cadastra, edita e exclui recarregando a página do servidor', async () => {
    criarProcesso.mockResolvedValue(createdApiProcess);
    atualizarProcesso.mockResolvedValue({
      ...apiProcess,
      titulo_proc: 'Caso atualizado',
    });
    excluirProcesso.mockResolvedValue(undefined);
    listarProcessos
      .mockResolvedValueOnce(
        apiPage([createdApiProcess, apiProcess], { total: 2 })
      )
      .mockResolvedValueOnce(
        apiPage([{ ...apiProcess, titulo_proc: 'Caso atualizado' }], {
          total: 1,
        })
      )
      .mockResolvedValueOnce(apiPage([], { total: 0 }));
    renderClient();

    fireEvent.click(screen.getByRole('button', { name: 'Novo Processo' }));
    fillCreationForm(createdApiProcess);
    fireEvent.submit(screen.getByRole('dialog'));

    expect(
      await screen.findByText('2 processos encontrados')
    ).toBeInTheDocument();
    expect(criarProcesso).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', { name: createdApiProcess.titulo_proc })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: `Editar processo ${apiProcess.cnj}` })
    );
    fireEvent.change(screen.getByLabelText('Título do Caso'), {
      target: { value: 'Caso atualizado' },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    expect(await screen.findByText('Caso atualizado')).toBeInTheDocument();
    expect(atualizarProcesso).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole('button', { name: `Excluir processo ${apiProcess.cnj}` })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Excluir processo' }));

    expect(
      await screen.findByText('Nenhum processo cadastrado')
    ).toBeInTheDocument();
    expect(excluirProcesso).toHaveBeenCalledWith(apiProcess.cnj);
  });

  it('mostra falha inicial e recarrega a lista', async () => {
    listarProcessos.mockResolvedValue(apiPage([apiProcess]));
    renderClient({ initialPage: undefined, initialError: 'API indisponível' });

    expect(screen.getByRole('alert')).toHaveTextContent('API indisponível');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('button', { name: apiProcess.titulo_proc })
    ).toBeInTheDocument();
    expect(listarProcessos).toHaveBeenCalledOnce();
  });

  it('mantém o erro e indica a recarga enquanto a requisição está pendente', async () => {
    listarProcessos.mockReturnValue(new Promise(() => {}));
    renderClient({ initialPage: undefined, initialError: 'API indisponível' });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('button', { name: 'Tentando novamente' })
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('API indisponível');
  });

  it('mantém o estado de erro quando a recarga falha novamente', async () => {
    listarProcessos.mockRejectedValue(new Error('Backend fora do ar'));
    renderClient({ initialPage: undefined, initialError: 'API indisponível' });

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Backend fora do ar'
    );
  });
});
