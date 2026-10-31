import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      expect.objectContaining({ cache: 'no-store' })
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
      within(detailsModal).getByRole('button', { name: 'Fechar' })
    );
    expect(
      screen.queryByRole('dialog', { name: initialApiProcess.titulo_proc })
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

    const dialog = screen.getByRole('dialog', { name: 'Novo Processo' });
    const cnjInput = within(dialog).getByLabelText('Número do Processo');

    fireEvent.change(cnjInput, {
      target: { value: '12345678920268070001' },
    });
    expect(cnjInput).toHaveValue('1234567-89.2026.8.07.0001');

    fireEvent.change(within(dialog).getByLabelText('Tribunal'), {
      target: { value: '  TJSP  ' },
    });
    fireEvent.change(within(dialog).getByLabelText('Título do Caso'), {
      target: { value: '  Execução de Título Extrajudicial  ' },
    });
    fireEvent.change(within(dialog).getByLabelText('Descrição'), {
      target: { value: '  Cobrança de contrato empresarial.  ' },
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
        screen.queryByRole('dialog', { name: 'Novo Processo' })
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

    let getCount = 0;
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
        return Promise.resolve(jsonResponse(updatedApiProcess));
      }
      if (
        urlString ===
          `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        options.method === 'DELETE'
      ) {
        return Promise.resolve({
          ok: true,
          status: 204,
          json: vi.fn().mockResolvedValue(undefined),
        });
      }
      if (urlString.startsWith(`${API_BASE}/processos/?`)) {
        getCount += 1;
        if (getCount === 1) {
          return Promise.resolve(
            jsonResponse(makePageResponse([updatedApiProcess], { total: 1 }))
          );
        }
        return Promise.resolve(
          jsonResponse(makePageResponse([], { total: 0 }))
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

    const editDialog = screen.getByRole('dialog', { name: 'Editar Processo' });
    expect(
      within(editDialog).getByLabelText('Número do Processo')
    ).toHaveAttribute('readOnly');

    fireEvent.change(within(editDialog).getByLabelText('Título do Caso'), {
      target: { value: 'Ação Indenizatória Revisada' },
    });
    fireEvent.change(within(editDialog).getByLabelText('Status'), {
      target: { value: 'Concluído' },
    });

    fireEvent.submit(editDialog);

    expect(
      await screen.findByRole('button', {
        name: 'Ação Indenizatória Revisada',
      })
    ).toBeInTheDocument();

    const patchCall = fetchMock.mock.calls.find(
      ([url, opts]) =>
        url === `${API_BASE}/processos/${initialApiProcess.processo_id}` &&
        opts?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    expect(patchCall[1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    });
    expect(JSON.parse(patchCall[1].body)).toEqual({
      titulo: 'Ação Indenizatória Revisada',
      status: 'Concluído',
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
      within(deleteDialog).getByRole('button', { name: 'Excluir processo' })
    );

    expect(
      await screen.findByText('Nenhum processo cadastrado')
    ).toBeInTheDocument();

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
          screen.getByRole('combobox', { name: /filtrar por status/i }),
          { target: { value: 'Arquivado' } }
        ),
      'status=Arquivado&page=1&page_size=5',
    ],
    [
      'responsável',
      () =>
        fireEvent.change(
          screen.getByRole('combobox', { name: /filtrar por responsável/i }),
          { target: { value: '5' } }
        ),
      'responsavel_id=5&page=1&page_size=5',
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
          { target: { value: '  Indenização  ' } }
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
        expect(fetchMock).toHaveBeenCalledWith(
          `${API_BASE}/processos/?${expectedQuery}`,
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
      { detail: 'Já existe um processo cadastrado com este CNJ.' },
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
          { loc: ['body', 'tribunal'], msg: 'Field required', type: 'missing' },
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

      fireEvent.click(screen.getByRole('button', { name: 'Novo Processo' }));
      const dialog = screen.getByRole('dialog', { name: 'Novo Processo' });

      fireEvent.change(within(dialog).getByLabelText('Número do Processo'), {
        target: { value: '0061235-56.2026.8.26.0100' },
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
        screen.getByRole('dialog', { name: 'Novo Processo' })
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

      fireEvent.click(screen.getByRole('button', { name: 'Novo Processo' }));
      const dialog = screen.getByRole('dialog', { name: 'Novo Processo' });

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
            { detail: 'Processo possui movimentações vinculadas.' },
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
      within(deleteDialog).getByRole('button', { name: 'Excluir processo' })
    );

    expect(await within(deleteDialog).findByRole('alert')).toHaveTextContent(
      'Processo possui movimentações vinculadas.'
    );
  });

  it('carrega ProcessosPage via getProcessosData com sucesso e trata erros de carregamento e recuperação', async () => {
    const successElement = await ProcessosPage();
    const { unmount } = render(successElement);

    expect(
      screen.getByRole('heading', { name: 'Gestão de Processos' })
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

  it('valida intervalo de datas inválido, limpa filtros e navega entre páginas e status no ProcessTable/ProcessDetailsModal', async () => {
    const page1Processes = [
      { ...initialApiProcess, processo_id: 10, status: 'Concluído' },
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
      fireEvent.click(screen.getByRole('button', { name: title }));
      const modal = screen.getByRole('dialog', { name: title });
      expect(modal).toBeInTheDocument();
      fireEvent.click(within(modal).getByRole('button', { name: 'Fechar' }));
    }

    fireEvent.change(screen.getByLabelText('De:'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('Até:'), {
      target: { value: '2026-05-01' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A data inicial não pode ser posterior à data final.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('De:')).toHaveValue('');
    expect(screen.getByLabelText('Até:')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(
      await screen.findByRole('button', { name: 'Processo Página Dois' })
    ).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(
      await screen.findByRole('button', { name: 'Processo Arquivado Teste' })
    ).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });
});
