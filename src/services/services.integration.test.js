import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL } from './api';
import { listarProdutividadeEquipe, obterKanbanAtividades } from './atividades';
import { obterResumoAtividades } from './dashboard';
import {
  exportarCalendarioIcs,
  exportarFinancas,
  listarFinancas,
  obterCalendario,
  obterResumoFinancas,
} from './financas';
import {
  getProcessosData,
  listarProcessos,
  listarProcessosCriticos,
  obterProcesso,
  obterResumoProcessos,
} from './processos';
import { enviarSolicitacaoServico, ERROS_SOLICITACAO } from './solicitacoes';

const response = (data, { status = 200, ok = status < 400, ...rest } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
  blob: vi.fn().mockResolvedValue(new Blob(['arquivo'])),
  ...rest,
});

const brokenJson = (status = 500) => ({
  ok: false,
  status,
  json: vi.fn().mockRejectedValue(new Error('corpo inválido')),
});

const urlsCalled = () => fetch.mock.calls.map(([url]) => String(url));

describe('serviços (integração com a API simulada)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', 'token-jwt');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('atividades', () => {
    it.each([
      [401, {}, 'Sessão expirada. Faça login novamente.'],
      [
        403,
        {},
        'Você não possui permissão para visualizar a produtividade da equipe.',
      ],
      [500, { detail: 'Falha interna' }, 'Falha interna'],
      [500, {}, 'Não foi possível carregar a produtividade da equipe.'],
    ])('produtividade: traduz o status %i', async (status, body, message) => {
      fetch.mockResolvedValue(response(body, { status }));

      await expect(listarProdutividadeEquipe()).rejects.toThrow(message);
    });

    it('produtividade: informa sessão expirada sem token e falha de rede', async () => {
      sessionStorage.clear();
      await expect(listarProdutividadeEquipe()).rejects.toThrow(
        'Sessão expirada. Faça login novamente.'
      );
      expect(fetch).not.toHaveBeenCalled();

      sessionStorage.setItem('access_token', 'token-jwt');
      fetch.mockRejectedValue(new Error('offline'));
      await expect(listarProdutividadeEquipe()).rejects.toThrow(
        'Não foi possível carregar a produtividade da equipe.'
      );
    });

    it('produtividade: devolve os dados em caso de sucesso', async () => {
      fetch.mockResolvedValue(response([{ funcionario_id: 1 }]));

      await expect(listarProdutividadeEquipe()).resolves.toEqual([
        { funcionario_id: 1 },
      ]);
      expect(urlsCalled()).toEqual([`${API_URL}/atividades/produtividade`]);
    });

    it('kanban: devolve os dados em caso de sucesso', async () => {
      const kanban = { escopo: 'usuario', etapas: [] };
      fetch.mockResolvedValue(response(kanban));

      await expect(obterKanbanAtividades()).resolves.toEqual(kanban);
      expect(urlsCalled()).toEqual([`${API_URL}/atividades/kanban`]);
    });

    it.each([
      [401, {}, 'Sessão expirada. Faça login novamente.'],
      [403, {}, 'Você não possui permissão para visualizar as atividades.'],
      [500, { detail: 'Falha interna' }, 'Falha interna'],
      [500, {}, 'Não foi possível carregar as atividades.'],
    ])('kanban: traduz o status %i', async (status, body, message) => {
      fetch.mockResolvedValue(response(body, { status }));

      await expect(obterKanbanAtividades()).rejects.toThrow(message);
    });

    it('kanban: informa sessão expirada sem token e falha de rede', async () => {
      fetch.mockRejectedValue(new Error('offline'));
      await expect(obterKanbanAtividades()).rejects.toThrow(
        'Não foi possível carregar as atividades.'
      );

      sessionStorage.clear();
      await expect(obterKanbanAtividades()).rejects.toThrow(
        'Sessão expirada. Faça login novamente.'
      );
    });
  });

  describe('dashboard', () => {
    it('devolve o resumo de atividades em caso de sucesso', async () => {
      const resumo = { escopo: 'escritorio', pendentes: 3 };
      fetch.mockResolvedValue(response(resumo));

      await expect(obterResumoAtividades()).resolves.toEqual(resumo);
      expect(urlsCalled()).toEqual([`${API_URL}/dashboard/atividades/resumo`]);
    });

    it.each([
      [401, {}, 'Sessão expirada. Faça login novamente.'],
      [500, { detail: 'Falha interna' }, 'Falha interna'],
      [
        422,
        { detail: [{ msg: 'x' }] },
        'Não foi possível carregar o resumo de atividades.',
      ],
    ])('traduz o status %i', async (status, body, message) => {
      fetch.mockResolvedValue(response(body, { status }));

      await expect(obterResumoAtividades()).rejects.toThrow(message);
    });

    it('usa mensagem padrão com corpo inválido, falha de rede e sem token', async () => {
      fetch.mockResolvedValueOnce(brokenJson());
      await expect(obterResumoAtividades()).rejects.toThrow(
        'Não foi possível carregar o resumo de atividades.'
      );

      fetch.mockRejectedValueOnce(new Error('offline'));
      await expect(obterResumoAtividades()).rejects.toThrow(
        'Não foi possível carregar o resumo de atividades.'
      );

      sessionStorage.clear();
      await expect(obterResumoAtividades()).rejects.toThrow(
        'Sessão expirada. Faça login novamente.'
      );
    });
  });

  describe('autenticação', () => {
    let login;
    let firstLogin;

    beforeEach(async () => {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000');
      ({ login, firstLogin } = await import('./auth'));
    });

    it('login devolve os dados e envia as credenciais', async () => {
      fetch.mockResolvedValue(response({ access_token: 'abc' }));

      await expect(login('a@b.com', 'senha')).resolves.toEqual({
        access_token: 'abc',
      });
      expect(fetch.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', senha: 'senha' }),
      });
    });

    it.each([
      [{ detail: 'Credenciais inválidas' }, 'Credenciais inválidas'],
      [{ message: 'Erro genérico' }, 'Erro genérico'],
      [{}, 'Email ou senha inválidos'],
    ])('login traduz o erro %j', async (body, message) => {
      fetch.mockResolvedValue(response(body, { status: 401 }));

      await expect(login('a@b.com', 'x')).rejects.toThrow(message);
    });

    it('login usa a mensagem padrão quando o corpo do erro é inválido', async () => {
      fetch.mockResolvedValue(brokenJson(401));

      await expect(login('a@b.com', 'x')).rejects.toThrow(
        'Email ou senha inválidos'
      );
    });

    it('primeiro acesso devolve os dados e aceita nomes alternativos de OAB', async () => {
      fetch.mockResolvedValue(response({ ok: true }));

      await firstLogin({
        token: 't',
        nome: 'Ana',
        senha: 'Senha@123',
        uf: 'DF',
        numeroOab: '12345',
      });
      await firstLogin({ token: 't', nome: 'Ana', senha: 'Senha@123' });

      expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
        uf_oab: 'DF',
        numero_oab: '12345',
      });
      expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty(
        'uf_oab'
      );
    });

    it.each([
      [{ detail: 'Token expirado' }, 'Token expirado'],
      [
        {
          detail: [
            { loc: ['body', 'numero_oab'], msg: 'x' },
            { loc: ['body', 'uf_oab'], msg: 'y' },
            { loc: ['body', 'senha'], msg: 'Senha fraca' },
            { loc: ['body', 'nome'], message: 'Nome inválido' },
            { loc: ['body', 'outro'] },
          ],
        },
        'Número da OAB deve conter exatamente 5 dígitos. UF da OAB deve conter 2 letras. Senha fraca Nome inválido',
      ],
      [{ message: 'Erro genérico' }, 'Erro genérico'],
      [{}, 'Não foi possível concluir o cadastro.'],
    ])('primeiro acesso traduz o erro %j', async (body, message) => {
      fetch.mockResolvedValue(response(body, { status: 400 }));

      await expect(
        firstLogin({ token: 't', nome: 'Ana', senha: 'x' })
      ).rejects.toThrow(message);
    });

    it('primeiro acesso usa a mensagem padrão quando o corpo do erro é inválido', async () => {
      fetch.mockResolvedValue(brokenJson(400));

      await expect(
        firstLogin({ token: 't', nome: 'Ana', senha: 'x' })
      ).rejects.toThrow('Não foi possível concluir o cadastro.');
    });

    it('falha quando a URL da API não está configurada', async () => {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_API_URL', '');
      vi.stubEnv('API_URL', '');
      const auth = await import('./auth');

      await expect(auth.login('a@b.com', 'x')).rejects.toThrow(
        'URL da API não configurada'
      );
      await expect(
        auth.firstLogin({ token: 't', nome: 'Ana', senha: 'x' })
      ).rejects.toThrow('URL da API não configurada');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('solicitações de serviço', () => {
    const dados = { nome: 'Maria', email: 'm@x.com' };

    it('envia a solicitação e devolve a resposta', async () => {
      fetch.mockResolvedValue(response({ id: 1 }, { status: 201 }));

      await expect(enviarSolicitacaoServico(dados)).resolves.toEqual({
        id: 1,
      });
    });

    it('informa falha de conexão e excesso de solicitações', async () => {
      fetch.mockRejectedValueOnce(new Error('offline'));
      await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
        'Não foi possível conectar ao servidor. Tente novamente.'
      );

      fetch.mockResolvedValueOnce(response({}, { status: 429 }));
      await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
        'Muitas solicitações. Aguarde um minuto e tente novamente.'
      );
    });

    it('usa o detalhe textual ou a mensagem padrão do erro', async () => {
      fetch.mockResolvedValueOnce(
        response({ detail: 'Já existe uma solicitação' }, { status: 409 })
      );
      await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
        'Já existe uma solicitação'
      );

      fetch.mockResolvedValueOnce(brokenJson(500));
      await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
        'Não foi possível enviar sua solicitação. Tente novamente.'
      );
    });

    it('mapeia os erros de validação por campo', async () => {
      fetch.mockResolvedValue(
        response(
          {
            detail: [
              { loc: ['body', 'nome'], type: 'missing' },
              { loc: ['body', 'email'], type: 'value_error' },
              { loc: ['body', 'desconhecido'], type: 'value_error' },
              { type: 'value_error' },
            ],
          },
          { status: 422 }
        )
      );

      const error = await enviarSolicitacaoServico(dados).catch((e) => e);

      expect(error.message).toBe(
        'Confira os dados informados e tente novamente.'
      );
      expect(error.fields).toEqual({
        nome: 'Preencha este campo.',
        email: ERROS_SOLICITACAO.email,
      });
    });
  });

  describe('finanças', () => {
    const categorias = [
      { categoria_id: 10, nome_categoria: 'Honorários' },
      { categoria_id: 20, nome_categoria: 'Outros' },
    ];
    const lancamento = (overrides = {}) => ({
      lancamento_id: 1,
      titulo: 'Item',
      valor: 100,
      tipo: 'e',
      data_vencimento: '2026-08-10',
      categoria_id: 10,
      status: 'Pendente',
      ...overrides,
    });

    const route = (handlers) =>
      fetch.mockImplementation(async (url) => {
        const key = Object.keys(handlers).find((k) => String(url).includes(k));
        return key ? handlers[key](String(url)) : response({}, { status: 404 });
      });

    it('lista lançamentos sem página, mapeando categorias conhecidas e desconhecidas', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () =>
          response([
            lancamento(),
            lancamento({ lancamento_id: 2, categoria_id: 99 }),
          ]),
      });

      const itens = await listarFinancas({ categoria: 'Honorários' });

      expect(itens).toHaveLength(2);
      expect(itens[0].categoria).toBe('Honorários');
      expect(urlsCalled().at(-1)).toContain('categoria_id=10');
    });

    it('devolve lista vazia quando a API recusa ou devolve formato inesperado', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () => response({}, { status: 500 }),
      });
      await expect(listarFinancas()).resolves.toEqual([]);

      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () => response({ itens: 'x' }),
      });
      await expect(listarFinancas()).resolves.toEqual([]);
    });

    it('lista página de lançamentos e trata respostas inesperadas', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/paginado': () =>
          response({
            itens: [lancamento(), lancamento({ categoria_id: 99 })],
            total: 2,
            page: 1,
          }),
      });
      const page = await listarFinancas({ page: 1, page_size: 5 });
      expect(page.itens).toHaveLength(2);
      expect(page.total).toBe(2);

      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/paginado': () => response({ total: 0 }),
      });
      await expect(listarFinancas({ page: 1 })).resolves.toEqual({
        total: 0,
        itens: [],
      });

      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/paginado': () => response({}, { status: 500 }),
      });
      await expect(listarFinancas({ page: 1 })).resolves.toEqual({
        itens: [],
        total: 0,
      });
    });

    it('segue listando quando as categorias não podem ser carregadas', async () => {
      fetch.mockImplementation(async (url) => {
        if (String(url).includes('/categorias-lancamento')) {
          throw new Error('offline');
        }
        return response([lancamento()]);
      });
      expect(await listarFinancas()).toHaveLength(1);

      route({
        '/categorias-lancamento': () => response({}, { status: 500 }),
        '/lancamentos/': () => response([lancamento()]),
      });
      expect(await listarFinancas()).toHaveLength(1);
    });

    it('devolve vazio quando a requisição falha', async () => {
      fetch.mockImplementation(async (url) => {
        if (String(url).includes('/categorias-lancamento')) {
          return response(categorias);
        }
        throw new Error('offline');
      });

      await expect(listarFinancas()).resolves.toEqual([]);
      await expect(listarFinancas({ page: 1 })).resolves.toEqual({
        itens: [],
        total: 0,
      });
    });

    it('filtra a categoria "Outros" e pagina o resultado localmente', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () =>
          response([
            lancamento({ lancamento_id: 1, categoria_id: 20 }),
            lancamento({ lancamento_id: 2, categoria_id: null }),
            lancamento({ lancamento_id: 3, categoria_id: 10 }),
          ]),
      });

      const page = await listarFinancas({
        categoria: 'outros',
        page: 'x',
        page_size: 'y',
      });
      expect(page.itens).toHaveLength(2);
      expect(page).toMatchObject({ page: 1, page_size: 5, total: 2 });

      const lista = await listarFinancas({ categoria: 'Outros' });
      expect(lista).toHaveLength(2);
    });

    it('trata "Outros" quando a API recusa ou devolve formato inesperado', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () => response({}, { status: 500 }),
      });
      await expect(listarFinancas({ categoria: 'Outros' })).resolves.toEqual(
        []
      );
      await expect(
        listarFinancas({ categoria: 'Outros', page: 1 })
      ).resolves.toEqual({ itens: [], total: 0 });

      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () => response({}),
      });
      const vazio = await listarFinancas({ categoria: 'Outros', page: 1 });
      expect(vazio).toMatchObject({ itens: [], total: 0, total_pages: 1 });
    });

    it('resume localmente os lançamentos de "Outros" por situação', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/': () =>
          response([
            lancamento({ categoria_id: 20, status: 'Realizado' }),
            lancamento({ categoria_id: 20, status: 'Atrasado', tipo: 's' }),
            lancamento({ categoria_id: null, status: 'Pendente' }),
          ]),
      });

      const resumo = await obterResumoFinancas({ categoria: 'Outros' });

      expect(resumo.realizado).toMatchObject({
        quantidade: 1,
        total_entradas: 100,
      });
      expect(resumo.atrasado).toMatchObject({
        quantidade: 1,
        total_saidas: 100,
      });
      expect(resumo.pendente.quantidade).toBe(1);
    });

    it('resume pelo backend convertendo a categoria em id e tolerando falhas', async () => {
      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/resumo': () => response({ realizado: {} }),
      });
      await obterResumoFinancas({
        categoria: 'honorários',
        inicio: '2026-08-01',
        fim: '2026-08-31',
        tipo: 'e',
        situacao: 'Pendente',
      });
      expect(urlsCalled().at(-1)).toContain('categoria_id=10');

      route({
        '/categorias-lancamento': () => response({}, { status: 500 }),
        '/lancamentos/resumo': () => response({ realizado: {} }),
      });
      await expect(
        obterResumoFinancas({ categoria: 'Honorários' })
      ).resolves.toEqual({ realizado: {} });

      route({
        '/categorias-lancamento': () => response(categorias),
        '/lancamentos/resumo': () => response({ realizado: {} }),
      });
      await obterResumoFinancas({ categoria: 'Inexistente' });
      expect(urlsCalled().at(-1)).not.toContain('categoria_id');

      route({
        '/lancamentos/resumo': () => response({}, { status: 500 }),
      });
      await expect(
        obterResumoFinancas({ categoria_id: 3 })
      ).resolves.toBeNull();
    });

    it('exporta com todos os filtros, inclusive tipo e cliente', async () => {
      fetch.mockResolvedValue(response({}));

      await exportarFinancas(
        { tipo: 'e', cliente_id: 4, categoria_id: 10 },
        'xlsx'
      );

      expect(urlsCalled()[0]).toBe(
        `${API_URL}/lancamentos/exportar?formato=xlsx&tipo=e&categoria_id=10&cliente_id=4`
      );
    });

    it('obtém o calendário com filtros, sem filtros e tolera falhas', async () => {
      fetch.mockResolvedValueOnce(response([lancamento()]));
      const itens = await obterCalendario({
        inicio: '2026-08-01',
        fim: '2026-08-31',
        status: 'Pendente',
        tipo: 'e',
        categoria_id: 10,
        cliente_id: 4,
      });
      expect(itens).toHaveLength(1);
      expect(urlsCalled()[0]).toBe(
        `${API_URL}/lancamentos/calendario?inicio=2026-08-01&fim=2026-08-31&status=Pendente&tipo=e&categoria_id=10&cliente_id=4`
      );

      fetch.mockResolvedValueOnce(response({}));
      await expect(obterCalendario()).resolves.toEqual([]);
      expect(urlsCalled()[1]).toBe(`${API_URL}/lancamentos/calendario`);

      fetch.mockResolvedValueOnce(response([], { status: 500 }));
      await expect(obterCalendario()).resolves.toEqual([]);

      fetch.mockRejectedValueOnce(new Error('offline'));
      await expect(obterCalendario()).resolves.toEqual([]);

      sessionStorage.clear();
      fetch.mockResolvedValueOnce(response([]));
      await obterCalendario();
      expect(fetch.mock.calls.at(-1)[1]).toEqual({ cache: 'no-store' });
    });

    it('exporta o calendário em .ics com os filtros informados', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:ics');
      URL.revokeObjectURL = vi.fn();
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function () {
          expect(this.download).toBe('calendario_financeiro.ics');
        });
      fetch.mockResolvedValue(response({}));

      const blob = await exportarCalendarioIcs({
        inicio: '2026-08-01',
        fim: '2026-08-31',
        status: 'Pendente',
        tipo: 'e',
        categoria_id: 10,
        cliente_id: 4,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(click).toHaveBeenCalledOnce();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ics');
      expect(urlsCalled()[0]).toBe(
        `${API_URL}/lancamentos/calendario/exportar?inicio=2026-08-01&fim=2026-08-31&status=Pendente&tipo=e&categoria_id=10&cliente_id=4`
      );

      click.mockRestore();
      delete URL.createObjectURL;
      delete URL.revokeObjectURL;
    });

    it('exporta o calendário sem filtros nem token e sem baixar fora do navegador', async () => {
      sessionStorage.clear();
      fetch.mockResolvedValue(response({}));
      vi.stubGlobal('document', undefined);

      await exportarCalendarioIcs();

      expect(urlsCalled()[0]).toBe(
        `${API_URL}/lancamentos/calendario/exportar`
      );
      expect(fetch.mock.calls[0][1]).toEqual({ headers: {} });
    });

    it('informa o motivo quando a exportação do calendário falha', async () => {
      fetch.mockResolvedValueOnce(
        response({ detail: 'Sem permissão' }, { status: 403 })
      );
      await expect(exportarCalendarioIcs()).rejects.toThrow('Sem permissão');

      fetch.mockResolvedValueOnce(brokenJson());
      await expect(exportarCalendarioIcs()).rejects.toThrow(
        'Não foi possível exportar o calendário.'
      );
    });
  });

  describe('processos', () => {
    it('lista processos críticos com os parâmetros informados', async () => {
      fetch.mockResolvedValue(response([{ processo_id: 1 }]));

      await expect(
        listarProcessosCriticos({ diasSemMovimentacao: 30, funcionarioId: 3 })
      ).resolves.toEqual([{ processo_id: 1 }]);
      expect(urlsCalled()[0]).toBe(
        `${API_URL}/processos/criticos/?dias_sem_movimentacao=30&funcionario_id=3`
      );
    });

    it('lista processos críticos com os padrões e sem parâmetros opcionais', async () => {
      fetch.mockResolvedValue(response([]));

      await listarProcessosCriticos();
      await listarProcessosCriticos({
        diasSemMovimentacao: null,
        funcionarioId: null,
      });

      expect(urlsCalled()).toEqual([
        `${API_URL}/processos/criticos/?dias_sem_movimentacao=15`,
        `${API_URL}/processos/criticos/`,
      ]);
    });

    it('rejeita a lista de críticos quando a resposta não é uma lista', async () => {
      fetch.mockResolvedValue(response({ itens: [] }));

      await expect(listarProcessosCriticos()).rejects.toThrow(
        'Não foi possível carregar os processos críticos.'
      );
    });

    it('obtém o resumo de processos com e sem parâmetros', async () => {
      fetch.mockResolvedValue(response({ total: 1 }));

      await obterResumoProcessos({ diasProximoPrazo: 10, funcionarioId: 2 });
      await obterResumoProcessos();
      await obterResumoProcessos({
        diasProximoPrazo: null,
        funcionarioId: null,
      });

      expect(urlsCalled()).toEqual([
        `${API_URL}/processos/resumo?dias_proximo_prazo=10&funcionario_id=2`,
        `${API_URL}/processos/resumo?dias_proximo_prazo=7`,
        `${API_URL}/processos/resumo`,
      ]);
    });

    it('devolve nulo quando o processo não é encontrado', async () => {
      fetch.mockResolvedValue(response({ itens: [] }));

      await expect(obterProcesso(99)).resolves.toBeNull();
    });

    it('traduz erros de validação com nomes amigáveis e mensagens da API', async () => {
      fetch.mockResolvedValue(
        response(
          {
            detail: [
              { loc: ['body', 'cnj'], type: 'missing', msg: 'obrigatório' },
              { loc: ['body', 'titulo'], type: 'value_error', msg: 'curto' },
              { loc: ['body', 'campo_novo'], type: 'value_error', msg: 'x' },
              { loc: ['body', 'status'], type: 'value_error' },
              { type: 'value_error', msg: 'sem campo' },
            ],
          },
          { status: 422 }
        )
      );

      await expect(listarProcessos()).rejects.toThrow(
        'Número do processo: campo obrigatório. Título do caso: curto campo_novo: x'
      );
    });

    it('usa a mensagem padrão quando a validação não traz mensagens utilizáveis', async () => {
      fetch.mockResolvedValue(
        response({ detail: [{ type: 'value_error' }] }, { status: 422 })
      );

      await expect(listarProcessos()).rejects.toThrow(
        'Não foi possível carregar os processos.'
      );
    });

    it('carrega os dados iniciais da página de processos', async () => {
      fetch.mockImplementation(async (url) =>
        String(url).includes('/funcionarios')
          ? response([{ funcionario_id: 3, nome: 'Ana' }])
          : response({ itens: [], total: 0, page: 1, page_size: 5 })
      );

      const data = await getProcessosData({ token: 'token-jwt' });

      expect(data.initialError).toBe('');
      expect(data.responsaveis).toEqual([{ value: '3', label: 'Ana' }]);
    });

    it('informa o erro ao carregar os dados iniciais', async () => {
      fetch.mockResolvedValue(response({ detail: 'Falha' }, { status: 500 }));
      const failed = await getProcessosData({ token: 'token-jwt' });
      expect(failed.initialError).toBeTruthy();

      fetch.mockRejectedValue('texto');
      const unknown = await getProcessosData();
      expect(unknown.initialError).toBe(
        'Não foi possível carregar os processos.'
      );
    });

    it('não exibe erro quando a sessão expirou durante a renderização no servidor', async () => {
      vi.stubGlobal('window', undefined);

      const data = await getProcessosData();

      expect(data).toMatchObject({ responsaveis: [], initialError: '' });
    });
  });
});
