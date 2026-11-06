import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as clientesService from '@/services/clientes';
import * as processosService from '@/services/processos';
import { listarProcessos } from '@/services/processos';
import { toProcessPage } from '@/utils/processo';
import ProcessosPage from './page';
import ProcessosClient from './processosClient';

const API_BASE = 'http://localhost:8000';

const createJwtToken = (payload) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(
    encodeURIComponent(JSON.stringify(payload)).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
  return `${header}.${body}.fake-signature`;
};

const defaultTokenPayload = {
  sub: '3',
  email: 'ana.ribeiro@advog.com',
  nome: 'Ana Paula Ribeiro',
  cargo: {
    permissao: {
      visualizar_processos: true,
      criar_processos: true,
      editar_processos: true,
      excluir_processos: true,
    },
  },
};

const mockClientes = [
  { cliente_id: 4, nome: 'Maria Silva' },
  { cliente_id: 7, nome: 'Empresa Horizonte Ltda' },
];

const mockFuncionarios = [
  { funcionario_id: 3, nome: 'Ana Paula Ribeiro' },
  { funcionario_id: 5, nome: 'Carlos Eduardo Lima' },
];

const initialApiProcess = {
  processo_id: 10,
  cnj: '0061234-56.2026.8.26.0100',
  titulo_proc: 'Ação de Indenização por Danos Morais',
  descricao_proc: 'Pedido liminar em análise pelo juízo cível.',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_inicio: '2026-01-15T00:00:00',
  data_realizado: '2026-02-10T00:00:00',
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: 4,
  responsavel_id: 3,
};

const makePageResponse = (itens, overrides = {}) => ({
  itens,
  total: itens.length,
  page: 1,
  page_size: 5,
  total_pages: Math.max(1, Math.ceil(itens.length / 5)),
  ...overrides,
});

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(data),
});

