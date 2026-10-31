import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientesPage from './page';
import ClientesClient from './clientesClient';
import { listarClientes, obterCliente } from '@/services/clientes';
import {
  formatarCpfCnpj,
  formatarDataInteracao,
  formatarTelefone,
  obterEtapaPorId,
  obterEtapaPorLabel,
  obterIniciais,
  validarDadosCliente,
} from '@/utils/cliente';

const mockFuncionarios = [
  {
    funcionario_id: 1,
    id: 1,
    nome: 'Dr. Lucas Mendes',
    cargo: { nome_cargo: 'Advogado Sênior' },
  },
  {
    id: 2,
    nome: 'Dra. Beatriz Santos',
    cargo: { nome_cargo: 'Sócia' },
  },
];

const mockClientesIniciais = [
  {
    cliente_id: 101,
    nome: 'Empresa Alpha Ltda',
    documento: '12.345.678/0001-90',
    cnpj: '12345678000190',
    telefone: '11988881111',
    email: 'contato@alpha.com',
    responsavel_id: 1,
    responsavel_nome: 'Dr. Lucas Mendes',
    etapa_id: 1, // Novo contato
    ultima_interacao: '2026-10-01T10:00:00Z',
  },
  {
    cliente_id: 102,
    nome: 'Beatriz Pereira',
    documento: '123.456.789-00',
    cpf: '12345678900',
    telefone: '21977772222',
    email: 'beatriz@gmail.com',
    responsavel_id: 2,
    responsavel_nome: 'Dra. Beatriz Santos',
    etapa_id: 4, // Cliente ativo
    ultima_interacao: '2026-10-02T15:30:00Z',
  },
];