describe('Processos Frontend Integration (ProcessosClient + useProcessos + Modals + Services + Utils)', () => {
  let fetchMock;
  let accessToken;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    accessToken = createJwtToken(defaultTokenPayload);
    sessionStorage.setItem('access_token', accessToken);

    fetchMock = vi.fn((url) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (urlString.startsWith(`${API_BASE}/processos/`)) {
        return Promise.resolve(
          jsonResponse(makePageResponse([initialApiProcess]))
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderIntegration = (props = {}) =>
    render(
      <ProcessosClient
        initialPage={toProcessPage(makePageResponse([initialApiProcess]))}
        initialError=""
        responsaveis={[
          { value: '3', label: 'Ana Paula Ribeiro' },
          { value: '5', label: 'Carlos Eduardo Lima' },
        ]}
        {...props}
      />
    );

  it('renderiza processos iniciais enriquecidos com clientes/funcionários e exibe detalhes no ProcessDetailsModal', async () => {
    renderIntegration();

    expect(
      screen.getByRole('heading', { name: 'Gestão de Processos' })
    ).toBeInTheDocument();

    expect(screen.getByText('1 processo encontrado')).toBeInTheDocument();

    const table = screen.getByRole('table');

    expect(await within(table).findByText('Maria Silva')).toBeInTheDocument();

    expect(within(table).getByText('Ana Paula Ribeiro')).toBeInTheDocument();

    expect(
      within(table).getByText('0061234-56.2026.8.26.0100')
    ).toBeInTheDocument();

    expect(within(table).getByText('05/10/2026')).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/clientes/`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Bearer ${accessToken}`,
        }),
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/funcionarios`,
      expect.objectContaining({
        cache: 'no-store',
      })
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: `Visualizar processo ${initialApiProcess.cnj}`,
      })
    );

    const detailsModal = screen.getByRole('dialog', {
      name: initialApiProcess.titulo_proc,
    });

    expect(detailsModal).toBeInTheDocument();

    expect(
      within(detailsModal).getByText(initialApiProcess.descricao_proc)
    ).toBeInTheDocument();

    expect(within(detailsModal).getByText('Maria Silva')).toBeInTheDocument();

    expect(
      within(detailsModal).getByText('Ana Paula Ribeiro')
    ).toBeInTheDocument();

    expect(within(detailsModal).getByText('15/01/2026')).toBeInTheDocument();

    expect(within(detailsModal).getByText('10/02/2026')).toBeInTheDocument();

    expect(within(detailsModal).getByText('05/10/2026')).toBeInTheDocument();

    fireEvent.click(
      within(detailsModal).getByRole('button', {
        name: 'Fechar',
      })
    );

    expect(
      screen.queryByRole('dialog', {
        name: initialApiProcess.titulo_proc,
      })
    ).not.toBeInTheDocument();
  });

  it('cria um novo processo pelo ProcessFormModal com formatação CNJ, envia POST /processos/ e recarrega a listagem', async () => {
    const createdProcess = {
      processo_id: 25,
      cnj: '1234567-89.2026.8.07.0001',
      titulo_proc: 'Execução de Título Extrajudicial',
      descricao_proc: 'Cobrança de contrato empresarial.',
      status: 'Em Análise',
      tribunal: 'TJSP',
      area: 'Empresarial',
      data_inicio: '2026-03-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-11-20T00:00:00',
      cliente_id: 7,
      responsavel_id: 5,
    };

    fetchMock.mockImplementation((url, options = {}) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (urlString === `${API_BASE}/processos/` && options.method === 'POST') {
        return Promise.resolve(jsonResponse(createdProcess, 201));
      }

      if (urlString.startsWith(`${API_BASE}/processos/?`)) {
        return Promise.resolve(
          jsonResponse(
            makePageResponse([createdProcess, initialApiProcess], { total: 2 })
          )
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    renderIntegration();

    await within(screen.getByRole('table')).findByText('Maria Silva');

    fireEvent.click(screen.getByRole('button', { name: 'Novo Processo' }));

    const dialog = screen.getByRole('dialog', {
      name: 'Novo Processo',
    });

    const cnjInput = within(dialog).getByLabelText('Número do Processo');

    fireEvent.change(cnjInput, {
      target: {
        value: '12345678920268070001',
      },
    });

    expect(cnjInput).toHaveValue('1234567-89.2026.8.07.0001');

    fireEvent.change(within(dialog).getByLabelText('Tribunal'), {
      target: { value: '  TJSP  ' },
    });

    fireEvent.change(within(dialog).getByLabelText('Título do Caso'), {
      target: {
        value: '  Execução de Título Extrajudicial  ',
      },
    });

    fireEvent.change(within(dialog).getByLabelText('Descrição'), {
      target: {
        value: '  Cobrança de contrato empresarial.  ',
      },
    });

    fireEvent.change(within(dialog).getByLabelText('Cliente'), {
      target: { value: '7' },
    });

    fireEvent.change(within(dialog).getByLabelText('Área de Atuação'), {
      target: { value: '  Empresarial  ' },
    });

    fireEvent.change(within(dialog).getByLabelText('Responsável'), {
      target: { value: '5' },
    });

    fireEvent.change(within(dialog).getByLabelText('Status Inicial'), {
      target: { value: 'Em Análise' },
    });

    fireEvent.change(within(dialog).getByLabelText('Data de Início'), {
      target: { value: '2026-03-01' },
    });

    fireEvent.change(within(dialog).getByLabelText('Próximo Prazo'), {
      target: { value: '2026-11-20' },
    });

    fireEvent.submit(dialog);

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: 'Novo Processo',
        })
      ).not.toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, opts]) =>
        url === `${API_BASE}/processos/` && opts?.method === 'POST'
    );

    expect(postCall).toBeDefined();

    expect(postCall[1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    });

    expect(JSON.parse(postCall[1].body)).toEqual({
      cnj: '1234567-89.2026.8.07.0001',
      titulo: 'Execução de Título Extrajudicial',
      descricao: 'Cobrança de contrato empresarial.',
      status: 'Em Análise',
      tribunal: 'TJSP',
      area: 'Empresarial',
      data_inicio: '2026-03-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-11-20T00:00:00',
      cliente_id: 7,
      funcionario_id: 5,
    });

    expect(
      await screen.findByText('2 processos encontrados')
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Execução de Título Extrajudicial',
      })
    ).toBeInTheDocument();

    expect(screen.getByText('Empresa Horizonte Ltda')).toBeInTheDocument();
  });

  it('edita um processo existente enviando apenas campos alterados e exclui via DeleteProcessModal', async () => {
    const updatedApiProcess = {
      ...initialApiProcess,
      titulo_proc: 'Ação Indenizatória Revisada',
      status: 'Concluído',
    };

    let processoAtual = initialApiProcess;
    let processoExcluido = false;

    fetchMock.mockImplementation((url, options = {}) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (
        urlString ===
          `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        options.method === 'PATCH'
      ) {
        processoAtual = updatedApiProcess;

        return Promise.resolve(jsonResponse(updatedApiProcess));
      }

      if (
        urlString ===
          `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        options.method === 'DELETE'
      ) {
        processoExcluido = true;

        return Promise.resolve({
          ok: true,
          status: 204,
          json: vi.fn().mockResolvedValue(undefined),
        });
      }

      if (urlString.startsWith(`${API_BASE}/processos/?`)) {
        const processo = processoExcluido ? [] : [processoAtual];

        return Promise.resolve(
          jsonResponse(
            makePageResponse(processo, {
              total: processo.length,
            })
          )
        );
      }

      if (urlString.startsWith(`${API_BASE}/processos/`)) {
        return Promise.resolve(
          jsonResponse(
            makePageResponse(processoExcluido ? [] : [processoAtual], {
              total: processoExcluido ? 0 : 1,
            })
          )
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    renderIntegration();

    await within(screen.getByRole('table')).findByText('Maria Silva');

    fireEvent.click(
      screen.getByRole('button', {
        name: `Editar processo ${initialApiProcess.cnj}`,
      })
    );

    const editDialog = screen.getByRole('dialog', {
      name: 'Editar Processo',
    });

    expect(
      within(editDialog).getByLabelText('Número do Processo')
    ).toHaveAttribute('readOnly');

    fireEvent.change(within(editDialog).getByLabelText('Título do Caso'), {
      target: {
        value: 'Ação Indenizatória Revisada',
      },
    });

    fireEvent.change(within(editDialog).getByLabelText('Status'), {
      target: {
        value: 'Concluído',
      },
    });

    fireEvent.submit(editDialog);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, opts]) =>
          url === `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
          opts?.method === 'PATCH'
      );

      expect(patchCall).toBeDefined();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, opts]) =>
        url === `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        opts?.method === 'PATCH'
    );

    expect(patchCall[1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    });

    expect(JSON.parse(patchCall[1].body)).toEqual({
      titulo: 'Ação Indenizatória Revisada',
      status: 'Concluído',
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Ação Indenizatória Revisada',
        })
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: `Excluir processo ${initialApiProcess.cnj}`,
      })
    );

    const deleteDialog = screen.getByRole('dialog', {
      name: 'Excluir processo?',
    });

    expect(
      within(deleteDialog).getByText('Ação Indenizatória Revisada')
    ).toBeInTheDocument();

    fireEvent.click(
      within(deleteDialog).getByRole('button', {
        name: 'Excluir processo',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum processo cadastrado')
      ).toBeInTheDocument();
    });

    const deleteCall = fetchMock.mock.calls.find(
      ([url, opts]) =>
        url === `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        opts?.method === 'DELETE'
    );

    expect(deleteCall).toBeDefined();

    expect(deleteCall[1].headers).toEqual({
      Authorization: `Bearer ${accessToken}`,
    });
  });

  it.each([
    [
      'status',
      () =>
        fireEvent.change(
          screen.getByRole('combobox', {
            name: /filtrar por status/i,
          }),
          {
            target: { value: 'Arquivado' },
          }
        ),
      'status=Arquivado&page=1&page_size=5',
    ],
    [
      'responsável',
      () =>
        fireEvent.change(
          screen.getByRole('combobox', {
            name: /filtrar por responsável/i,
          }),
          {
            target: { value: '5' },
          }
        ),
      'funcionario_id=5&page=1&page_size=5',
    ],
    [
      'prazo inicial',
      () =>
        fireEvent.change(screen.getByLabelText('De:'), {
          target: { value: '2026-05-01' },
        }),
      'prazo_inicio=2026-05-01&page=1&page_size=5',
    ],
    [
      'busca por texto (com debounce)',
      () =>
        fireEvent.change(
          screen.getByPlaceholderText(/buscar por número, cliente ou título/i),
          {
            target: {
              value: '  Indenização  ',
            },
          }
        ),
      'busca=Indeniza%C3%A7%C3%A3o&page=1&page_size=5',
    ],
  ])(
    'consulta GET /processos/ com os parâmetros corretos ao filtrar por %s',
    async (_label, triggerFilter, expectedQuery) => {
      fetchMock.mockImplementation((url) => {
        const urlString = String(url);

        if (urlString.startsWith(`${API_BASE}/clientes/`)) {
          return Promise.resolve(jsonResponse(mockClientes));
        }

        if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
          return Promise.resolve(jsonResponse(mockFuncionarios));
        }

        if (urlString.startsWith(`${API_BASE}/processos/?`)) {
          return Promise.resolve(jsonResponse(makePageResponse([])));
        }

        return Promise.resolve(jsonResponse({}, 404));
      });

      renderIntegration();

      await within(screen.getByRole('table')).findByText('Maria Silva');

      triggerFilter();

      await waitFor(() => {
        const processoCall = fetchMock.mock.calls.find(
          ([url]) => String(url) === `${API_BASE}/processos/?${expectedQuery}`
        );

        expect(processoCall).toBeDefined();

        expect(processoCall[1]).toEqual(
          expect.objectContaining({
            cache: 'no-store',
            headers: expect.objectContaining({
              Authorization: `Bearer ${accessToken}`,
            }),
          })
        );
      });

      expect(
        await screen.findByText('Nenhum processo encontrado')
      ).toBeInTheDocument();
    }
  );

  it.each([
    [
      400,
      {
        detail: 'Já existe um processo cadastrado com este CNJ.',
      },
      'Já existe um processo cadastrado com este CNJ.',
    ],
    [
      403,
      { detail: 'Proibido' },
      'Você não possui permissão para realizar esta ação.',
    ],
    [
      422,
      {
        detail: [
          {
            loc: ['body', 'cnj'],
            msg: 'formato CNJ inválido',
            type: 'value_error',
          },
          {
            loc: ['body', 'tribunal'],
            msg: 'Field required',
            type: 'missing',
          },
        ],
      },
      'Número do processo: formato CNJ inválido Tribunal: campo obrigatório.',
    ],
    [
      500,
      { message: 'Internal Server Error' },
      'Não foi possível cadastrar o processo.',
    ],
  ])(
    'exibe feedback de erro no ProcessFormModal quando POST /processos/ retorna HTTP %i',
    async (status, errorPayload, expectedMessage) => {
      fetchMock.mockImplementation((url, options = {}) => {
        const urlString = String(url);

        if (urlString.startsWith(`${API_BASE}/clientes/`)) {
          return Promise.resolve(jsonResponse(mockClientes));
        }

        if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
          return Promise.resolve(jsonResponse(mockFuncionarios));
        }

        if (
          urlString === `${API_BASE}/processos/` &&
          options.method === 'POST'
        ) {
          return Promise.resolve(jsonResponse(errorPayload, status));
        }

        return Promise.resolve(
          jsonResponse(makePageResponse([initialApiProcess]))
        );
      });

      renderIntegration();

      await within(screen.getByRole('table')).findByText('Maria Silva');

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Novo Processo',
        })
      );

      const dialog = screen.getByRole('dialog', {
        name: 'Novo Processo',
      });

      fireEvent.change(within(dialog).getByLabelText('Número do Processo'), {
        target: {
          value: '0061235-56.2026.8.26.0100',
        },
      });

      fireEvent.change(within(dialog).getByLabelText('Tribunal'), {
        target: { value: 'TJDFT' },
      });

      fireEvent.change(within(dialog).getByLabelText('Título do Caso'), {
        target: { value: 'Novo Caso' },
      });

      fireEvent.change(within(dialog).getByLabelText('Cliente'), {
        target: { value: '4' },
      });

      fireEvent.change(within(dialog).getByLabelText('Área de Atuação'), {
        target: { value: 'Civil' },
      });

      fireEvent.submit(dialog);

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        expectedMessage
      );

      expect(
        screen.getByRole('dialog', {
          name: 'Novo Processo',
        })
      ).toBeInTheDocument();
    }
  );

  it.each([
    [
      'CNJ incompleto',
      {
        cnj: '12345',
        tribunal: 'TJDFT',
        titulo: 'Caso Teste',
        cliente_id: '4',
        area: 'Civil',
      },
      'Informe o número do processo no formato CNJ.',
    ],
    [
      'campos obrigatórios em branco',
      {
        cnj: '0061235-56.2026.8.26.0100',
        tribunal: '   ',
        titulo: 'Caso Teste',
        cliente_id: '4',
        area: 'Civil',
      },
      'Preencha todos os campos obrigatórios.',
    ],
  ])(
    'bloqueia submissão no ProcessFormModal e mostra erro de validação para %s',
    async (_scenario, values, expectedAlert) => {
      renderIntegration();

      await within(screen.getByRole('table')).findByText('Maria Silva');

      fireEvent.click(
        screen.getByRole('button', {
          name: 'Novo Processo',
        })
      );

      const dialog = screen.getByRole('dialog', {
        name: 'Novo Processo',
      });

      fireEvent.change(within(dialog).getByLabelText('Número do Processo'), {
        target: { value: values.cnj },
      });

      fireEvent.change(within(dialog).getByLabelText('Tribunal'), {
        target: { value: values.tribunal },
      });

      fireEvent.change(within(dialog).getByLabelText('Título do Caso'), {
        target: { value: values.titulo },
      });

      fireEvent.change(within(dialog).getByLabelText('Cliente'), {
        target: { value: values.cliente_id },
      });

      fireEvent.change(within(dialog).getByLabelText('Área de Atuação'), {
        target: { value: values.area },
      });

      fireEvent.submit(dialog);

      expect(within(dialog).getByRole('alert')).toHaveTextContent(
        expectedAlert
      );

      expect(
        fetchMock.mock.calls.filter(([, opts]) => opts?.method === 'POST')
      ).toHaveLength(0);
    }
  );

  it('exibe erro na exclusão quando DELETE /processos/:id falha e permite recuperar na listagem', async () => {
    fetchMock.mockImplementation((url, options = {}) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (
        urlString ===
          `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        options.method === 'DELETE'
      ) {
        return Promise.resolve(
          jsonResponse(
            {
              detail: 'Processo possui movimentações vinculadas.',
            },
            400
          )
        );
      }

      return Promise.resolve(
        jsonResponse(makePageResponse([initialApiProcess]))
      );
    });

    renderIntegration();

    await within(screen.getByRole('table')).findByText('Maria Silva');

    fireEvent.click(
      screen.getByRole('button', {
        name: `Excluir processo ${initialApiProcess.cnj}`,
      })
    );

    const deleteDialog = screen.getByRole('dialog', {
      name: 'Excluir processo?',
    });

    fireEvent.click(
      within(deleteDialog).getByRole('button', {
        name: 'Excluir processo',
      })
    );

    expect(await within(deleteDialog).findByRole('alert')).toHaveTextContent(
      'Processo possui movimentações vinculadas.'
    );
  });

  it('carrega ProcessosPage via getProcessosData com sucesso e trata erros de carregamento e recuperação', async () => {
    const successElement = await ProcessosPage();

    const { unmount } = render(successElement);

    expect(
      screen.getByRole('heading', {
        name: 'Gestão de Processos',
      })
    ).toBeInTheDocument();

    expect(
      await within(screen.getByRole('table')).findByText('Maria Silva')
    ).toBeInTheDocument();

    unmount();

    fetchMock.mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/processos/`)) {
        return Promise.reject(new Error('Network down'));
      }

      return Promise.resolve(jsonResponse([]));
    });

    const errorElement = await ProcessosPage();

    render(errorElement);

    expect(
      screen.getByRole('heading', {
        name: 'Não foi possível exibir os processos',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText('Não foi possível carregar os processos.')
    ).toBeInTheDocument();

    fetchMock.mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/processos/`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        });
      }

      return Promise.resolve(jsonResponse([]));
    });

    await expect(listarProcessos()).rejects.toThrow(
      'Não foi possível carregar os processos.'
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Exp' }, 401));

    await expect(listarProcessos()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );

    sessionStorage.removeItem('access_token');

    await expect(listarProcessos()).rejects.toThrow(
      'Sessão expirada. Faça login novamente.'
    );
  });

  it('permite carregar documentos vazios, realizar upload e abrir o link de visualização no ProcessDetailsModal', async () => {
    let documents = [];

    fetchMock.mockImplementation((url, options = {}) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (
        urlString ===
          `${API_BASE}/processos/${initialApiProcess.processo_id}/documentos` &&
        options.method === 'POST'
      ) {
        documents = [
          {
            documento_id: 1,
            nome_original: 'peticao-inicial.pdf',
            tamanho_bytes: 2048,
            data_upload: '2026-03-05T00:00:00',
          },
        ];

        return Promise.resolve(jsonResponse({ documento_id: 1 }, 201));
      }

      if (
        urlString ===
        `${API_BASE}/processos/${initialApiProcess.processo_id}/documentos`
      ) {
        return Promise.resolve(jsonResponse(documents));
      }

      if (
        urlString ===
        `${API_BASE}/processos/${initialApiProcess.processo_id}/documentos/1/url`
      ) {
        return Promise.resolve(
          jsonResponse({
            url: 'https://example.com/documento.pdf',
          })
        );
      }

      if (urlString.startsWith(`${API_BASE}/processos/`)) {
        return Promise.resolve(
          jsonResponse(makePageResponse([initialApiProcess]))
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderIntegration();

    await within(screen.getByRole('table')).findByText('Maria Silva');

    fireEvent.click(
      screen.getByRole('button', {
        name: `Visualizar processo ${initialApiProcess.cnj}`,
      })
    );

    const detailsModal = screen.getByRole('dialog', {
      name: initialApiProcess.titulo_proc,
    });

    fireEvent.click(
      within(detailsModal).getByRole('tab', {
        name: 'Documentos',
      })
    );

    await within(detailsModal).findByText('Nenhum documento anexado.');

    const fileInput = within(detailsModal).getByTestId('file-upload-input');

    const file = new File(['conteudo pdf'], 'peticao-inicial.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await within(detailsModal).findByText('peticao-inicial.pdf');

    fireEvent.click(
      within(detailsModal).getByRole('button', {
        name: 'Visualizar',
      })
    );

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com/documento.pdf',
        '_blank'
      )
    );
  });

  it('mantém a modal funcional quando documentos retornam erro e quando o processo não possui movimentações', async () => {
    const processWithoutMovement = {
      ...initialApiProcess,
      processo_id: 19,
      titulo_proc: 'Processo sem movimentações',
      data_inicio: null,
      data_realizado: null,
    };

    fetchMock.mockImplementation((url, options = {}) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (
        urlString ===
          `${API_BASE}/processos/${processWithoutMovement.processo_id}/documentos` &&
        options.method === 'POST'
      ) {
        return Promise.resolve(
          jsonResponse(
            {
              detail: 'Não foi possível enviar o documento.',
            },
            500
          )
        );
      }

      if (
        urlString ===
        `${API_BASE}/processos/${processWithoutMovement.processo_id}/documentos`
      ) {
        return Promise.resolve(
          jsonResponse(
            {
              detail: 'Não foi possível carregar os documentos.',
            },
            500
          )
        );
      }
      if (
        urlString ===
        `${API_BASE}/processos/${processWithoutMovement.processo_id}/movimentacoes`
      ) {
        return Promise.resolve(jsonResponse([]));
      }
      if (urlString.startsWith(`${API_BASE}/processos/`)) {
        return Promise.resolve(
          jsonResponse(makePageResponse([processWithoutMovement]))
        );
      }

      return Promise.resolve(jsonResponse({}, 404));
    });

    renderIntegration({
      initialPage: toProcessPage(makePageResponse([processWithoutMovement])),
    });

    await within(screen.getByRole('table')).findByText('Maria Silva');

    fireEvent.click(
      screen.getByRole('button', {
        name: `Visualizar processo ${processWithoutMovement.cnj}`,
      })
    );

    const detailsModal = screen.getByRole('dialog', {
      name: processWithoutMovement.titulo_proc,
    });

    fireEvent.click(
      within(detailsModal).getByRole('tab', {
        name: 'Movimentações',
      })
    );

    expect(
      await within(detailsModal).findByText(
        'Nenhuma movimentação registrada para este processo.'
      )
    ).toBeInTheDocument();

    fireEvent.click(
      within(detailsModal).getByRole('tab', {
        name: 'Documentos',
      })
    );

    await within(detailsModal).findByRole('alert');

    expect(
      within(detailsModal).getByText('Nenhum documento anexado.')
    ).toBeInTheDocument();

    const fileInput = within(detailsModal).getByTestId('file-upload-input');

    const file = new File(['conteudo pdf'], 'peticao-inicial.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await within(detailsModal).findByText(
      'Não foi possível enviar o documento.'
    );
  });

  it('valida intervalo de datas inválido, limpa filtros e navega entre páginas e status no ProcessTable/ProcessDetailsModal', async () => {
    const page1Processes = [
      {
        ...initialApiProcess,
        processo_id: 10,
        status: 'Concluído',
      },
      {
        ...initialApiProcess,
        processo_id: 11,
        cnj: '0061235-56.2026.8.26.0100',
        titulo_proc: 'Processo Arquivado Teste',
        status: 'Arquivado',
        responsavel_id: null,
      },
      {
        ...initialApiProcess,
        processo_id: 12,
        cnj: '0061236-56.2026.8.26.0100',
        titulo_proc: 'Processo Em Análise Teste',
        status: 'Em Análise',
      },
    ];

    const page2Processes = [
      {
        ...initialApiProcess,
        processo_id: 13,
        cnj: '0061237-56.2026.8.26.0100',
        titulo_proc: 'Processo Página Dois',
        status: 'Ativo',
      },
    ];

    fetchMock.mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.startsWith(`${API_BASE}/clientes/`)) {
        return Promise.resolve(jsonResponse(mockClientes));
      }

      if (urlString.startsWith(`${API_BASE}/funcionarios`)) {
        return Promise.resolve(jsonResponse(mockFuncionarios));
      }

      if (urlString.includes('page=2')) {
        return Promise.resolve(
          jsonResponse(
            makePageResponse(page2Processes, {
              total: 6,
              page: 2,
              total_pages: 2,
            })
          )
        );
      }

      return Promise.resolve(
        jsonResponse(
          makePageResponse(page1Processes, {
            total: 6,
            page: 1,
            total_pages: 2,
          })
        )
      );
    });

    renderIntegration({
      initialPage: toProcessPage(
        makePageResponse(page1Processes, {
          total: 6,
          page: 1,
          total_pages: 2,
        })
      ),
    });

    await within(screen.getByRole('table')).findAllByText('Maria Silva');

    for (const title of [
      initialApiProcess.titulo_proc,
      'Processo Arquivado Teste',
      'Processo Em Análise Teste',
    ]) {
      fireEvent.click(
        screen.getByRole('button', {
          name: title,
        })
      );

      const modal = screen.getByRole('dialog', {
        name: title,
      });

      expect(modal).toBeInTheDocument();

      fireEvent.click(
        within(modal).getByRole('button', {
          name: 'Fechar',
        })
      );
    }

    fireEvent.change(screen.getByLabelText('De:'), {
      target: {
        value: '2026-10-10',
      },
    });

    fireEvent.change(screen.getByLabelText('Até:'), {
      target: {
        value: '2026-05-01',
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à data final.'
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Limpar filtros',
      })
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    expect(screen.getByLabelText('De:')).toHaveValue('');

    expect(screen.getByLabelText('Até:')).toHaveValue('');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Próxima página',
      })
    );

    expect(
      await screen.findByRole('button', {
        name: 'Processo Página Dois',
      })
    ).toBeInTheDocument();

    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Página anterior',
      })
    );

    expect(
      await screen.findByRole('button', {
        name: 'Processo Arquivado Teste',
      })
    ).toBeInTheDocument();

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  describe('exportação de relatórios', () => {
    let downloads;
    let click;

    const exportBlob = new Blob(['relatorio']);
    const exportCalls = () =>
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith(`${API_BASE}/processos/exportar`)
      );

    const mockExportResponse = (response) => {
      const defaultFetch = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url, options) =>
        String(url).startsWith(`${API_BASE}/processos/exportar`)
          ? typeof response === 'function'
            ? response()
            : Promise.resolve(response)
          : defaultFetch(url, options)
      );
    };

    const okExport = () => ({
      ok: true,
      status: 200,
      blob: async () => exportBlob,
    });

    const exportAs = (format) => {
      fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
      fireEvent.click(screen.getByRole('menuitem', { name: format }));
    };

    beforeEach(() => {
      downloads = [];
      URL.createObjectURL = vi.fn(() => 'blob:relatorio');
      URL.revokeObjectURL = vi.fn();
      click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function () {
          downloads.push({ href: this.href, download: this.download });
        });
      mockExportResponse(okExport());
    });

    afterEach(() => {
      click.mockRestore();
      delete URL.createObjectURL;
      delete URL.revokeObjectURL;
    });

    it('exporta em Excel os processos filtrados na tela e baixa o arquivo', async () => {
      renderIntegration();

      await screen.findByRole('option', { name: /Carlos Eduardo/ });
      fireEvent.change(
        screen.getByRole('combobox', { name: /filtrar por responsável/i }),
        { target: { value: '5' } }
      );
      fireEvent.change(
        screen.getByRole('combobox', { name: /filtrar por status/i }),
        { target: { value: 'Arquivado' } }
      );
      await waitFor(() =>
        expect(
          fetchMock.mock.calls.some(([url]) =>
            String(url).includes('status=Arquivado&funcionario_id=5')
          )
        ).toBe(true)
      );

      exportAs('Excel (.xlsx)');

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(downloads[0]).toEqual({
        href: 'blob:relatorio',
        download: expect.stringMatching(/^processos_\d{8}\.xlsx$/),
      });
      expect(URL.createObjectURL).toHaveBeenCalledWith(exportBlob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');

      const [[url, options]] = exportCalls();
      expect(url).toBe(
        `${API_BASE}/processos/exportar?status=Arquivado&funcionario_id=5&formato=xlsx`
      );
      expect(options.headers).toEqual({
        Authorization: `Bearer ${accessToken}`,
      });
    });

    it('exporta com busca por texto e período de prazo informados', async () => {
      renderIntegration();

      fireEvent.change(
        screen.getByPlaceholderText(/buscar por número, cliente ou título/i),
        { target: { value: ' Indenização ' } }
      );
      fireEvent.change(screen.getByLabelText('De:'), {
        target: { value: '2026-05-01' },
      });
      fireEvent.change(screen.getByLabelText('Até:'), {
        target: { value: '2026-05-31' },
      });
      await waitFor(() =>
        expect(
          fetchMock.mock.calls.some(([url]) =>
            String(url).includes(
              'busca=Indeniza%C3%A7%C3%A3o&prazo_inicio=2026-05-01&prazo_fim=2026-05-31'
            )
          )
        ).toBe(true)
      );

      exportAs('CSV');

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(downloads[0].download).toMatch(/^processos_\d{8}\.csv$/);
      expect(exportCalls()[0][0]).toBe(
        `${API_BASE}/processos/exportar?busca=Indeniza%C3%A7%C3%A3o&prazo_inicio=2026-05-01&prazo_fim=2026-05-31&formato=csv`
      );
    });

    it('exporta em PDF sem filtros', async () => {
      renderIntegration();

      exportAs('PDF');

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(downloads[0].download).toMatch(/^processos_\d{8}\.pdf$/);
      expect(exportCalls()[0][0]).toBe(
        `${API_BASE}/processos/exportar?formato=pdf`
      );
    });

    it('desabilita o botão e ignora novos cliques enquanto exporta', async () => {
      let finishExport;
      mockExportResponse(
        () =>
          new Promise((resolve) => {
            finishExport = () => resolve(okExport());
          })
      );
      renderIntegration();

      exportAs('PDF');

      const trigger = await screen.findByRole('button', {
        name: /Exportando…/,
      });
      expect(trigger).toBeDisabled();
      expect(exportCalls()).toHaveLength(1);

      finishExport();

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(screen.getByRole('button', { name: /Exportar/ })).toBeEnabled();
    });

    it.each([
      [401, {}, 'Sessão expirada. Faça login novamente.'],
      [403, {}, 'Você não possui permissão para realizar esta ação.'],
      [
        422,
        { detail: 'A exportação excede 10000 processos' },
        'A exportação excede 10000 processos',
      ],
      [500, {}, 'Não foi possível exportar os processos.'],
    ])(
      'exibe o erro quando a API responde %i e não baixa nada',
      async (status, body, message) => {
        mockExportResponse(jsonResponse(body, status));
        renderIntegration();

        exportAs('CSV');

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(downloads).toHaveLength(0);
      }
    );

    it('exibe mensagem padrão quando o corpo do erro não é JSON válido', async () => {
      mockExportResponse({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('corpo inválido');
        },
      });
      renderIntegration();

      exportAs('CSV');

      expect(
        await screen.findByText('Não foi possível exportar os processos.')
      ).toBeInTheDocument();
    });

    it('exibe mensagem padrão quando a requisição falha na rede', async () => {
      mockExportResponse(() => Promise.reject(new Error('offline')));
      renderIntegration();

      exportAs('PDF');

      expect(
        await screen.findByText('Não foi possível exportar os processos.')
      ).toBeInTheDocument();
    });

    it('informa sessão expirada sem consultar a API quando não há token', async () => {
      renderIntegration();
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({ cargo: { permissao: { visualizar_processos: true } } })
      );
      sessionStorage.removeItem('access_token');

      exportAs('PDF');

      expect(
        await screen.findByText('Sessão expirada. Faça login novamente.')
      ).toBeInTheDocument();
      expect(exportCalls()).toHaveLength(0);
    });

    it('limpa o erro anterior quando uma nova exportação é bem-sucedida', async () => {
      mockExportResponse(jsonResponse({}, 403));
      renderIntegration();

      exportAs('CSV');
      expect(
        await screen.findByText(
          'Você não possui permissão para realizar esta ação.'
        )
      ).toBeInTheDocument();

      mockExportResponse(okExport());
      exportAs('CSV');

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(
        screen.queryByText('Você não possui permissão para realizar esta ação.')
      ).not.toBeInTheDocument();
    });

    it('fecha o menu de exportação com Escape e ao clicar fora', () => {
      renderIntegration();
      const trigger = screen.getByRole('button', { name: /Exportar/ });

      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      fireEvent.click(trigger);
      fireEvent.mouseDown(
        screen.getByRole('heading', { level: 1, name: 'Gestão de Processos' })
      );
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('desabilita a exportação enquanto o intervalo de datas é inválido', () => {
      renderIntegration();

      fireEvent.change(screen.getByLabelText('De:'), {
        target: { value: '2026-09-30' },
      });
      fireEvent.change(screen.getByLabelText('Até:'), {
        target: { value: '2026-09-01' },
      });

      expect(screen.getByRole('button', { name: /Exportar/ })).toBeDisabled();
    });
  });

  describe('detalhes do processo e documentos', () => {
    const doc = {
      documento_id: 1,
      nome_original: 'peticao.pdf',
      tamanho_bytes: 2048,
      data_upload: '2026-09-01T10:00:00',
    };

    const routeProcessApi = (
      {
        list = () => jsonResponse([]),
        upload = () => jsonResponse({}),
        documentUrl = () =>
          jsonResponse({ url: 'https://example.com/doc.pdf' }),
      } = {},
      proc = initialApiProcess
    ) => {
      const docsUrl = `${API_BASE}/processos/${proc.processo_id}/documentos`;
      fetchMock.mockImplementation((url, options = {}) => {
        const target = String(url);
        let result;

        if (target.startsWith(`${API_BASE}/clientes/`)) {
          result = jsonResponse(mockClientes);
        } else if (target.startsWith(`${API_BASE}/funcionarios`)) {
          result = jsonResponse(mockFuncionarios);
        } else if (target === docsUrl && options.method === 'POST') {
          result = upload();
        } else if (
          target.startsWith(`${docsUrl}/`) &&
          target.endsWith('/url')
        ) {
          result = documentUrl();
        } else if (target === docsUrl) {
          result = list();
        } else if (target.startsWith(`${API_BASE}/processos/`)) {
          result = jsonResponse(makePageResponse([proc]));
        } else {
          result = jsonResponse({}, 404);
        }

        return Promise.resolve(result);
      });
    };

    const openDetails = async (proc = initialApiProcess) => {
      renderIntegration({
        initialPage: toProcessPage(makePageResponse([proc])),
      });
      await within(screen.getByRole('table')).findByText('Maria Silva');
      fireEvent.click(
        screen.getByRole('button', {
          name: `Visualizar processo ${proc.cnj}`,
        })
      );
      return screen.getByRole('dialog', { name: proc.titulo_proc });
    };

    const openDocumentsTab = (modal) =>
      fireEvent.click(within(modal).getByRole('tab', { name: 'Documentos' }));

    it('navega entre as abas com o teclado e ignora outras teclas', async () => {
      routeProcessApi();
      const modal = await openDetails();
      const tab = (name) => within(modal).getByRole('tab', { name });

      fireEvent.keyDown(tab('Resumo'), { key: 'ArrowRight' });
      expect(tab('Movimentações')).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(tab('Movimentações'), { key: 'ArrowLeft' });
      expect(tab('Resumo')).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(tab('Resumo'), { key: 'End' });
      expect(tab('Documentos')).toHaveAttribute('aria-selected', 'true');
      await within(modal).findByText('Nenhum documento anexado.');

      fireEvent.keyDown(tab('Documentos'), { key: 'Home' });
      expect(tab('Resumo')).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(tab('Resumo'), { key: 'a' });
      expect(tab('Resumo')).toHaveAttribute('aria-selected', 'true');
    });

    it('trata uma lista de documentos em formato inesperado como vazia', async () => {
      routeProcessApi({ list: () => jsonResponse({ itens: [] }) });
      const modal = await openDetails();

      openDocumentsTab(modal);

      expect(
        await within(modal).findByText('Nenhum documento anexado.')
      ).toBeInTheDocument();
    });

    it('informa o erro ao carregar os documentos', async () => {
      routeProcessApi({
        list: () => jsonResponse({ detail: 'Falha nos documentos' }, 500),
      });
      const modal = await openDetails();

      openDocumentsTab(modal);

      expect(await within(modal).findByRole('alert')).toHaveTextContent(
        'Falha nos documentos'
      );
    });

    it('ignora a seleção de arquivo vazia e informa falha no envio', async () => {
      routeProcessApi({
        upload: () => jsonResponse({ detail: 'Arquivo recusado' }, 422),
      });
      const modal = await openDetails();
      openDocumentsTab(modal);
      await within(modal).findByText('Nenhum documento anexado.');
      const input = within(modal).getByTestId('file-upload-input');

      fireEvent.change(input, { target: { files: [] } });
      expect(
        fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')
      ).toBe(false);

      fireEvent.change(input, {
        target: {
          files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })],
        },
      });

      expect(await within(modal).findByRole('alert')).toHaveTextContent(
        'Arquivo recusado'
      );
    });

    it('mostra o estado de envio e de recarga ao anexar um documento à lista existente', async () => {
      let finishUpload;
      let finishReload;
      let listCalls = 0;
      routeProcessApi({
        list: () => {
          listCalls += 1;
          if (listCalls === 1) return jsonResponse([doc]);
          return new Promise((resolve) => {
            finishReload = () => resolve(jsonResponse([doc]));
          });
        },
        upload: () =>
          new Promise((resolve) => {
            finishUpload = () => resolve(jsonResponse({}));
          }),
      });
      const modal = await openDetails();
      openDocumentsTab(modal);
      await within(modal).findByText('peticao.pdf');
      expect(
        within(modal).getByText('2.0 KB •', { exact: false })
      ).toBeVisible();

      fireEvent.change(within(modal).getByTestId('file-upload-input'), {
        target: {
          files: [new File(['x'], 'b.pdf', { type: 'application/pdf' })],
        },
      });

      expect(
        await within(modal).findByRole('button', { name: 'Enviando…' })
      ).toBeDisabled();

      finishUpload();
      expect(
        await within(modal).findByText('Carregando documentos…')
      ).toBeInTheDocument();

      finishReload();
      expect(await within(modal).findByText('peticao.pdf')).toBeInTheDocument();
    });

    it('não abre nada quando a API não devolve o link e informa falha ao obtê-lo', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      routeProcessApi({
        list: () => jsonResponse([doc]),
        documentUrl: () => jsonResponse({}),
      });
      const modal = await openDetails();
      openDocumentsTab(modal);
      await within(modal).findByText('peticao.pdf');

      fireEvent.click(
        within(modal).getByRole('button', { name: 'Visualizar' })
      );
      await waitFor(() =>
        expect(
          fetchMock.mock.calls.some(([url]) => String(url).endsWith('/url'))
        ).toBe(true)
      );
      expect(openSpy).not.toHaveBeenCalled();

      routeProcessApi({
        list: () => jsonResponse([doc]),
        documentUrl: () => jsonResponse({ detail: 'Sem acesso' }, 403),
      });
      fireEvent.click(
        within(modal).getByRole('button', { name: 'Visualizar' })
      );

      expect(await within(modal).findByRole('alert')).toBeInTheDocument();
      openSpy.mockRestore();
    });

    it('usa mensagens padrão quando os serviços de documentos falham sem Error', async () => {
      const list = vi
        .spyOn(processosService, 'listarDocumentos')
        .mockRejectedValueOnce('falha')
        .mockResolvedValueOnce([doc])
        .mockResolvedValueOnce('formato inesperado')
        .mockRejectedValue('falha');
      const upload = vi
        .spyOn(processosService, 'uploadDocumento')
        .mockRejectedValue('falha');
      const documentUrl = vi
        .spyOn(processosService, 'obterUrlDocumento')
        .mockRejectedValue('falha');
      routeProcessApi();
      const modal = await openDetails();

      openDocumentsTab(modal);
      expect(await within(modal).findByRole('alert')).toHaveTextContent(
        'Falha ao carregar documentos.'
      );

      fireEvent.click(within(modal).getByRole('tab', { name: 'Resumo' }));
      openDocumentsTab(modal);
      await within(modal).findByText('peticao.pdf');

      fireEvent.change(within(modal).getByTestId('file-upload-input'), {
        target: {
          files: [new File(['x'], 'c.pdf', { type: 'application/pdf' })],
        },
      });
      expect(await within(modal).findByRole('alert')).toHaveTextContent(
        'Falha ao enviar documento.'
      );

      fireEvent.click(
        within(modal).getByRole('button', { name: 'Visualizar' })
      );
      await waitFor(() =>
        expect(within(modal).getByRole('alert')).toHaveTextContent(
          'Falha ao abrir documento.'
        )
      );

      list.mockRestore();
      upload.mockRestore();
      documentUrl.mockRestore();
    });

    it('recarrega a lista com formato inesperado após o envio e falha ao recarregar sem Error', async () => {
      const list = vi
        .spyOn(processosService, 'listarDocumentos')
        .mockResolvedValueOnce([doc])
        .mockResolvedValueOnce('formato inesperado')
        .mockRejectedValue('falha');
      const upload = vi
        .spyOn(processosService, 'uploadDocumento')
        .mockResolvedValue({});
      routeProcessApi();
      const modal = await openDetails();
      openDocumentsTab(modal);
      await within(modal).findByText('peticao.pdf');
      const input = within(modal).getByTestId('file-upload-input');

      fireEvent.change(input, {
        target: {
          files: [new File(['x'], 'd.pdf', { type: 'application/pdf' })],
        },
      });
      expect(
        await within(modal).findByText('Nenhum documento anexado.')
      ).toBeInTheDocument();

      fireEvent.change(input, {
        target: {
          files: [new File(['x'], 'e.pdf', { type: 'application/pdf' })],
        },
      });
      expect(await within(modal).findByRole('alert')).toHaveTextContent(
        'Falha ao carregar documentos.'
      );

      list.mockRestore();
      upload.mockRestore();
    });

    it('descarta a lista de documentos quando a aba é fechada antes da resposta', async () => {
      let finishList;
      routeProcessApi({
        list: () =>
          new Promise((resolve) => {
            finishList = () => resolve(jsonResponse([doc]));
          }),
      });
      const modal = await openDetails();

      openDocumentsTab(modal);
      fireEvent.click(within(modal).getByRole('tab', { name: 'Resumo' }));
      finishList();

      await waitFor(() =>
        expect(within(modal).queryByText('peticao.pdf')).not.toBeInTheDocument()
      );
    });

    it('descarta o erro de documentos quando a aba é fechada antes da resposta', async () => {
      let failList;
      routeProcessApi({
        list: () =>
          new Promise((resolve) => {
            failList = () => resolve(jsonResponse({ detail: 'Falha' }, 500));
          }),
      });
      const modal = await openDetails();

      openDocumentsTab(modal);
      fireEvent.click(within(modal).getByRole('tab', { name: 'Resumo' }));
      failList();

      await Promise.resolve();
      expect(within(modal).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('usa valores padrão para área e tribunal ausentes', async () => {
      const bare = {
        ...initialApiProcess,
        area: null,
        tribunal: null,
        status: 'Em Análise',
      };
      routeProcessApi({}, bare);
      const modal = await openDetails(bare);

      expect(within(modal).getByText('Geral')).toBeInTheDocument();

      fireEvent.click(
        within(modal).getByRole('tab', { name: 'Movimentações' })
      );
      expect(within(modal).getByText('Tribunal de Origem')).toBeInTheDocument();
    });
  });

  describe('casos de borda do formulário, da sincronização e da exclusão', () => {
    const respondTo = (matcher) => {
      const previous = fetchMock.getMockImplementation();
      fetchMock.mockImplementation((url, options = {}) => {
        const result = matcher(String(url), options);
        return result === undefined
          ? previous(url, options)
          : Promise.resolve(result);
      });
    };

    const pendingResponse = () => {
      let resolve;
      const promise = new Promise((done) => {
        resolve = done;
      });
      return { promise, resolve };
    };

    const waitForTable = () =>
      within(screen.getByRole('table')).findByText('Maria Silva');

    const fillNewProcess = (dialog) => {
      fireEvent.change(within(dialog).getByLabelText('Número do Processo'), {
        target: { value: '12345678920268070001' },
      });
      fireEvent.change(within(dialog).getByLabelText('Tribunal'), {
        target: { value: 'TJSP' },
      });
      fireEvent.change(within(dialog).getByLabelText('Título do Caso'), {
        target: { value: 'Caso de borda' },
      });
      fireEvent.change(within(dialog).getByLabelText('Cliente'), {
        target: { value: '7' },
      });
      fireEvent.change(within(dialog).getByLabelText('Área de Atuação'), {
        target: { value: 'Civil' },
      });
    };

    const openNewProcess = async () => {
      renderIntegration();
      await waitForTable();
      fireEvent.click(screen.getByRole('button', { name: 'Novo Processo' }));
      return screen.getByRole('dialog', { name: 'Novo Processo' });
    };

    it('ignora o segundo envio do formulário enquanto o primeiro está em andamento', async () => {
      const post = pendingResponse();
      respondTo((url, options) =>
        url === `${API_BASE}/processos/` && options.method === 'POST'
          ? post.promise
          : undefined
      );
      const dialog = await openNewProcess();
      fillNewProcess(dialog);

      fireEvent.submit(dialog);
      fireEvent.submit(dialog);

      expect(
        fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')
      ).toHaveLength(1);

      post.resolve(
        jsonResponse({ ...initialApiProcess, processo_id: 99 }, 201)
      );
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Novo Processo' })
        ).not.toBeInTheDocument()
      );
    });

    it('usa mensagem padrão quando o salvamento falha sem Error', async () => {
      const create = vi
        .spyOn(processosService, 'criarProcesso')
        .mockRejectedValue('falha');
      const dialog = await openNewProcess();
      fillNewProcess(dialog);

      fireEvent.submit(dialog);

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Não foi possível salvar o processo.'
      );
      create.mockRestore();
    });

    it('lista como responsáveis os funcionários identificados apenas por id', async () => {
      respondTo((url) =>
        url.startsWith(`${API_BASE}/funcionarios`)
          ? jsonResponse([{ id: 8, nome: 'Fulano por Id' }])
          : undefined
      );
      const dialog = await openNewProcess();

      expect(
        await within(dialog).findByRole('option', { name: 'Fulano por Id' })
      ).toHaveValue('8');
    });

    it('bloqueia a página quando não há sessão nem usuário', () => {
      sessionStorage.clear();

      renderIntegration();

      expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    });

    it('informa a falha ao carregar clientes e responsáveis', async () => {
      respondTo((url) =>
        url.startsWith(`${API_BASE}/clientes/`)
          ? jsonResponse({ detail: 'Falha nos clientes' }, 500)
          : undefined
      );

      renderIntegration();

      expect(await screen.findByText('Falha nos clientes')).toBeInTheDocument();
    });

    it('usa mensagem padrão quando a falha das referências não é um Error', async () => {
      const clients = vi
        .spyOn(clientesService, 'listarClientes')
        .mockRejectedValue('falha');

      renderIntegration();

      expect(
        await screen.findByText(
          'Não foi possível carregar clientes e responsáveis.'
        )
      ).toBeInTheDocument();
      clients.mockRestore();
    });

    it('identifica clientes e processos por campos alternativos', async () => {
      const withoutId = {
        ...initialApiProcess,
        processo_id: undefined,
        cnj: '0000001-00.2026.8.26.0001',
        cliente_id: null,
      };
      respondTo((url) => {
        if (url.startsWith(`${API_BASE}/clientes/`)) {
          return jsonResponse([{ id: 4, nome: 'Maria Silva' }]);
        }
        if (url.startsWith(`${API_BASE}/funcionarios`)) {
          return jsonResponse([{ id: 3, nome: 'Ana Paula Ribeiro' }]);
        }
        return undefined;
      });

      renderIntegration({
        initialPage: toProcessPage(
          makePageResponse([initialApiProcess, withoutId])
        ),
      });

      const table = screen.getByRole('table');
      expect(await within(table).findByText('Maria Silva')).toBeInTheDocument();
      expect(within(table).getByText('Sem cliente')).toBeInTheDocument();
    });

    it('usa mensagem padrão quando a listagem inicial falha sem Error', async () => {
      const list = vi
        .spyOn(processosService, 'listarProcessos')
        .mockRejectedValue('falha');

      renderIntegration({ initialPage: undefined });

      expect(
        await screen.findByText('Não foi possível carregar os processos.')
      ).toBeInTheDocument();
      list.mockRestore();
    });

    it('ignora a listagem que chega depois da desmontagem', async () => {
      const list = pendingResponse();
      respondTo((url) =>
        url.startsWith(`${API_BASE}/processos/?`) ? list.promise : undefined
      );

      const { unmount } = renderIntegration({ initialPage: undefined });
      unmount();
      list.resolve(jsonResponse(makePageResponse([initialApiProcess])));

      await Promise.resolve();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('sincroniza uma única vez por clique e informa o total no plural', async () => {
      const sync = pendingResponse();
      respondTo((url, options) =>
        url === `${API_BASE}/processos/sincronizar` && options.method === 'POST'
          ? sync.promise
          : undefined
      );
      renderIntegration();
      await waitForTable();
      const button = screen.getByRole('button', {
        name: 'Sincronizar com DataJud',
      });

      fireEvent.click(button);
      fireEvent.click(button);

      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).endsWith('/sincronizar')
        )
      ).toHaveLength(1);

      sync.resolve(jsonResponse({ atualizados: 3 }));

      expect(
        await screen.findByText(
          'Sincronização concluída: 3 processos atualizados.'
        )
      ).toBeInTheDocument();
    });

    it('mantém o detalhe sem nova consulta ao editar o processo aberto', async () => {
      renderIntegration();
      await waitForTable();

      fireEvent.click(
        screen.getByRole('button', {
          name: `Visualizar processo ${initialApiProcess.cnj}`,
        })
      );
      await screen.findByRole('dialog', {
        name: initialApiProcess.titulo_proc,
      });

      fireEvent.click(
        screen.getByRole('button', {
          name: `Editar processo ${initialApiProcess.cnj}`,
        })
      );
      const form = screen.getByRole('dialog', { name: 'Editar Processo' });
      fireEvent.change(within(form).getByLabelText('Título do Caso'), {
        target: { value: 'Título atualizado' },
      });
      respondTo((url, options) =>
        options.method === 'PATCH'
          ? jsonResponse({
              ...initialApiProcess,
              titulo_proc: 'Título atualizado',
            })
          : undefined
      );

      fireEvent.submit(form);

      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Editar Processo' })
        ).not.toBeInTheDocument()
      );
      expect(
        screen.getByRole('dialog', { name: 'Título atualizado' })
      ).toBeInTheDocument();
    });

    it('fecha o detalhe ao excluir o processo aberto e não fecha a confirmação durante a exclusão', async () => {
      const removal = pendingResponse();
      renderIntegration();
      await waitForTable();

      fireEvent.click(
        screen.getByRole('button', {
          name: `Visualizar processo ${initialApiProcess.cnj}`,
        })
      );
      await screen.findByRole('dialog', {
        name: initialApiProcess.titulo_proc,
      });
      respondTo((url, options) =>
        options.method === 'DELETE' ? removal.promise : undefined
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: `Excluir processo ${initialApiProcess.cnj}`,
        })
      );
      const confirmation = screen.getByRole('dialog', {
        name: 'Excluir processo?',
      });
      fireEvent.click(
        within(confirmation).getByRole('button', { name: 'Excluir processo' })
      );

      fireEvent.click(
        within(confirmation).getByRole('button', { name: /Cancelar/ })
      );
      expect(
        screen.getByRole('dialog', { name: 'Excluir processo?' })
      ).toBeInTheDocument();

      removal.resolve({
        ok: true,
        status: 204,
        json: vi.fn().mockResolvedValue(undefined),
      });

      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: initialApiProcess.titulo_proc })
        ).not.toBeInTheDocument()
      );
    });

    it('ignora o detalhe que chega depois da desmontagem', async () => {
      const detail = pendingResponse();
      const { unmount } = renderIntegration();
      await waitForTable();
      respondTo((url) =>
        url.includes('processo_id=') ? detail.promise : undefined
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: `Visualizar processo ${initialApiProcess.cnj}`,
        })
      );
      unmount();
      detail.resolve(jsonResponse(makePageResponse([initialApiProcess])));

      await Promise.resolve();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