describe('US22 - Visualizar e Gerenciar Clientes (Integração)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.setItem('access_token', 'token-integracao-123');
  });

  it('renderiza o fluxo completo: visualização, filtros, cadastro, edição e exclusão via HTTP fetch', async () => {
    render(
      <ClientesClient
        initialClientes={mockClientesIniciais}
        initialFuncionarios={mockFuncionarios}
      />
    );

    // 1. Verificação da listagem inicial
    expect(
      screen.getByRole('heading', { name: 'Clientes' })
    ).toBeInTheDocument();
    expect(screen.getByText(/2 clientes cadastrados/)).toBeInTheDocument();
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();

    // 2. Filtro por busca
    const searchInput = screen.getByLabelText('Buscar clientes');
    fireEvent.change(searchInput, { target: { value: 'alpha' } });
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    expect(screen.queryByText('Beatriz Pereira')).not.toBeInTheDocument();

    // Limpar busca
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();

    // 3. Abrir Detalhes do Cliente
    const viewButtons = screen.getAllByLabelText(/visualizar detalhes/i);
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText('Detalhes do Cliente')).toBeInTheDocument();
    expect(
      screen.getAllByText('contato@alpha.com').length
    ).toBeGreaterThanOrEqual(1);

    // Fechar Detalhes
    const closeBtns = screen.getAllByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByText('Detalhes do Cliente')).not.toBeInTheDocument();

    // 4. Cadastrar Novo Cliente com autocomplete de responsável (POST /clientes/)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        cliente_id: 103,
        nome: 'Carlos Eduardo',
        cpf: '33344455566',
        telefone: '(31) 96666-3333',
        email: 'carlos@teste.com',
        responsavel_id: 1,
        etapa_id: 2,
        ultima_interacao: new Date().toISOString(),
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    expect(screen.getByText('Cadastrar Novo Cliente')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Carlos Eduardo' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'carlos@teste.com' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '31966663333' },
    });
    fireEvent.change(screen.getByLabelText(/cpf \/ cnpj/i), {
      target: { value: '33344455566' },
    });

    // Selecionar responsável no autocomplete
    const respCombobox = screen.getByPlaceholderText('Selecione o responsável');
    fireEvent.focus(respCombobox);
    fireEvent.change(respCombobox, { target: { value: 'Lucas' } });
    const listbox = screen.getByRole('listbox');
    const optionLucas = within(listbox).getByText(/dr\. lucas mendes/i);
    fireEvent.click(optionLucas);

    // Salvar cadastro
    fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/clientes\/$/),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-integracao-123',
          }),
          body: expect.stringContaining('"nome":"Carlos Eduardo"'),
        })
      );
      expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
      expect(
        screen.getByText('Cliente cadastrado com sucesso!')
      ).toBeInTheDocument();
    });

    // 5. Editar o cliente recém-cadastrado (PUT /clientes/103)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cliente_id: 103,
        nome: 'Carlos Eduardo Santos',
        telefone: '(31) 96666-3333',
        email: 'carlos@teste.com',
        responsavel_id: 1,
        etapa_id: 3,
      }),
    });

    const editButtons = screen.getAllByLabelText(/editar cliente/i);
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    const editNome = screen.getByLabelText(/nome completo/i);
    fireEvent.change(editNome, { target: { value: 'Carlos Eduardo Santos' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/clientes\/103$/),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-integracao-123',
          }),
          body: expect.stringContaining('"nome":"Carlos Eduardo Santos"'),
        })
      );
      expect(screen.getByText('Carlos Eduardo Santos')).toBeInTheDocument();
      expect(
        screen.getByText('Cliente atualizado com sucesso!')
      ).toBeInTheDocument();
    });

    // 6. Excluir cliente (DELETE /clientes/103)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const deleteButtons = screen.getAllByLabelText(/excluir cliente/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Excluir cliente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/clientes\/103$/),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-integracao-123',
          }),
        })
      );
      expect(
        screen.queryByText('Carlos Eduardo Santos')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Cliente excluído com sucesso!')
      ).toBeInTheDocument();
    });
  }, 15000);

  it.each([
    {
      cenario: 'erro 422 Pydantic de e-mail inválido no backend',
      setupFetch: () =>
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({
            detail: [{ msg: 'value is not a valid email address' }],
          }),
        }),
      expectedAlert: 'Informe um e-mail válido.',
    },
    {
      cenario: 'erro 422 Pydantic de campo obrigatório ausente',
      setupFetch: () =>
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({
            detail: [{ msg: 'Field required' }],
          }),
        }),
      expectedAlert: 'Preencha todos os campos obrigatórios.',
    },
    {
      cenario: 'erro 400 de regra de negócio com detail em texto',
      setupFetch: () =>
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            detail: 'CPF já cadastrado para outro cliente.',
          }),
        }),
      expectedAlert: 'CPF já cadastrado para outro cliente.',
    },
    {
      cenario: 'erro 500 interno sem detail estruturado',
      setupFetch: () =>
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({}),
        }),
      expectedAlert: 'Não foi possível cadastrar o cliente.',
    },
    {
      cenario: 'falha de rede (Failed to fetch) ao comunicar com a API',
      setupFetch: () =>
        global.fetch.mockRejectedValueOnce(new Error('Failed to fetch')),
      expectedAlert:
        'Erro de conexão com o servidor. Tente novamente em instantes.',
    },
  ])(
    'traduz e exibe alerta de erro na criação de cliente quando ocorre $cenario',
    async ({ setupFetch, expectedAlert }) => {
      setupFetch();

      render(
        <ClientesClient
          initialClientes={mockClientesIniciais}
          initialFuncionarios={mockFuncionarios}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));

      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: 'Cliente Erro Teste' },
      });
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: 'teste@erro.com' },
      });
      fireEvent.change(screen.getByLabelText(/telefone/i), {
        target: { value: '11999998888' },
      });

      fireEvent.click(screen.getByRole('button', { name: /salvar cadastro/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/clientes\/$/),
          expect.objectContaining({ method: 'POST' })
        );
        expect(
          screen.getAllByText(expectedAlert).length
        ).toBeGreaterThanOrEqual(1);
      });
    }
  );

  it.each([
    {
      cenario: 'erro 400 de restrição de integridade na exclusão',
      status: 400,
      payload: { detail: 'Cliente possui processos ativos vinculados.' },
      expectedAlert: 'Cliente possui processos ativos vinculados.',
    },
    {
      cenario: 'erro 500 interno na exclusão sem detail',
      status: 500,
      payload: {},
      expectedAlert: 'Não foi possível excluir o cliente.',
    },
  ])(
    'exibe alerta de erro ao excluir cliente quando ocorre $cenario',
    async ({ status, payload, expectedAlert }) => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => payload,
      });

      render(
        <ClientesClient
          initialClientes={mockClientesIniciais}
          initialFuncionarios={mockFuncionarios}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/excluir cliente/i);
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/clientes\/101$/),
          expect.objectContaining({ method: 'DELETE' })
        );
        expect(
          screen.getAllByText(expectedAlert).length
        ).toBeGreaterThanOrEqual(1);
      });
    }
  );

  it('renderiza ClientesPage (SSR) buscando clientes e funcionários via API', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockClientesIniciais,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFuncionarios,
      });

    const pageElement = await ClientesPage();
    render(pageElement);

    expect(
      screen.getByRole('heading', { name: 'Clientes' })
    ).toBeInTheDocument();
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();
  });

  it('busca clientes e funcionários no cliente quando initialClientes e initialFuncionarios estão vazios e trata falhas silenciosamente', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockClientesIniciais,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFuncionarios,
      });

    const { unmount } = render(<ClientesClient />);

    await waitFor(() => {
      expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    });
    unmount();

    // Testa também quando as chamadas iniciais falham (catch silencioso no useEffect)
    global.fetch
      .mockRejectedValueOnce(new Error('Erro ao carregar clientes'))
      .mockRejectedValueOnce(new Error('Erro ao carregar funcionarios'));

    render(<ClientesClient initialClientes={[]} initialFuncionarios={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum cliente encontrado')).toBeInTheDocument();
    });
  });

  it('filtra clientes por texto (nome, email, CPF, CNPJ), responsável (teclado, limpar, clique fora) e status, e limpa filtros', async () => {
    const clientesVariados = [
      ...mockClientesIniciais,
      {
        id: 104,
        nome: 'Cliente Responsavel String',
        documento: 'DOC-ESPECIAL-99',
        email: 'string@resp.com',
        responsavel: 'Dr. Lucas Mendes',
        status_id: 2,
        ultima_interacao: 'data-invalida',
      },
      {
        id: 105,
        nome: 'Cliente Responsavel Objeto',
        email: 'obj@resp.com',
        responsavel: { nome: 'Dra. Beatriz Santos' },
        etapa_id: 3,
      },
      {
        id: 106,
        nome: 'Sem Responsavel',
        email: 'sem@resp.com',
        etapa_id: 5,
      },
    ];

    render(
      <ClientesClient
        initialClientes={clientesVariados}
        initialFuncionarios={mockFuncionarios}
      />
    );

    const searchInput = screen.getByLabelText('Buscar clientes');

    // Filtro por email
    fireEvent.change(searchInput, { target: { value: 'beatriz@gmail.com' } });
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();
    expect(screen.getByText('1 cliente cadastrado')).toBeInTheDocument();
    expect(screen.queryByText('Empresa Alpha Ltda')).not.toBeInTheDocument();

    // Filtro por CPF (dígitos)
    fireEvent.change(searchInput, { target: { value: '12345678900' } });
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();

    // Filtro por CNPJ (formatado)
    fireEvent.change(searchInput, { target: { value: '12.345.678/0001-90' } });
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();

    // Filtro por documento alfanumérico (sem dígitos suficientes)
    fireEvent.change(searchInput, { target: { value: 'doc-especial' } });
    expect(screen.getByText('Cliente Responsavel String')).toBeInTheDocument();

    // Busca sem resultados (Empty state da ClientTable)
    fireEvent.change(searchInput, {
      target: { value: 'inexistente-xyz-9999' },
    });
    expect(screen.getByText('Nenhum cliente encontrado')).toBeInTheDocument();

    // Limpar filtros pelo botão
    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();

    // Filtro por Responsável via AutocompleteResponsible usando teclado (ArrowDown, ArrowUp, Enter, Escape)
    const filtroRespInput = screen.getByLabelText('Filtrar por responsável');
    fireEvent.focus(filtroRespInput);

    // Busca sem correspondência no Autocomplete
    fireEvent.change(filtroRespInput, { target: { value: 'Inexistente' } });
    expect(
      screen.getByText('Nenhum responsável encontrado')
    ).toBeInTheDocument();

    // Limpa texto do input para listar todos e testa clique fora sem selecionado
    fireEvent.change(filtroRespInput, { target: { value: '' } });
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Abre com ArrowDown e navega pelas opções
    fireEvent.keyDown(filtroRespInput, { key: 'ArrowDown' }); // index 0 (Lucas)
    fireEvent.keyDown(filtroRespInput, { key: 'ArrowDown' }); // index 1 (Beatriz)
    fireEvent.keyDown(filtroRespInput, { key: 'ArrowDown' }); // wrap -> index 0 (Lucas)
    fireEvent.keyDown(filtroRespInput, { key: 'ArrowUp' }); // wrap -> index 1 (Beatriz)
    fireEvent.keyDown(filtroRespInput, { key: 'ArrowUp' }); // index 0 (Lucas)
    fireEvent.keyDown(filtroRespInput, { key: 'Enter' }); // seleciona Dr. Lucas Mendes (id 1)

    expect(filtroRespInput).toHaveValue('Dr. Lucas Mendes');
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
    expect(screen.getByText('Cliente Responsavel String')).toBeInTheDocument();
    expect(screen.queryByText('Beatriz Pereira')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Cliente Responsavel Objeto')
    ).not.toBeInTheDocument();

    // Digita algo e clica fora quando já há responsável selecionado -> restaura nome do selecionado
    fireEvent.change(filtroRespInput, { target: { value: 'Texto parcial' } });
    fireEvent.keyDown(filtroRespInput, { key: 'Escape' });
    fireEvent.focus(filtroRespInput);
    fireEvent.mouseDown(document.body);
    expect(filtroRespInput).toHaveValue('Dr. Lucas Mendes');

    // Botão Limpar responsável selecionado (X)
    const clearRespBtn = screen.getByLabelText(
      'Limpar responsável selecionado'
    );
    fireEvent.click(clearRespBtn);
    expect(filtroRespInput).toHaveValue('');
    expect(screen.getByText('Beatriz Pereira')).toBeInTheDocument();

    // Filtro por status/etapa
    const statusSelect = screen.getByLabelText('Filtrar por status');
    fireEvent.change(statusSelect, { target: { value: '3' } }); // Em negociação
    expect(screen.getByText('Cliente Responsavel Objeto')).toBeInTheDocument();
    expect(screen.queryByText('Empresa Alpha Ltda')).not.toBeInTheDocument();

    // Limpar filtros gerais
    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(statusSelect).toHaveValue('');
    expect(screen.getByText('Empresa Alpha Ltda')).toBeInTheDocument();
  });

  it('exibe ClientDetailsModal com diferentes representações de responsável e campos opcionais ausentes, e transiciona para EditClientModal ao clicar em Editar', async () => {
    const clientesDetalhes = [
      {
        cliente_id: 201,
        nome: 'ApenasUmNome',
        responsavel: 'Responsável Em Texto',
        status_id: 2,
      },
      {
        cliente_id: 202,
        nome: 'Cliente Objeto Resp',
        responsavel: { nome: 'Responsável Em Objeto' },
        etapa_id: 3,
      },
      {
        cliente_id: 203,
        nome: 'Cliente Por ID',
        responsavel_id: 2,
        etapa_id: 4,
      },
      {
        id: 204,
        nome: '',
        responsavel: {},
        responsavel_id: null,
        area_interesse: 'Cível',
        descricao: 'Descrição prévia',
      },
      {
        id: 205,
        nome: 'Cliente Resp Inexistente',
        responsavel_id: 999,
      },
    ];

    render(
      <ClientesClient
        initialClientes={clientesDetalhes}
        initialFuncionarios={mockFuncionarios}
      />
    );

    // 0. Abre edição de cliente com responsavel_id inexistente (999) para exercitar encontrarFuncionario sem match
    fireEvent.click(
      screen.getByLabelText('Editar cliente Cliente Resp Inexistente')
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    // 1. Cliente com responsavel string e sem campos opcionais
    fireEvent.click(
      screen.getByLabelText('Visualizar detalhes de ApenasUmNome')
    );
    const dialog1 = screen.getByRole('dialog');
    expect(within(dialog1).getByText('AP')).toBeInTheDocument();
    expect(
      within(dialog1).getByText('Responsável Em Texto')
    ).toBeInTheDocument();
    expect(
      within(dialog1).getByText('Nenhuma descrição detalhada informada.')
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog1).getAllByRole('button', { name: /fechar/i })[0]
    );

    // 2. Cliente com responsavel objeto
    fireEvent.click(
      screen.getByLabelText('Visualizar detalhes de Cliente Objeto Resp')
    );
    const dialog2 = screen.getByRole('dialog');
    expect(
      within(dialog2).getByText('Responsável Em Objeto')
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog2).getAllByRole('button', { name: /fechar/i })[0]
    );

    // 3. Cliente com responsavel_id (busca em funcionarios)
    fireEvent.click(
      screen.getByLabelText('Visualizar detalhes de Cliente Por ID')
    );
    const dialog3 = screen.getByRole('dialog');
    expect(
      within(dialog3).getByText('Dra. Beatriz Santos')
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog3).getAllByRole('button', { name: /fechar/i })[0]
    );

    // 4. Cliente com responsavel objeto vazio e sem nome/telefone/email/etapa ("Não atribuído") e transição direta para EditClientModal
    fireEvent.click(screen.getByLabelText('Visualizar detalhes de'));
    const dialog4 = screen.getByRole('dialog');
    expect(within(dialog4).getByText('Não atribuído')).toBeInTheDocument();

    const editFromDetailsBtn = within(dialog4).getByRole('button', {
      name: /editar/i,
    });
    fireEvent.click(editFromDetailsBtn);

    expect(screen.queryByText('Detalhes do Cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('');

    // Salva edição do cliente com id (sem cliente_id), sem responsável, limpando campos opcionais e sem CPF
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 204,
        nome: 'Cliente Sem Nada Editado',
      }),
    });

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Cliente Sem Nada Editado' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '11988887777' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'semnada@teste.com' },
    });
    fireEvent.change(screen.getByLabelText(/área de interesse/i), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText(/descrição da necessidade/i), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/clientes\/204$/),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    // Exclui o cliente que usa `id` em vez de `cliente_id`
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });
    fireEvent.click(
      screen.getByLabelText('Excluir cliente Cliente Sem Nada Editado')
    );
    fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/clientes\/204$/),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('valida campos em AddClientModal e EditClientModal, altera etapa, responsável e observações, e trata erros na edição e cancelamento de exclusão', async () => {
    render(
      <ClientesClient
        initialClientes={mockClientesIniciais}
        initialFuncionarios={mockFuncionarios}
      />
    );

    // --- 1. Validações no AddClientModal ---
    fireEvent.click(screen.getByRole('button', { name: /novo cliente/i }));

    const submitAddBtn = screen.getByRole('button', {
      name: /salvar cadastro/i,
    });

    // Nome em branco
    fireEvent.click(submitAddBtn);
    expect(
      screen.getByText('O nome ou razão social é obrigatório.')
    ).toBeInTheDocument();

    // Nome preenchido, mas CPF/CNPJ inválido
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'Novo Cliente Validação' },
    });
    fireEvent.change(screen.getByLabelText(/cpf \/ cnpj/i), {
      target: { value: '12345' },
    });
    fireEvent.click(submitAddBtn);
    expect(
      screen.getByText(
        'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.'
      )
    ).toBeInTheDocument();

    // Corrige para CNPJ válido (14 dígitos), mas telefone em branco
    fireEvent.change(screen.getByLabelText(/cpf \/ cnpj/i), {
      target: { value: '11222333000181' },
    });
    fireEvent.click(submitAddBtn);
    expect(screen.getByText('O telefone é obrigatório.')).toBeInTheDocument();

    // Telefone curto (< 10 dígitos) - exercita também formatação <= 2 e <= 6 dígitos
    const telInput = screen.getByLabelText(/telefone/i);
    fireEvent.change(telInput, { target: { value: '11' } });
    expect(telInput).toHaveValue('(11');
    fireEvent.change(telInput, { target: { value: '119888' } });
    expect(telInput).toHaveValue('(11) 9888');
    fireEvent.click(submitAddBtn);
    expect(
      screen.getByText('Informe um telefone válido com DDD (10 ou 11 dígitos).')
    ).toBeInTheDocument();

    // Telefone fixo válido (10 dígitos), mas e-mail em branco
    fireEvent.change(telInput, { target: { value: '1133334444' } });
    expect(telInput).toHaveValue('(11) 3333-4444');
    fireEvent.click(submitAddBtn);
    expect(screen.getByText('O e-mail é obrigatório.')).toBeInTheDocument();

    // E-mail inválido
    const emailInput = screen.getByLabelText(/^email$/i);
    fireEvent.change(emailInput, { target: { value: 'email-sem-dominio' } });
    fireEvent.click(submitAddBtn);
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();

    // Corrige e-mail, limpa CPF/CNPJ (opcional), preenche área de interesse, status e descrição
    fireEvent.change(screen.getByLabelText(/cpf \/ cnpj/i), {
      target: { value: '' },
    });
    fireEvent.change(emailInput, { target: { value: 'valido@empresa.com' } });
    fireEvent.change(screen.getByLabelText(/área de interesse/i), {
      target: { value: 'Trabalhista' },
    });
    fireEvent.change(screen.getByLabelText(/^status$/i), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText(/descrição da necessidade/i), {
      target: { value: 'Demanda trabalhista urgente' },
    });

    // Testa tecla Enter sem item destacado e tecla Tab no AutocompleteResponsible
    const addRespInput = screen.getByPlaceholderText('Selecione o responsável');
    fireEvent.focus(addRespInput);
    fireEvent.keyDown(addRespInput, { key: 'Enter' });
    fireEvent.keyDown(addRespInput, { key: 'Tab' });

    // Submete com falha sem mensagem (cobre fallback 'Erro ao salvar cliente.')
    global.fetch.mockRejectedValueOnce({});
    fireEvent.click(submitAddBtn);
    await waitFor(() => {
      expect(
        screen.getAllByText('Erro ao cadastrar cliente.').length
      ).toBeGreaterThanOrEqual(1);
    });

    // Submete com sucesso sem CPF/documento e etapa 0 (fallback || 1) para cobrir branches em AddClientModal e useClientes.js
    fireEvent.change(screen.getByLabelText(/^status$/i), {
      target: { value: '0' },
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        cliente_id: 299,
        nome: 'Novo Cliente Validação',
      }),
    });
    fireEvent.click(submitAddBtn);
    await waitFor(() => {
      expect(screen.getByText('Novo Cliente Validação')).toBeInTheDocument();
    });

    // Reabre modal de adição e cancela
    fireEvent.click(screen.getByRole('button', { name: /^novo cliente$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(
      screen.queryByText('Cadastrar Novo Cliente')
    ).not.toBeInTheDocument();

    // --- 2. Validações, alteração de campos e erros de API/rede no EditClientModal ---
    fireEvent.click(screen.getByLabelText('Editar cliente Empresa Alpha Ltda'));
    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();

    const editNomeInput = screen.getByLabelText(/nome completo/i);
    fireEvent.change(editNomeInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    expect(
      screen.getByText('O nome ou razão social é obrigatório.')
    ).toBeInTheDocument();

    // Restaura nome e altera CPF/CNPJ, telefone, email, responsável, área, status e descrição
    fireEvent.change(editNomeInput, {
      target: { value: 'Empresa Alpha Atualizada' },
    });
    fireEvent.change(screen.getByLabelText(/cpf \/ cnpj/i), {
      target: { value: '12345678901' },
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '11977776666' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'novo@alpha.com' },
    });

    const editRespInput = screen.getByPlaceholderText(
      'Selecione o responsável'
    );
    fireEvent.focus(editRespInput);
    fireEvent.keyDown(editRespInput, { key: 'ArrowDown' });
    fireEvent.keyDown(editRespInput, { key: 'ArrowDown' });
    fireEvent.keyDown(editRespInput, { key: 'Enter' }); // Dra. Beatriz Santos

    fireEvent.change(screen.getByLabelText(/área de interesse/i), {
      target: { value: 'Tributário' },
    });
    fireEvent.change(screen.getByLabelText(/^status$/i), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText(/descrição da necessidade/i), {
      target: { value: 'Revisão fiscal completa' },
    });

    // Simula erro 400 na atualização
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Conflito ao atualizar cliente.' }),
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Conflito ao atualizar cliente.').length
      ).toBeGreaterThanOrEqual(1);
    });

    // Simula falha de rede (Failed to fetch) na atualização
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText(
          'Erro de conexão com o servidor. Tente novamente em instantes.'
        ).length
      ).toBeGreaterThanOrEqual(1);
    });

    // Simula erro sem mensagem na atualização (fallback 'Erro ao atualizar cliente.')
    global.fetch.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Erro ao atualizar cliente.').length
      ).toBeGreaterThanOrEqual(1);
    });

    // Fecha o modal de edição
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText('Editar Cliente')).not.toBeInTheDocument();

    // --- 3. Abrir, testar erro sem mensagem e cancelar DeleteClientModal ---
    fireEvent.click(
      screen.getByLabelText('Excluir cliente Empresa Alpha Ltda')
    );
    expect(screen.getByText('Excluir cliente')).toBeInTheDocument();
    global.fetch.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }));
    await waitFor(() => {
      expect(
        screen.getAllByText('Erro ao excluir cliente.').length
      ).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText('Excluir cliente')).not.toBeInTheDocument();
  });

  it('exercita services/clientes.js (listarClientes com filtros e erros, obterCliente com sucesso e erro) e utils/cliente.js', async () => {
    // 1. listarClientes com query string
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockClientesIniciais,
    });

    const lista = await listarClientes({
      busca: 'Alpha',
      responsavel_id: 1,
      etapa_id: 2,
      nome: 'Alpha',
      cpf: '12345678900',
      email: 'contato@alpha.com',
      telefone: '11988881111',
    });

    expect(lista).toEqual(mockClientesIniciais);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/clientes/?busca=Alpha&responsavel_id=1&etapa_id=2'
      ),
      expect.objectContaining({ method: 'GET' })
    );

    // 2. listarClientes com erro no browser e detail em array com .message e vazio
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [{ message: 'value_error: email is invalid' }],
      }),
    });

    await expect(listarClientes()).rejects.toThrow('Informe um e-mail válido.');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('JSON inválido');
      },
    });

    await expect(listarClientes()).rejects.toThrow(
      'Não foi possível carregar a lista de clientes.'
    );

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [],
      }),
    });

    await expect(listarClientes()).rejects.toThrow(
      'Não foi possível carregar a lista de clientes.'
    );

    // 3. obterCliente com sucesso
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockClientesIniciais[0],
    });

    const clienteObtido = await obterCliente(101);
    expect(clienteObtido).toEqual(mockClientesIniciais[0]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/clientes\/101$/),
      expect.objectContaining({ method: 'GET' })
    );

    // 4. obterCliente com erro
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Cliente não encontrado.' }),
    });

    await expect(obterCliente(999)).rejects.toThrow('Cliente não encontrado.');

    // 5. Exercita utilitários complementares de utils/cliente.js
    expect(obterEtapaPorId(99)).toEqual({
      id: 99,
      label: 'Novo contato',
      variant: 'novoContato',
    });
    expect(obterEtapaPorId(null)).toEqual({
      id: 1,
      label: 'Novo contato',
      variant: 'novoContato',
    });
    expect(obterEtapaPorLabel('')).toEqual({
      id: 1,
      label: 'Novo contato',
      variant: 'novoContato',
    });
    expect(obterEtapaPorLabel('Cliente ativo')).toEqual({
      id: 4,
      label: 'Cliente ativo',
      variant: 'clienteAtivo',
    });
    expect(obterEtapaPorLabel('Etapa Customizada')).toEqual({
      id: 1,
      label: 'Etapa Customizada',
      variant: 'novoContato',
    });

    expect(formatarCpfCnpj('')).toBe('');
    expect(formatarTelefone('')).toBe('');
    expect(formatarTelefone('abc')).toBe('');
    expect(formatarDataInteracao('')).toBe('-');
    expect(formatarDataInteracao('texto-nao-data')).toBe('texto-nao-data');
    expect(obterIniciais('')).toBe('--');
    expect(obterIniciais('   ')).toBe('--');
    expect(validarDadosCliente()).toBe('O nome ou razão social é obrigatório.');
  });
});
