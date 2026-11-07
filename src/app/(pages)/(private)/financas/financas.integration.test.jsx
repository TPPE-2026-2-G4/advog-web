import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  act,
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import FinancasPage from './page';
import FinancasClient from './financasClient';
import FinancialDashboard, {
  buildSmoothAreaPath,
  buildSmoothLinePath,
} from '@/components/features/financas/FinancialDashboard/FinancialDashboard';
import * as financasService from '@/services/financas';
import { useFinancas } from '@/hooks/useFinancas';
import LancamentosTable from '@/components/features/financas/LancamentosTable/LancamentosTable';
import LancamentoModal from '@/components/features/financas/LancamentoModal/LancamentoModal';
import {
  listarFinancas,
  obterResumoFinancas,
  obterGraficoFinancas,
  obterCalendario,
  exportarCalendarioIcs,
  criarFinancas,
  atualizarFinancas,
  excluirFinancas,
  mudarStatusLancamento,
  criarCategoria,
  excluirCategoria,
  listarCategorias,
  obterCalendario,
  exportarCalendarioIcs,
} from '@/services/financas';
import {
  MESES_ABREV,
  formatCurrency,
  formatCurrencyNumber,
  formatCompactCurrency,
  formatDateToBr,
  formatDateToIso,
  verificarStatusPorVencimento,
  calcularResumoFinanceiro,
  calcularIndicadoresFinanceiros,
  agruparFluxoCaixaPorMes,
  agruparDespesasPorCategoria,
  obterDataEfetivaIso,
  parseApiError,
  toLancamento,
  toApiLancamento,
} from '@/utils/financas';

const FAKE_TOKEN = 'fake-jwt-token-integration-123';

const initialApiCategorias = [
  { categoria_id: 10, nome_categoria: 'Honorários' },
  { categoria_id: 20, nome_categoria: 'Custas Processuais' },
  { categoria_id: 30, nome_categoria: 'Despesas Operacionais' },
];

const initialApiLancamentos = [
  {
    lancamento_id: 101,
    tipo: 'e',
    titulo: 'Honorários Contratuais - Alfa S.A.',
    descricao: 'Parcela inicial do contrato consultivo',
    valor: 5000,
    data_vencimento: '2026-08-10',
    data_pagamento: '2026-08-10',
    categoria_id: 10,
    status: 'Realizado',
    recorrente: false,
  },
  {
    lancamento_id: 102,
    tipo: 's',
    titulo: 'Aluguel da Sede - Agosto',
    descricao: 'Locação mensal do escritório',
    valor: 3200,
    data_vencimento: '2026-08-15',
    data_pagamento: null,
    categoria_id: 30,
    status: 'Pendente',
    recorrente: true,
  },
];

const initialResumoResponse = {
  realizado: { quantidade: 1, total_entradas: 5000, total_saidas: 0 },
  pendente: { quantidade: 1, total_entradas: 0, total_saidas: 3200 },
  atrasado: { quantidade: 0, total_entradas: 0, total_saidas: 0 },
};

function createJsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

const invalidJsonErrorResponse = (status = 500) => ({
  ok: false,
  status,
  json: async () => {
    throw new Error('Invalid JSON');
  },
});

describe('Financas Integration Tests (Full Frontend Stack)', () => {
  let fetchMock;
  let dbCategorias;
  let dbLancamentos;
  let routeOverrides;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', FAKE_TOKEN);

    dbCategorias = [...initialApiCategorias];
    dbLancamentos = [...initialApiLancamentos];
    routeOverrides = {};

    fetchMock = vi.fn(async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = (init.method || 'GET').toUpperCase();

      for (const [key, handler] of Object.entries(routeOverrides)) {
        const [overrideMethod, overridePath] = key.split(' ');
        if (method === overrideMethod && url.includes(overridePath)) {
          return handler(url, init);
        }
      }

      if (method === 'GET' && url.includes('/categorias-lancamento')) {
        return createJsonResponse(dbCategorias, 200);
      }

      if (method === 'POST' && url.includes('/categorias-lancamento')) {
        const body = JSON.parse(init.body || '{}');
        const createdCat = {
          categoria_id: 900 + dbCategorias.length + 1,
          nome_categoria: body.nome_categoria,
        };
        dbCategorias.push(createdCat);
        return createJsonResponse(createdCat, 201);
      }

      if (method === 'DELETE' && url.includes('/categorias-lancamento/')) {
        const catId = Number(url.split('/categorias-lancamento/')[1]);
        dbCategorias = dbCategorias.filter((c) => c.categoria_id !== catId);
        return createJsonResponse({}, 204);
      }

      if (method === 'GET' && url.includes('/lancamentos/resumo')) {
        return createJsonResponse(initialResumoResponse, 200);
      }

      if (method === 'GET' && url.includes('/lancamentos/grafico')) {
        const parsedUrl = new URL(url);
        const minStr = parsedUrl.searchParams.get('valor_min');
        const maxStr = parsedUrl.searchParams.get('valor_max');
        const statusStr = parsedUrl.searchParams.get('status');
        const minVal = minStr !== null ? Number(minStr) : null;
        const maxVal = maxStr !== null ? Number(maxStr) : null;

        const itensFiltrados = dbLancamentos.filter((l) => {
          if (
            statusStr &&
            String(l.status || '').toLowerCase() !== statusStr.toLowerCase()
          ) {
            return false;
          }
          const val = Number(l.valor) || 0;
          if (minVal !== null && !isNaN(minVal) && val < minVal) return false;
          if (maxVal !== null && !isNaN(maxVal) && val > maxVal) return false;
          return true;
        });

        const itensGrafico = itensFiltrados.map((l) => {
          const isSaida = String(l.tipo || '')
            .toLowerCase()
            .startsWith('s');
          const valor = Number(l.valor) || 0;
          return {
            data: l.data_vencimento || '2026-08-10',
            entradas: isSaida ? 0 : valor,
            saidas: isSaida ? valor : 0,
            saldo_dia: isSaida ? -valor : valor,
          };
        });

        return createJsonResponse(
          {
            inicio: '2026-03-01',
            fim: '2026-08-31',
            valor_min: minVal,
            valor_max: maxVal,
            total_entradas: 5000,
            total_saidas: 3200,
            saldo: 1800,
            itens: itensGrafico,
          },
          200
        );
      }

      if (method === 'GET' && url.includes('/lancamentos/paginado')) {
        const parsedUrl = new URL(url);
        const statusFilter = parsedUrl.searchParams.get('status');
        const catIdFilter = parsedUrl.searchParams.get('categoria_id');
        const page = Number(parsedUrl.searchParams.get('page')) || 1;
        const pageSize = Number(parsedUrl.searchParams.get('page_size')) || 5;

        let filtered = [...dbLancamentos];
        if (statusFilter) {
          filtered = filtered.filter(
            (l) => l.status.toLowerCase() === statusFilter.toLowerCase()
          );
        }
        if (catIdFilter) {
          filtered = filtered.filter(
            (l) => String(l.categoria_id) === String(catIdFilter)
          );
        }

        const start = (page - 1) * pageSize;
        return createJsonResponse(
          {
            itens: filtered.slice(start, start + pageSize),
            total: filtered.length,
            page,
            page_size: pageSize,
            total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
          },
          200
        );
      }

      if (
        method === 'GET' &&
        url.includes('/lancamentos/calendario/exportar')
      ) {
        return {
          ok: true,
          status: 200,
          blob: async () =>
            new Blob(['BEGIN:VCALENDAR...END:VCALENDAR'], {
              type: 'text/calendar',
            }),
        };
      }

      if (method === 'GET' && url.includes('/lancamentos/calendario')) {
        return createJsonResponse(dbLancamentos, 200);
      }

      if (method === 'GET' && url.includes('/lancamentos/')) {
        return createJsonResponse(dbLancamentos, 200);
      }

      if (method === 'POST' && url.endsWith('/lancamentos/')) {
        const body = JSON.parse(init.body || '{}');
        const created = {
          ...body,
          lancamento_id: 500 + dbLancamentos.length + 1,
        };
        dbLancamentos = [created, ...dbLancamentos];
        return createJsonResponse(created, 201);
      }

      if (
        method === 'PATCH' &&
        /\/lancamentos\/\d+\/alternar-status$/.test(url)
      ) {
        const match = url.match(/\/lancamentos\/(\d+)\/alternar-status$/);
        const id = Number(match[1]);
        const target = dbLancamentos.find(
          (l) => (l.lancamento_id ?? l.id) === id
        );
        const nextStatus =
          target && target.status.toLowerCase() === 'realizado'
            ? 'Pendente'
            : 'Realizado';
        const agora = new Date();
        const hojeIso = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
        const updated = {
          ...(target || { lancamento_id: id }),
          status: nextStatus,
          data_pagamento: nextStatus === 'Realizado' ? hojeIso : null,
        };
        dbLancamentos = dbLancamentos.map((l) =>
          (l.lancamento_id ?? l.id) === id ? updated : l
        );
        return createJsonResponse(updated, 200);
      }

      if (method === 'PUT' && /\/lancamentos\/\d+$/.test(url)) {
        const id = Number(url.split('/lancamentos/')[1]);
        const body = JSON.parse(init.body || '{}');
        const updated = {
          ...body,
          lancamento_id: id,
        };
        dbLancamentos = dbLancamentos.map((l) =>
          (l.lancamento_id ?? l.id) === id ? updated : l
        );
        return createJsonResponse(updated, 200);
      }

      if (method === 'DELETE' && /\/lancamentos\/\d+$/.test(url)) {
        const id = Number(url.split('/lancamentos/')[1]);
        dbLancamentos = dbLancamentos.filter(
          (l) => (l.lancamento_id ?? l.id) !== id
        );
        return createJsonResponse({}, 204);
      }

      return createJsonResponse(
        { detail: `Unhandled route: ${method} ${url}` },
        404
      );
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('executa a listagem inicial e resumo via fetch com Bearer token e renderiza os lançamentos formatados na tabela', async () => {
    render(<FinancasClient initialData={[]} />);

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
      expect(screen.getByText('Aluguel da Sede - Agosto')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Controle Financeiro' })
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 5.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.200,00')).toBeInTheDocument();
    expect(screen.getByText('10/08/2026')).toBeInTheDocument();
    expect(screen.getByText('15/08/2026')).toBeInTheDocument();
    expect(
      screen.getByText('Exibindo 1–2 de 2 resultados')
    ).toBeInTheDocument();

    const paginadoCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/lancamentos/paginado?page=1&page_size=5') &&
        (!init?.method || init.method === 'GET')
    );
    expect(paginadoCall).toBeDefined();
    expect(paginadoCall[1]?.headers).toEqual({
      Authorization: `Bearer ${FAKE_TOKEN}`,
    });

    const resumoCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/lancamentos/resumo') &&
        (!init?.method || init.method === 'GET')
    );
    expect(resumoCall).toBeDefined();
    expect(resumoCall[1]?.headers).toEqual({
      Authorization: `Bearer ${FAKE_TOKEN}`,
    });
  });

  it('cria um novo lançamento pelo LancamentoModal (incluindo CategoriaAutocomplete), envia POST autenticado e atualiza a tabela', async () => {
    const onSaveLancamento = vi.fn();
    render(
      <FinancasClient initialData={[]} onSaveLancamento={onSaveLancamento} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Novo Lançamento/i }));

    const dialog = screen.getByRole('dialog', {
      name: 'Novo Lançamento Financeiro',
    });
    expect(dialog).toBeInTheDocument();

    const categoriaInput = within(dialog).getByLabelText('Categoria');
    fireEvent.focus(categoriaInput);

    await waitFor(() => {
      expect(within(dialog).getByText('Honorários')).toBeInTheDocument();
      expect(
        within(dialog).getByText('Custas Processuais')
      ).toBeInTheDocument();
    });

    fireEvent.mouseDown(within(dialog).getByText('Custas Processuais'));
    expect(categoriaInput).toHaveValue('Custas Processuais');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Saída' }));

    fireEvent.change(within(dialog).getByLabelText('Título'), {
      target: { value: 'Taxa de Preparo Recursal' },
    });
    fireEvent.change(within(dialog).getByLabelText('Descrição'), {
      target: { value: 'Guia GRU Tribunal' },
    });
    fireEvent.change(within(dialog).getByLabelText('Valor'), {
      target: { value: '1450,50' },
    });
    fireEvent.change(within(dialog).getByLabelText('Data de Criação'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(within(dialog).getByLabelText('Data de Vencimento'), {
      target: { value: '2099-09-10' },
    });
    fireEvent.click(
      within(dialog).getByRole('checkbox', {
        name: /Este lançamento é recorrente/i,
      })
    );

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar Lançamento' })
    );

    await waitFor(() => {
      expect(screen.getByText('Taxa de Preparo Recursal')).toBeInTheDocument();
    });

    expect(screen.getByText('Guia GRU Tribunal')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.450,50')).toBeInTheDocument();
    expect(onSaveLancamento).toHaveBeenCalledOnce();

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/lancamentos/') && init?.method === 'POST'
    );
    expect(postCall).toBeDefined();
    expect(postCall[1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FAKE_TOKEN}`,
    });

    const sentPayload = JSON.parse(postCall[1].body);
    expect(sentPayload).toEqual({
      tipo: 's',
      titulo: 'Taxa de Preparo Recursal',
      descricao: 'Guia GRU Tribunal',
      valor: 1450.5,
      data_vencimento: '2099-09-10',
      data_pagamento: '2026-09-01',
      categoria: 'Custas Processuais',
      categoria_id: 20,
      cliente_id: null,
      status: 'Pendente',
      recorrente: true,
    });
  });

  it('edita um lançamento existente enviando PUT /lancamentos/:id e atualiza a linha na UI', async () => {
    render(<FinancasClient initialData={[]} />);

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editButtons[0]);

    const dialog = screen.getByRole('dialog', {
      name: 'Editar Lançamento Financeiro',
    });
    expect(within(dialog).getByLabelText('Título')).toHaveValue(
      'Honorários Contratuais - Alfa S.A.'
    );

    fireEvent.change(within(dialog).getByLabelText('Título'), {
      target: { value: 'Honorários Contratuais - Alfa S.A. (Aditivo)' },
    });
    fireEvent.change(within(dialog).getByLabelText('Valor'), {
      target: { value: '7500' },
    });

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar Alterações' })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A. (Aditivo)')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('R$ 7.500,00')).toBeInTheDocument();

    const putCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/lancamentos/101') && init?.method === 'PUT'
    );
    expect(putCall).toBeDefined();
    expect(putCall[1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FAKE_TOKEN}`,
    });

    const putPayload = JSON.parse(putCall[1].body);
    expect(putPayload).toMatchObject({
      tipo: 'e',
      titulo: 'Honorários Contratuais - Alfa S.A. (Aditivo)',
      valor: 7500,
      categoria: 'Honorários',
      categoria_id: 10,
      status: 'Realizado',
    });
  });

  it('alterna o status do lançamento (PATCH /lancamentos/:id/alternar-status) e exclui lançamento via DeleteLancamentoModal (DELETE /lancamentos/:id)', async () => {
    const onToggleStatus = vi.fn();
    const onDeleteLancamento = vi.fn();

    render(
      <FinancasClient
        initialData={[]}
        onToggleStatus={onToggleStatus}
        onDeleteLancamento={onDeleteLancamento}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    const toggleToRealizadoBtn = screen.getByRole('button', {
      name: 'Marcar como realizado',
    });
    fireEvent.click(toggleToRealizadoBtn);

    await waitFor(() => {
      expect(onToggleStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 102,
          status: 'realizado',
        })
      );
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/lancamentos/102/alternar-status') &&
        init?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    expect(patchCall[1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FAKE_TOKEN}`,
    });

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(deleteButtons[0]);

    const deleteDialog = screen.getByRole('dialog');
    expect(
      within(deleteDialog).getByText('Excluir lançamento?')
    ).toBeInTheDocument();
    expect(
      within(deleteDialog).getByText('Honorários Contratuais - Alfa S.A.')
    ).toBeInTheDocument();

    fireEvent.click(
      within(deleteDialog).getByRole('button', { name: 'Excluir lançamento' })
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Honorários Contratuais - Alfa S.A.')
      ).not.toBeInTheDocument();
    });

    expect(onDeleteLancamento).toHaveBeenCalledWith(
      expect.objectContaining({ id: 101 })
    );

    const deleteCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/lancamentos/101') && init?.method === 'DELETE'
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall[1].headers).toEqual({
      Authorization: `Bearer ${FAKE_TOKEN}`,
    });
  });

  it.each([
    {
      cenario: 'Erro 422 de validação no cadastro (POST /lancamentos/)',
      operacao: 'create',
      setupOverride: () => ({
        'POST /lancamentos/': async () =>
          createJsonResponse(
            {
              detail: [
                {
                  loc: ['body', 'data_vencimento'],
                  msg: 'Data de vencimento inválida para o período fiscal',
                },
              ],
            },
            422
          ),
      }),
      mensagemEsperada:
        'data_vencimento: Data de vencimento inválida para o período fiscal',
    },
    {
      cenario: 'Erro 500 interno no servidor ao cadastrar (POST /lancamentos/)',
      operacao: 'create',
      setupOverride: () => ({
        'POST /lancamentos/': async () =>
          createJsonResponse(
            { detail: 'Falha ao persistir lançamento no banco de dados.' },
            500
          ),
      }),
      mensagemEsperada: 'Falha ao persistir lançamento no banco de dados.',
    },
    {
      cenario: 'Erro 500 ao excluir lançamento (DELETE /lancamentos/:id)',
      operacao: 'delete',
      setupOverride: () => ({
        'DELETE /lancamentos/101': async () =>
          createJsonResponse(
            { detail: 'Lançamento vinculado a fechamento contábil bloqueado.' },
            500
          ),
      }),
      mensagemEsperada: 'Lançamento vinculado a fechamento contábil bloqueado.',
    },
    {
      cenario:
        'Falha de rede ao alternar status (PATCH /lancamentos/:id/alternar-status)',
      operacao: 'toggleStatus',
      setupOverride: () => ({
        'PATCH /lancamentos/101/alternar-status': async () => {
          throw new Error('Falha de conexão com o servidor financeiro.');
        },
      }),
      mensagemEsperada: 'Falha de conexão com o servidor financeiro.',
    },
  ])(
    'exibe a mensagem de erro apropriada na UI quando ocorre: $cenario',
    async ({ operacao, setupOverride, mensagemEsperada }) => {
      routeOverrides = setupOverride();

      render(<FinancasClient initialData={[]} />);

      await waitFor(() => {
        expect(
          screen.getByText('Honorários Contratuais - Alfa S.A.')
        ).toBeInTheDocument();
      });

      if (operacao === 'create') {
        fireEvent.click(
          screen.getByRole('button', { name: /Novo Lançamento/i })
        );
        const dialog = screen.getByRole('dialog', {
          name: 'Novo Lançamento Financeiro',
        });

        fireEvent.change(within(dialog).getByLabelText('Título'), {
          target: { value: 'Lançamento com Erro' },
        });
        fireEvent.change(within(dialog).getByLabelText('Valor'), {
          target: { value: '500' },
        });
        fireEvent.click(
          within(dialog).getByRole('button', { name: 'Salvar Lançamento' })
        );

        await waitFor(() => {
          expect(within(dialog).getByRole('alert')).toHaveTextContent(
            mensagemEsperada
          );
        });
      } else if (operacao === 'delete') {
        const deleteButtons = screen.getAllByRole('button', {
          name: 'Excluir lançamento',
        });
        fireEvent.click(deleteButtons[0]);

        const deleteDialog = screen.getByRole('dialog');
        fireEvent.click(
          within(deleteDialog).getByRole('button', {
            name: 'Excluir lançamento',
          })
        );

        await waitFor(() => {
          expect(screen.getByRole('alert')).toHaveTextContent(mensagemEsperada);
        });
      } else if (operacao === 'toggleStatus') {
        const toggleButtons = screen.getAllByRole('button', {
          name: 'Marcar como pendente',
        });
        fireEvent.click(toggleButtons[0]);

        await waitFor(() => {
          expect(screen.getByRole('alert')).toHaveTextContent(mensagemEsperada);
        });
      }
    }
  );

  it('renderiza FinancasPage (Server Component) buscando lançamentos iniciais via GET /lancamentos/ e permite cancelar exclusão e exportar relatório', async () => {
    const pageElement = await FinancasPage();
    render(pageElement);

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(deleteButtons[0]);

    const deleteDialog = screen.getByRole('dialog');
    expect(
      within(deleteDialog).getByText('Excluir lançamento?')
    ).toBeInTheDocument();

    fireEvent.click(
      within(deleteDialog).getByRole('button', { name: 'Cancelar' })
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('filtra lançamentos na tabela (datas, categoria, Outros, status), navega na paginação e limpa filtros no FinancasClient', async () => {
    dbCategorias.push({ categoria_id: 99, nome_categoria: 'Outros' });
    dbLancamentos.push(
      {
        lancamento_id: 103,
        tipo: 's',
        titulo: 'Multa Contratual Atrasada',
        descricao: 'Encargo vencido',
        valor: 450,
        data_vencimento: '2026-07-01',
        data_pagamento: null,
        categoria_id: 99,
        categoria: 'Outros',
        status: 'Atrasado',
        recorrente: false,
      },
      {
        lancamento_id: 104,
        tipo: 'e',
        titulo: 'Reembolso Avulso Sem Categoria',
        descricao: '',
        valor: 200,
        data_vencimento: '2026-08-20',
        data_pagamento: '2026-08-20',
        categoria_id: null,
        categoria: 'Outros',
        status: 'Realizado',
        recorrente: false,
      }
    );

    routeOverrides['GET /lancamentos/paginado'] = async (url) => {
      const parsedUrl = new URL(url);
      const page = Number(parsedUrl.searchParams.get('page')) || 1;
      const status = parsedUrl.searchParams.get('status');
      let itens = [...dbLancamentos];
      if (status) {
        itens = itens.filter(
          (i) => i.status.toLowerCase() === status.toLowerCase()
        );
      }
      return createJsonResponse(
        {
          itens: itens.slice(0, 2),
          total: status ? itens.length : 12,
          page,
          page_size: 5,
          total_pages: status ? 1 : 3,
        },
        200
      );
    };

    render(
      <FinancasClient
        initialData={[
          {
            id: 101,
            lancamento_id: 101,
            tipo: 'entrada',
            titulo: 'Honorários Contratuais - Alfa S.A.',
            valor: 5000,
            data: '10/08/2026',
            categoria: 'Outros',
            categoria_id: 10,
            status: 'realizado',
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));
    expect(screen.getByRole('menuitem', { name: 'PDF' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));

    const nextBtn = screen.getByRole('button', { name: 'Próxima página' });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    });

    const prevBtn = screen.getByRole('button', { name: 'Página anterior' });
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Data inicial'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('Data final'), {
      target: { value: '2026-08-31' },
    });

    const statusSelect = screen.getByLabelText('Filtrar por status');
    fireEvent.change(statusSelect, { target: { value: 'pendente' } });
    await waitFor(() => {
      expect(screen.getByText('Aluguel da Sede - Agosto')).toBeInTheDocument();
    });

    fireEvent.change(statusSelect, { target: { value: 'realizado' } });
    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    fireEvent.change(statusSelect, { target: { value: 'atrasado' } });
    await waitFor(() => {
      expect(screen.getByText('Multa Contratual Atrasada')).toBeInTheDocument();
    });

    const catSelect = screen.getByLabelText('Filtrar por categoria');
    fireEvent.change(statusSelect, { target: { value: '' } });
    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    fireEvent.change(catSelect, { target: { value: 'Outros' } });

    await waitFor(() => {
      expect(
        screen.getByText('Reembolso Avulso Sem Categoria')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Data inicial')).toHaveValue('');
      expect(screen.getByLabelText('Data final')).toHaveValue('');
      expect(catSelect).toHaveValue('');
      expect(statusSelect).toHaveValue('');
    });
  });

  it('exercita filtragem e paginação client-side na LancamentosTable quando onFilter não é fornecido e exibe estado vazio', async () => {
    const sampleItems = [
      {
        id: 1,
        titulo: 'Receita 1',
        descricao: 'Desc 1',
        categoria: 'Honorários',
        tipo: 'entrada',
        valor: 1000,
        data: '10/08/2026',
        dataIso: '2026-08-10',
        status: 'realizado',
      },
      {
        id: 2,
        titulo: 'Despesa 2',
        descricao: '',
        categoria: 'Custas',
        tipo: 'saida',
        valor: 500,
        data: '15/08/2026',
        dataIso: '2026-08-15',
        status: 'pendente',
      },
      {
        id: 3,
        titulo: 'Despesa 3 Outros',
        descricao: '',
        categoria: 'Outros',
        tipo: 'saida',
        valor: 300,
        data: '20/08/2026',
        dataIso: '2026-08-20',
        status: 'atrasado',
      },
    ];

    render(
      <LancamentosTable
        lancamentos={sampleItems}
        categorias={[{ nome: 'Honorários' }, { nome_categoria: 'Outros' }]}
        pageSize={2}
      />
    );

    expect(screen.getByText('Receita 1')).toBeInTheDocument();
    expect(screen.getByText('Despesa 2')).toBeInTheDocument();
    expect(screen.queryByText('Despesa 3 Outros')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(screen.getByText('Despesa 3 Outros')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(screen.getByText('Receita 1')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Data inicial'), {
      target: { value: '2026-08-12' },
    });
    expect(screen.queryByText('Receita 1')).not.toBeInTheDocument();
    expect(screen.getByText('Despesa 2')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Data final'), {
      target: { value: '2026-08-18' },
    });
    expect(screen.getByText('Despesa 2')).toBeInTheDocument();
    expect(screen.queryByText('Despesa 3 Outros')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
      target: { value: 'Outros' },
    });
    expect(screen.getByText('Despesa 3 Outros')).toBeInTheDocument();
    expect(screen.queryByText('Receita 1')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
      target: { value: 'Honorários' },
    });
    expect(screen.getByText('Receita 1')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por status'), {
      target: { value: 'atrasado' },
    });
    expect(
      screen.getByText('Nenhum lançamento encontrado.')
    ).toBeInTheDocument();
  });

  it('valida campos obrigatórios no LancamentoModal, cria nova categoria inline via CategoriaAutocomplete e exclui categoria antiga ao editar', async () => {
    render(<FinancasClient initialData={[]} />);

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Novo Lançamento/i }));
    const dialog = screen.getByRole('dialog', {
      name: 'Novo Lançamento Financeiro',
    });

    // Validação de título vazio
    fireEvent.change(within(dialog).getByLabelText('Título'), {
      target: { value: '   ' },
    });
    fireEvent.submit(dialog);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Por favor, informe o título do lançamento.'
    );

    // Validação de valor inválido
    fireEvent.change(within(dialog).getByLabelText('Título'), {
      target: { value: 'Consultoria Especial' },
    });
    fireEvent.change(within(dialog).getByLabelText('Valor'), {
      target: { value: '0' },
    });
    fireEvent.submit(dialog);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Por favor, informe um valor válido maior que zero.'
    );

    // Alternar tipo Saída -> Entrada
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saída' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrada' }));

    // CategoriaAutocomplete: digitar nova categoria, clicar fora e depois selecionar "Nova categoria"
    const categoriaInput = within(dialog).getByLabelText('Categoria');
    fireEvent.change(categoriaInput, {
      target: { value: 'Consultoria Tributária' },
    });

    await waitFor(() => {
      expect(
        within(dialog).getByText(/Nova categoria: "Consultoria Tributária"/i)
      ).toBeInTheDocument();
    });

    fireEvent.mouseDown(document.body);
    expect(
      within(dialog).queryByText(/Nova categoria:/i)
    ).not.toBeInTheDocument();

    fireEvent.focus(categoriaInput);
    fireEvent.mouseDown(
      within(dialog).getByText(/Nova categoria: "Consultoria Tributária"/i)
    );
    expect(categoriaInput).toHaveValue('Consultoria Tributária');

    fireEvent.change(within(dialog).getByLabelText('Valor'), {
      target: { value: '2500' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar Lançamento' })
    );

    await waitFor(() => {
      expect(screen.getByText('Consultoria Especial')).toBeInTheDocument();
    });

    const postCatCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/categorias-lancamento') &&
        init?.method === 'POST'
    );
    expect(postCatCall).toBeDefined();

    // Editar lançamento existente trocando sua categoria para disparar exclusão da categoria antiga sem uso
    const editButtons = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editButtons[0]);

    const editDialog = screen.getByRole('dialog', {
      name: 'Editar Lançamento Financeiro',
    });
    const editCatInput = within(editDialog).getByLabelText('Categoria');
    fireEvent.change(editCatInput, {
      target: { value: 'Custas Processuais' },
    });

    fireEvent.click(
      within(editDialog).getByRole('button', { name: 'Salvar Alterações' })
    );

    await waitFor(() => {
      const deleteCatCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes('/categorias-lancamento/') &&
          init?.method === 'DELETE'
      );
      expect(deleteCatCall).toBeDefined();
    });
  });

  it('trata erro ao atualizar lançamento (PUT /lancamentos/:id) e erro ao carregar categorias no CategoriaAutocomplete', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    routeOverrides['PUT /lancamentos/101'] = async () =>
      createJsonResponse({ detail: 'Erro ao atualizar registro.' }, 500);

    let failCategorias = true;
    routeOverrides['GET /categorias-lancamento'] = async () => {
      if (failCategorias) {
        throw new Error('Falha ao buscar categorias');
      }
      return createJsonResponse(dbCategorias, 200);
    };

    render(
      <FinancasClient initialData={[toLancamento(initialApiLancamentos[0])]} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
    });

    failCategorias = false;

    const editButtons = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    failCategorias = true;
    fireEvent.click(editButtons[0]);

    const editDialog = screen.getByRole('dialog', {
      name: 'Editar Lançamento Financeiro',
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao listar categorias',
        expect.any(Error)
      );
    });

    failCategorias = false;
    fireEvent.click(
      within(editDialog).getByRole('button', { name: 'Salvar Alterações' })
    );

    await waitFor(() => {
      expect(within(editDialog).getByRole('alert')).toHaveTextContent(
        'Erro ao atualizar registro.'
      );
    });

    consoleSpy.mockRestore();
  });

  it('cobre variações de dados iniciais no LancamentoModal, CategoriaAutocomplete e fallbacks de respostas da API no useFinancas', async () => {
    dbCategorias.push({ id: 77, nome: 'Categoria Legada' }, {});

    routeOverrides['POST /categorias-lancamento'] = async () =>
      createJsonResponse({ id: 88 }, 201);

    const onClose = vi.fn();
    const onSave = vi.fn().mockRejectedValueOnce({});

    const { rerender, unmount } = render(
      <LancamentoModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        initialItem={{
          categoria: 'Honorários',
          dataPagamento: '10/08/2026',
          dataVencimento: '15/08/2026',
        }}
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    rerender(
      <LancamentoModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        initialItem={{
          categoria: '',
          data_pagamento: '10/08/2026',
          data_vencimento: '15/08/2026',
        }}
      />
    );

    rerender(
      <LancamentoModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        initialItem={{
          data: '10/08/2026',
        }}
      />
    );

    rerender(
      <LancamentoModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        initialItem={{}}
      />
    );

    const modalDialog = screen.getByRole('dialog', {
      name: 'Editar Lançamento Financeiro',
    });
    const catInput = within(modalDialog).getByLabelText('Categoria');
    fireEvent.focus(catInput);

    // Submeter sem data e com erro genérico (sem .message) no onSave
    fireEvent.change(within(modalDialog).getByLabelText('Título'), {
      target: { value: 'Lançamento Sem Datas' },
    });
    fireEvent.change(within(modalDialog).getByLabelText('Valor'), {
      target: { value: '100' },
    });
    fireEvent.change(catInput, {
      target: { value: 'Categoria Legada' },
    });
    fireEvent.submit(modalDialog);

    await waitFor(() => {
      expect(within(modalDialog).getByRole('alert')).toHaveTextContent(
        'Erro ao salvar o lançamento financeiro.'
      );
    });

    // Submeter com nova categoria retornando apenas { id: 88 }
    onSave.mockResolvedValueOnce({});
    fireEvent.change(catInput, {
      target: { value: 'Nova Sem Nome Retornado' },
    });
    fireEvent.submit(modalDialog);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(2);
    });

    unmount();

    // Testar FinancasClient com categorias legadas ({ id, nome } e sem nome) e item com categoria_id inexistente (999)
    dbCategorias = [
      ...initialApiCategorias,
      { id: 77, nome: 'Categoria Legada' },
      { categoria_id: 888, nome_categoria: '' },
    ];
    dbLancamentos.push(
      {
        lancamento_id: 105,
        tipo: 'e',
        titulo: 'Segundo Honorário Compartilhando Categoria',
        valor: 1200,
        data_vencimento: '2026-08-25',
        categoria_id: 10,
        categoria: 'Outros',
        status: 'Pendente',
      },
      {
        lancamento_id: 106,
        tipo: 's',
        titulo: 'Item Com Categoria ID Inexistente',
        valor: 150,
        data_vencimento: '2026-08-26',
        categoria_id: 999,
        categoria: 'Outros',
        status: 'Pendente',
      }
    );

    const { unmount: unmountClient1 } = render(<FinancasClient />);

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    // Editar item 101 trocando de categoria_id=10 para 20 enquanto item 105 ainda usa categoria_id=10 (hasMore === true)
    const editBtns1 = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editBtns1[0]);
    const editDlg1 = screen.getByRole('dialog', {
      name: 'Editar Lançamento Financeiro',
    });
    fireEvent.change(within(editDlg1).getByLabelText('Categoria'), {
      target: { value: 'Custas Processuais' },
    });
    fireEvent.submit(editDlg1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Filtrar novamente para que prev.forEach processe item com .nome ({ id: 77, nome: 'Categoria Legada' })
    fireEvent.change(screen.getByLabelText('Filtrar por status'), {
      target: { value: 'pendente' },
    });
    await waitFor(() => {
      expect(screen.getByText('Aluguel da Sede - Agosto')).toBeInTheDocument();
    });

    // Criar lançamento quando categorias já possui item com .nome ({ id: 77, nome: 'Categoria Legada' })
    fireEvent.click(screen.getByRole('button', { name: /Novo Lançamento/i }));
    const newDlg1 = screen.getByRole('dialog', {
      name: 'Novo Lançamento Financeiro',
    });
    fireEvent.change(within(newDlg1).getByLabelText('Título'), {
      target: { value: 'Lançamento Com Categoria Legada No Estado' },
    });
    fireEvent.change(within(newDlg1).getByLabelText('Valor'), {
      target: { value: '450' },
    });
    fireEvent.change(within(newDlg1).getByLabelText('Categoria'), {
      target: { value: 'Categoria Legada' },
    });
    fireEvent.submit(newDlg1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    unmountClient1();

    // Resetar dbLancamentos para que item 101 seja o primeiro item na segunda montagem
    dbLancamentos = [
      ...initialApiLancamentos,
      {
        lancamento_id: 105,
        tipo: 'e',
        titulo: 'Segundo Honorário Compartilhando Categoria',
        valor: 1200,
        data_vencimento: '2026-08-25',
        categoria_id: 10,
        categoria: 'Outros',
        status: 'Pendente',
      },
    ];

    // Testar FinancasClient com listarCategorias retornando null, resumo falhando (null) e respostas null em POST/PUT/PATCH
    routeOverrides['GET /categorias-lancamento'] = async () =>
      createJsonResponse(null, 200);
    routeOverrides['GET /lancamentos/resumo'] = async () =>
      createJsonResponse({}, 500);

    routeOverrides['GET /lancamentos/paginado'] = async () =>
      createJsonResponse({ itens: dbLancamentos }, 200);

    routeOverrides['POST /lancamentos/'] = async () =>
      createJsonResponse(null, 201);

    routeOverrides['PUT /lancamentos/101'] = async () =>
      createJsonResponse(null, 200);

    routeOverrides['PATCH /lancamentos/101/alternar-status'] = async () =>
      createJsonResponse(null, 200);

    render(<FinancasClient />);

    await waitFor(() => {
      expect(
        screen.getByText('Honorários Contratuais - Alfa S.A.')
      ).toBeInTheDocument();
    });

    // Alternar status recebendo null da API
    const toggleBtns = screen.getAllByRole('button', {
      name: /Marcar como/i,
    });
    fireEvent.click(toggleBtns[0]);

    // Criar lançamento recebendo null da API
    fireEvent.click(screen.getByRole('button', { name: /Novo Lançamento/i }));
    const newDialog = screen.getByRole('dialog', {
      name: 'Novo Lançamento Financeiro',
    });
    fireEvent.change(within(newDialog).getByLabelText('Título'), {
      target: { value: 'Lançamento Resposta Mínima' },
    });
    fireEvent.change(within(newDialog).getByLabelText('Valor'), {
      target: { value: '300' },
    });
    fireEvent.change(within(newDialog).getByLabelText('Data de Criação'), {
      target: { value: '' },
    });
    fireEvent.submit(newDialog);

    await waitFor(() => {
      expect(
        screen.getByText('Lançamento Resposta Mínima')
      ).toBeInTheDocument();
    });

    // Editar lançamento 101 recebendo null da API
    const editBtns = screen.getAllByRole('button', {
      name: 'Editar lançamento',
    });
    fireEvent.click(editBtns[1]);
    const editDlg = screen.getByRole('dialog', {
      name: 'Editar Lançamento Financeiro',
    });
    fireEvent.change(within(editDlg).getByLabelText('Data de Criação'), {
      target: { value: '' },
    });
    fireEvent.change(within(editDlg).getByLabelText('Categoria'), {
      target: { value: '' },
    });
    fireEvent.submit(editDlg);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Excluir lançamento 101 enquanto 105 ainda usa categoria_id=10 (hasMore === true)
    const delBtns = screen.getAllByRole('button', {
      name: 'Excluir lançamento',
    });
    fireEvent.click(delBtns[1]);
    const delDlg = screen.getByRole('dialog');
    fireEvent.click(
      within(delDlg).getByRole('button', { name: 'Excluir lançamento' })
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('exercita diretamente os serviços e utilitários financeiros para casos de borda e fallbacks', async () => {
    // utils/financas.js edge cases
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
    expect(formatCurrency(null)).toBe('R$ 0,00');
    expect(formatCurrency('invalid')).toBe('R$ 0,00');
    expect(formatCurrency(1500.5)).toContain('1.500,50');

    expect(formatDateToBr('')).toBe('');
    expect(formatDateToBr('10/08/2026')).toBe('10/08/2026');
    expect(formatDateToBr('2026-08')).toBe('2026-08');
    expect(formatDateToBr('2026-08-10T00:00:00Z')).toBe('10/08/2026');

    expect(formatDateToIso('')).toBe('');
    expect(formatDateToIso('2026-08-10')).toBe('2026-08-10');
    expect(formatDateToIso('10/08')).toBe('10/08');
    expect(formatDateToIso('10/08/2026')).toBe('2026-08-10');

    expect(obterDataEfetivaIso(null)).toBe('');
    expect(
      obterDataEfetivaIso({
        status: 'realizado',
        data_vencimento: '2026-03-10',
        data_pagamento: '2026-11-07',
      })
    ).toBe('2026-11-07');

    expect(verificarStatusPorVencimento(null)).toBe('pendente');
    expect(verificarStatusPorVencimento({})).toBe('pendente');
    expect(
      verificarStatusPorVencimento(
        { dataVencimento: '01/01/2020' },
        new Date('2026-01-01')
      )
    ).toBe('atrasado');
    expect(
      verificarStatusPorVencimento(
        { dataVencimento: 'invalid/date/str' },
        new Date('2026-01-01')
      )
    ).toBe('pendente');

    expect(
      calcularResumoFinanceiro([
        { tipo: 'entrada', valor: 1000 },
        { tipo: 'saida', valor: 400 },
        { tipo: 'outro', valor: null },
      ])
    ).toEqual({ totalEntradas: 1000, totalSaidas: 400, saldo: 600 });

    expect(parseApiError(null, 'Padrao')).toBe('Padrao');
    expect(parseApiError('Erro string')).toBe('Erro string');
    expect(parseApiError({ detail: 'Detalhe string' })).toBe('Detalhe string');
    expect(
      parseApiError({
        detail: [
          'Erro 1',
          { msg: 'Msg sem loc' },
          { loc: ['body', 'campo'], msg: 'Invalido' },
          { codigo: 123 },
        ],
      })
    ).toBe('Erro 1; Msg sem loc; campo: Invalido; {"codigo":123}');
    expect(parseApiError({ detail: { erro: true } })).toBe('{"erro":true}');
    expect(parseApiError({ message: 'Erro message' })).toBe('Erro message');
    expect(parseApiError({}, 'Fallback')).toBe('Fallback');

    expect(toLancamento(null)).toBeNull();
    expect(toLancamento({ id: 55, tipo: 'saída' })).toMatchObject({
      id: 55,
      tipo: 'saida',
      valor: 0,
      status: 'pendente',
    });
    expect(toApiLancamento(null)).toEqual({});
    expect(
      toApiLancamento({
        tipo: 'saida',
        titulo: 'Teste',
        valor: 100,
        data: '10/08/2026',
      })
    ).toMatchObject({
      tipo: 's',
      titulo: 'Teste',
      valor: 100,
      data_pagamento: '2026-08-10',
    });
    expect(
      toApiLancamento({
        dataPagamento: '10/08/2026',
      })
    ).toMatchObject({ data_pagamento: '2026-08-10' });
    expect(
      toApiLancamento({
        data_pagamento: '10/08/2026',
      })
    ).toMatchObject({ data_pagamento: '2026-08-10' });
    expect(
      toApiLancamento({
        dataIso: '2026-08-10',
      })
    ).toMatchObject({ data_pagamento: '2026-08-10' });
    expect(toApiLancamento({})).toMatchObject({
      tipo: 'e',
      titulo: '',
      valor: 0,
      data_pagamento: null,
    });

    // services/financas.js edge cases
    const listaComFiltros = await listarFinancas({
      inicio: '2026-08-01',
      fim: '2026-08-31',
      tipo: 'e',
      situacao: 'Realizado',
      categoria: 'Honorários',
      categoria_id: 10,
      cliente_id: 1,
    });
    expect(Array.isArray(listaComFiltros)).toBe(true);

    const listaOutrosSemPaginacao = await listarFinancas({
      categoria: 'Outros',
      inicio: '2026-08-01',
    });
    expect(Array.isArray(listaOutrosSemPaginacao)).toBe(true);

    const resumoComFiltros = await obterResumoFinancas({
      inicio: '2026-08-01',
      fim: '2026-08-31',
      tipo: 'e',
      situacao: 'Realizado',
      categoria: 'Honorários',
      categoria_id: 10,
    });
    expect(resumoComFiltros).toEqual(initialResumoResponse);

    // Resumo Outros com entrada/saida e realizado/pendente/atrasado (incluindo valor 0/null)
    dbCategorias.push({ id: 77, nome: 'CatComId' }, {});
    const resumoCatComId = await obterResumoFinancas({
      categoria: 'CatComId',
    });
    expect(resumoCatComId).toEqual(initialResumoResponse);

    const resumoCatInexistente = await obterResumoFinancas({
      categoria: 'Inexistente',
    });
    expect(resumoCatInexistente).toEqual(initialResumoResponse);

    dbLancamentos = [
      {
        lancamento_id: 201,
        tipo: 'e',
        valor: 0,
        status: 'Realizado',
        categoria_id: null,
      },
      {
        lancamento_id: 202,
        tipo: 's',
        valor: 0,
        status: 'Atrasado',
        categoria_id: null,
      },
      {
        lancamento_id: 203,
        tipo: 's',
        valor: 100,
        status: 'Pendente',
        categoria_id: null,
      },
    ];
    const resumoOutros = await obterResumoFinancas({ categoria: 'Outros' });
    expect(resumoOutros).toEqual({
      realizado: { quantidade: 1, total_entradas: 0, total_saidas: 0 },
      atrasado: { quantidade: 1, total_entradas: 0, total_saidas: 0 },
      pendente: { quantidade: 1, total_entradas: 0, total_saidas: 100 },
    });

    // Fallbacks de erro nos serviços
    routeOverrides['GET /lancamentos/resumo'] = async () =>
      createJsonResponse({}, 500);
    expect(await obterResumoFinancas()).toBeNull();

    routeOverrides['GET /lancamentos/paginado'] = async () =>
      createJsonResponse({}, 500);
    expect(await listarFinancas({ page: 1 })).toEqual({ itens: [], total: 0 });

    routeOverrides['GET /lancamentos/'] = async () =>
      createJsonResponse({}, 500);
    expect(await listarFinancas()).toEqual([]);
    expect(await listarFinancas({ categoria: 'Outros', page: 1 })).toEqual({
      itens: [],
      total: 0,
    });

    routeOverrides['GET /categorias-lancamento'] = async () =>
      createJsonResponse({}, 500);
    expect(await listarCategorias()).toEqual([]);

    routeOverrides['POST /categorias-lancamento'] = async () =>
      createJsonResponse({ detail: 'Categoria duplicada' }, 400);
    await expect(criarCategoria('Honorários')).rejects.toThrow(
      'Categoria duplicada'
    );

    routeOverrides['DELETE /categorias-lancamento/10'] = async () =>
      createJsonResponse({ detail: 'Categoria em uso' }, 400);
    await expect(excluirCategoria(10)).rejects.toThrow('Categoria em uso');

    // Respostas de erro sem JSON válido (exercita .catch(() => null)) e sem token
    sessionStorage.removeItem('access_token');
    const invalidJsonErrorResponse = () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    routeOverrides['POST /lancamentos/'] = async () =>
      invalidJsonErrorResponse();
    await expect(criarFinancas({ titulo: 'X', valor: 10 })).rejects.toThrow(
      'Não foi possível cadastrar o lançamento.'
    );

    routeOverrides['PUT /lancamentos/101'] = async () =>
      invalidJsonErrorResponse();
    await expect(
      atualizarFinancas(101, { titulo: 'X', valor: 10 })
    ).rejects.toThrow('Não foi possível atualizar o lançamento.');

    routeOverrides['DELETE /lancamentos/101'] = async () =>
      invalidJsonErrorResponse();
    await expect(excluirFinancas(101)).rejects.toThrow(
      'Não foi possível excluir o lançamento.'
    );

    routeOverrides['PATCH /lancamentos/101/alternar-status'] = async () =>
      invalidJsonErrorResponse();
    await expect(mudarStatusLancamento(101)).rejects.toThrow(
      'Não foi possível atualizar o status do lançamento.'
    );

    routeOverrides['POST /categorias-lancamento'] = async () =>
      invalidJsonErrorResponse();
    await expect(criarCategoria('Cat')).rejects.toThrow(
      'Não foi possível criar a categoria.'
    );

    routeOverrides['DELETE /categorias-lancamento/10'] = async () =>
      invalidJsonErrorResponse();
    await expect(excluirCategoria(10)).rejects.toThrow(
      'Não foi possível excluir a categoria.'
    );

    // Exceções de rede em listarFinancas e obterResumoFinancas
    routeOverrides['GET /lancamentos/paginado'] = async () => {
      throw new Error('Network fail');
    };
    expect(await listarFinancas({ page: 1 })).toEqual({ itens: [], total: 0 });

    routeOverrides['GET /lancamentos/'] = async () => {
      throw new Error('Network fail');
    };
    expect(await listarFinancas()).toEqual([]);

    routeOverrides['GET /lancamentos/resumo'] = async () => {
      throw new Error('Network fail');
    };
    expect(await obterResumoFinancas()).toBeNull();
  });

  it('integra o Dashboard Financeiro (US06) em regime de caixa por data_pagamento, sem depender da paginação da tabela e atualizando em tempo real', async () => {
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesIdxAtual = agora.getMonth();
    const mesAtualStr = String(mesIdxAtual + 1).padStart(2, '0');
    const dataMesAtual = `${anoAtual}-${mesAtualStr}-10`;
    const mesAnteriorDate = new Date(anoAtual, mesIdxAtual - 1, 10);
    const labelMesAtual = MESES_ABREV[mesIdxAtual];
    const labelMesAnterior = MESES_ABREV[mesAnteriorDate.getMonth()];

    dbCategorias = [
      ...initialApiCategorias,
      { categoria_id: 40, nome_categoria: 'Perícia Técnica' },
    ];

    // 7 lançamentos (> page_size 5) para validar que a rosquinha pega todos os itens sem depender da paginação
    dbLancamentos = [
      {
        lancamento_id: 301,
        tipo: 'e',
        titulo: 'Honorários Recebidos Mês Atual',
        descricao: 'Parcela recebida',
        valor: 5000,
        data_vencimento: dataMesAtual,
        data_pagamento: dataMesAtual,
        categoria_id: 10,
        status: 'Realizado',
        recorrente: false,
      },
      {
        lancamento_id: 302,
        tipo: 's',
        titulo: 'Despesa Atrasada de Março',
        descricao: 'Conta antiga atrasada',
        valor: 1500,
        data_vencimento: '2026-03-10',
        data_pagamento: null,
        categoria_id: 30,
        status: 'Atrasado',
        recorrente: false,
      },
      {
        lancamento_id: 303,
        tipo: 's',
        titulo: 'Aluguel Pago no Mês',
        descricao: 'Locação',
        valor: 3200,
        data_vencimento: dataMesAtual,
        data_pagamento: dataMesAtual,
        categoria_id: 30,
        status: 'Realizado',
        recorrente: true,
      },
      {
        lancamento_id: 304,
        tipo: 's',
        titulo: 'Custas Pagas no Mês',
        descricao: 'Custas',
        valor: 1100,
        data_vencimento: dataMesAtual,
        data_pagamento: dataMesAtual,
        categoria_id: 20,
        status: 'Realizado',
        recorrente: false,
      },
      {
        lancamento_id: 305,
        tipo: 'e',
        titulo: 'Honorários Pendentes',
        descricao: 'A receber',
        valor: 2400,
        data_vencimento: dataMesAtual,
        data_pagamento: null,
        categoria_id: 10,
        status: 'Pendente',
        recorrente: false,
      },
      {
        lancamento_id: 306,
        tipo: 's',
        titulo: 'Laudo Contábil Página 2',
        descricao: 'Item na página 2 da tabela',
        valor: 1200,
        data_vencimento: dataMesAtual,
        data_pagamento: dataMesAtual,
        categoria_id: 40,
        status: 'Realizado',
        recorrente: false,
      },
      {
        lancamento_id: 307,
        tipo: 's',
        titulo: 'Despesa Pendente Página 2',
        descricao: 'Não paga ainda',
        valor: 800,
        data_vencimento: dataMesAtual,
        data_pagamento: null,
        categoria_id: 40,
        status: 'Pendente',
        recorrente: false,
      },
    ];

    render(<FinancasClient initialData={[]} />);

    // Cards mostram apenas realizados do mês atual e todas as entradas pendentes em A Receber
    // Rosquinha exibe Perícia Técnica (item 306 da página 2!) mesmo estando na página 1 da tabela
    await waitFor(() => {
      expect(screen.getByTestId('kpi-receita-mes')).toHaveTextContent(
        '5.000,00'
      );
      expect(screen.getByTestId('kpi-despesas-mes')).toHaveTextContent(
        '5.500,00'
      );
      expect(screen.getByTestId('kpi-saldo-liquido')).toHaveTextContent(
        '-500,00'
      );
      expect(screen.getByTestId('kpi-a-receber')).toHaveTextContent('2.400,00');
      expect(
        screen.getByTestId('donut-segment-Perícia Técnica')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('donut-segment-Despesas Operacionais')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('donut-segment-Custas Processuais')
      ).toBeInTheDocument();
    });

    // Navegar para a página 2 da tabela NÃO reduz as categorias da rosquinha
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => {
      expect(screen.getByText('Laudo Contábil Página 2')).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('donut-segment-Despesas Operacionais')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('donut-segment-Custas Processuais')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('donut-segment-Perícia Técnica')
    ).toBeInTheDocument();

    // Voltar para página 1 e marcar a despesa atrasada de Março (302) como realizada hoje -> atualiza Despesas do Mês na hora sem F5!
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await waitFor(() => {
      expect(screen.getByText('Despesa Atrasada de Março')).toBeInTheDocument();
    });

    const concluirBtns = screen.getAllByRole('button', {
      name: 'Marcar como realizado',
    });
    fireEvent.click(concluirBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('kpi-despesas-mes')).toHaveTextContent(
        '7.000,00'
      );
      expect(screen.getByTestId('kpi-saldo-liquido')).toHaveTextContent(
        '-2.000,00'
      );
    });

    const graficoInitialCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes(
          '/lancamentos/grafico?dias=180&status=Realizado'
        ) &&
        (!init?.method || init.method === 'GET')
    );
    expect(graficoInitialCall).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '3m' }));
    await waitFor(() => {
      const call3m = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/lancamentos/grafico?dias=90&status=Realizado')
      );
      expect(call3m).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Valor mínimo do gráfico'), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText('Valor máximo do gráfico'), {
      target: { value: '6000' },
    });

    await waitFor(() => {
      const callValores = fetchMock.mock.calls.find(([url]) =>
        String(url).includes(
          '/lancamentos/grafico?dias=90&valor_min=1000&valor_max=6000&status=Realizado'
        )
      );
      expect(callValores).toBeDefined();
    });

    const faixaAnterior = screen.getByTestId(
      `ponto-entrada-${labelMesAnterior}`
    );
    fireEvent.mouseEnter(faixaAnterior);
    expect(screen.getByTestId('fluxo-crosshair')).toBeInTheDocument();
    expect(screen.getByTestId('fluxo-tooltip')).toBeInTheDocument();

    const faixaAtual = screen.getByTestId(`ponto-entrada-${labelMesAtual}`);
    fireEvent.mouseMove(faixaAtual);
    fireEvent.click(faixaAtual);
    expect(screen.queryByTestId('fluxo-tooltip')).not.toBeInTheDocument();
    fireEvent.click(faixaAtual);
    expect(screen.getByTestId('fluxo-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(faixaAtual.closest('div'));
    expect(screen.queryByTestId('fluxo-tooltip')).not.toBeInTheDocument();

    const segDespesas = screen.getByTestId(
      'donut-segment-Despesas Operacionais'
    );
    fireEvent.mouseEnter(segDespesas);
    expect(screen.getByTestId('donut-center-tooltip')).toBeInTheDocument();
    fireEvent.click(segDespesas);
    expect(
      screen.queryByTestId('donut-center-tooltip')
    ).not.toBeInTheDocument();
    fireEvent.click(segDespesas);
    expect(screen.getByTestId('donut-center-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(segDespesas.closest('div'));

    const legendaDespesas = screen.getAllByText('Despesas Operacionais')[0];
    fireEvent.mouseEnter(legendaDespesas.parentElement);
    expect(screen.getByTestId('donut-center-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(legendaDespesas.parentElement);

    // Exercita helpers SVG, indicadores e utilitários/serviços de gráfico e calendário
    expect(buildSmoothLinePath([])).toBe('');
    expect(buildSmoothLinePath([{ x: 5, y: 10 }])).toBe('M 5.0 10.0');
    expect(buildSmoothAreaPath([])).toBe('');
    expect(buildSmoothAreaPath([{ x: 5, y: 10 }], 200)).toContain(
      'L 5.0 200.0'
    );

    expect(formatCurrencyNumber(undefined)).toBe('0,00');
    expect(formatCompactCurrency(undefined)).toBe('R$ 0k');
    expect(formatCompactCurrency(0)).toBe('R$ 0k');
    expect(formatCompactCurrency(450)).toBe('R$ 450');
    expect(formatCompactCurrency(5500)).toBe('R$ 5.5k');
    expect(formatCompactCurrency(11000)).toBe('R$ 11k');

    expect(calcularIndicadoresFinanceiros(null)).toEqual({
      receitaMes: 0,
      despesasMes: 0,
      saldoLiquido: 0,
      aReceber: 0,
    });
    expect(
      calcularIndicadoresFinanceiros([], {
        realizado: { total_entradas: 2000, total_saidas: 500 },
        pendente: { total_entradas: 300 },
      })
    ).toEqual({
      receitaMes: 2000,
      despesasMes: 500,
      saldoLiquido: 1500,
      aReceber: 300,
    });
    expect(
      calcularIndicadoresFinanceiros([
        { tipo: 'entrada', valor: 1000, status: 'realizado' },
        { tipo: 'entrada', valor: 500, status: 'pendente' },
        { tipo: 'saida', valor: 300, status: 'realizado' },
      ])
    ).toEqual({
      receitaMes: 1000,
      despesasMes: 300,
      saldoLiquido: 700,
      aReceber: 500,
    });

    expect(
      agruparFluxoCaixaPorMes(
        [{ data: '2026-08-10', total_entradas: 1000, total_saidas: 200 }],
        [],
        2,
        new Date('2026-08-15T12:00:00Z')
      )
    ).toHaveLength(2);
    expect(
      agruparFluxoCaixaPorMes(
        [],
        [
          {
            dataPagamentoIso: '2026-08-10',
            tipo: 'entrada',
            valor: 500,
            status: 'realizado',
          },
        ],
        2,
        '2026-08-31'
      )
    ).toHaveLength(2);
    expect(agruparDespesasPorCategoria(null)).toEqual([]);

    const graficoCompleto = await obterGraficoFinancas({
      inicio: '2026-01-01',
      fim: '2026-08-31',
      dias: 180,
      valor_min: 100,
      valor_max: 9000,
      status: 'Realizado',
      tipo: 'e',
      categoria_id: 10,
      cliente_id: 1,
    });
    expect(graficoCompleto.itens).toBeDefined();

    routeOverrides['GET /lancamentos/grafico'] = async () =>
      createJsonResponse({ itens: null }, 200);
    expect((await obterGraficoFinancas()).itens).toEqual([]);

    routeOverrides['GET /lancamentos/grafico'] = async () =>
      createJsonResponse([], 200);
    expect(await obterGraficoFinancas()).toBeNull();

    routeOverrides['GET /lancamentos/grafico'] = async () =>
      createJsonResponse({}, 500);
    expect(await obterGraficoFinancas()).toBeNull();

    routeOverrides['GET /lancamentos/grafico'] = async () => {
      throw new Error('Falha grafico');
    };
    expect(await obterGraficoFinancas()).toBeNull();

    routeOverrides['GET /lancamentos/calendario'] = async () =>
      createJsonResponse(dbLancamentos, 200);
    const cal = await obterCalendario({
      inicio: '2026-08-01',
      fim: '2026-08-31',
      status: 'Realizado',
      tipo: 'e',
      categoria_id: 10,
      cliente_id: 1,
    });
    expect(cal.length).toBeGreaterThan(0);

    routeOverrides['GET /lancamentos/calendario'] = async () =>
      createJsonResponse({}, 500);
    expect(await obterCalendario()).toEqual([]);

    routeOverrides['GET /lancamentos/calendario'] = async () => {
      throw new Error('Cal error');
    };
    expect(await obterCalendario()).toEqual([]);
    delete routeOverrides['GET /lancamentos/calendario'];

    routeOverrides['GET /lancamentos/calendario/exportar'] = async () => ({
      ok: true,
      status: 200,
      blob: async () =>
        new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' }),
    });
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => 'blob:test');
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
    const blob = await exportarCalendarioIcs({
      inicio: '2026-08-01',
      fim: '2026-08-31',
      status: 'Realizado',
      tipo: 'e',
      categoria_id: 10,
      cliente_id: 1,
    });
    expect(blob).toBeDefined();

    render(
      <FinancialDashboard
        lancamentos={[]}
        indicadores={{
          receitaMes: 100,
          despesasMes: 500,
          saldoLiquido: -400,
          aReceber: 0,
        }}
      />
    );
    expect(
      screen.getAllByLabelText('Tendência negativa').length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Nenhuma despesa registrada')).toBeInTheDocument();
  it('integra obterCalendario com filtros, sem filtros, respostas sem array e falhas de rede', async () => {
    // Com todos os filtros aplicados
    const resComFiltros = await obterCalendario({
      inicio: '2026-08-01',
      fim: '2026-08-31',
      status: 'Realizado',
      tipo: 'entrada',
      categoria_id: 10,
      cliente_id: 5,
    });
    expect(Array.isArray(resComFiltros)).toBe(true);

    // Sem filtros e sem token
    sessionStorage.removeItem('access_token');
    const resSemToken = await obterCalendario();
    expect(Array.isArray(resSemToken)).toBe(true);
    sessionStorage.setItem('access_token', FAKE_TOKEN);

    // Resposta não-ok
    routeOverrides['GET /lancamentos/calendario'] = async () =>
      createJsonResponse({}, 500);
    expect(await obterCalendario()).toEqual([]);

    // Resposta ok mas não-array
    routeOverrides['GET /lancamentos/calendario'] = async () =>
      createJsonResponse({ resultado: 'invalido' }, 200);
    expect(await obterCalendario()).toEqual([]);

    // Falha de rede (exceção no fetch)
    routeOverrides['GET /lancamentos/calendario'] = async () => {
      throw new Error('Network down');
    };
    expect(await obterCalendario()).toEqual([]);
  });

  it('integra exportarCalendarioIcs com todos os filtros, geração de blob, download e tratamento de erros da API', async () => {
    const createObjectUrlSpy = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost:3000/mock-ics');
    const revokeObjectUrlSpy = vi
      .spyOn(window.URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    // Exportação com sucesso com filtros
    const blob = await exportarCalendarioIcs({
      inicio: '2026-08-01',
      fim: '2026-08-31',
      status: 'Pendente',
      tipo: 'saida',
      categoria_id: 20,
      cliente_id: 3,
    });
    expect(blob).toBeTruthy();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith(
      'blob:http://localhost:3000/mock-ics'
    );

    // Exportação sem filtros e sem token
    sessionStorage.removeItem('access_token');
    const blobSemFiltros = await exportarCalendarioIcs();
    expect(blobSemFiltros).toBeTruthy();
    sessionStorage.setItem('access_token', FAKE_TOKEN);

    // Erro da API com mensagem de detalhe
    routeOverrides['GET /lancamentos/calendario/exportar'] = async () =>
      createJsonResponse(
        { detail: 'Filtro de datas inválido para exportação' },
        400
      );
    await expect(exportarCalendarioIcs()).rejects.toThrow(
      'Filtro de datas inválido para exportação'
    );

    // Erro da API com JSON inválido (fallback)
    routeOverrides['GET /lancamentos/calendario/exportar'] = async () =>
      invalidJsonErrorResponse(500);
    await expect(exportarCalendarioIcs()).rejects.toThrow(
      'Não foi possível exportar o calendário.'
    );

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  describe('exportação de relatórios', () => {
    let downloads;
    let click;

    const exportBlob = new Blob(['relatorio']);
    const exportCalls = () =>
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/lancamentos/exportar')
      );

    const respondExport = (response) => {
      routeOverrides['GET /lancamentos/exportar'] = async () => response;
    };

    const exportAs = (format) => {
      fireEvent.click(screen.getByRole('button', { name: /Relatório/i }));
      fireEvent.click(screen.getByRole('menuitem', { name: format }));
    };

    const renderAndWaitForList = async (props = {}) => {
      render(<FinancasClient initialData={[]} {...props} />);
      await waitFor(() => {
        expect(
          screen.getByText('Honorários Contratuais - Alfa S.A.')
        ).toBeInTheDocument();
      });
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
      respondExport({ ok: true, status: 200, blob: async () => exportBlob });
    });

    afterEach(() => {
      click.mockRestore();
      delete URL.createObjectURL;
      delete URL.revokeObjectURL;
    });

    it('exporta em CSV os lançamentos filtrados na tela e baixa o arquivo', async () => {
      await renderAndWaitForList();

      fireEvent.change(screen.getByLabelText('Data inicial'), {
        target: { value: '2026-08-01' },
      });
      fireEvent.change(screen.getByLabelText('Data final'), {
        target: { value: '2026-08-31' },
      });
      fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
        target: { value: 'Despesas Operacionais' },
      });
      fireEvent.change(screen.getByLabelText('Filtrar por status'), {
        target: { value: 'pendente' },
      });
      await waitFor(() => {
        expect(
          fetchMock.mock.calls.some(([url]) =>
            String(url).includes(
              'inicio=2026-08-01&fim=2026-08-31&status=Pendente&categoria_id=30'
            )
          )
        ).toBe(true);
      });

      exportAs('CSV');

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(downloads[0]).toEqual({
        href: 'blob:relatorio',
        download: expect.stringMatching(/^lancamentos_\d{8}\.csv$/),
      });
      expect(URL.createObjectURL).toHaveBeenCalledWith(exportBlob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');

      const [[url, options]] = exportCalls();
      expect(url).toBe(
        'http://localhost:8000/lancamentos/exportar?formato=csv&inicio=2026-08-01&fim=2026-08-31&status=Pendente&categoria_id=30'
      );
      expect(options.headers).toEqual({
        Authorization: `Bearer ${FAKE_TOKEN}`,
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it.each([
      ['PDF', 'pdf'],
      ['Excel (.xlsx)', 'xlsx'],
    ])('exporta em %s sem filtros', async (label, extension) => {
      await renderAndWaitForList();

      exportAs(label);

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(downloads[0].download).toMatch(
        new RegExp(`^lancamentos_\\d{8}\\.${extension}$`)
      );
      expect(exportCalls()[0][0]).toBe(
        `http://localhost:8000/lancamentos/exportar?formato=${extension}`
      );
    });

    it('desabilita o botão e ignora novos cliques enquanto exporta', async () => {
      let finishExport;
      routeOverrides['GET /lancamentos/exportar'] = () =>
        new Promise((resolve) => {
          finishExport = () =>
            resolve({ ok: true, status: 200, blob: async () => exportBlob });
        });
      await renderAndWaitForList();

      exportAs('PDF');

      const trigger = await screen.findByRole('button', {
        name: /Exportando…/,
      });
      expect(trigger).toBeDisabled();
      expect(exportCalls()).toHaveLength(1);

      finishExport();

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(screen.getByRole('button', { name: /Relatório/i })).toBeEnabled();
    });

    it.each([
      [401, {}, 'Sessão expirada. Faça login novamente.'],
      [
        403,
        {},
        'Você não possui permissão para exportar os dados financeiros.',
      ],
      [
        422,
        { detail: 'A exportação excede 10000 lançamentos' },
        'A exportação excede 10000 lançamentos',
      ],
      [500, {}, 'Não foi possível exportar os lançamentos.'],
    ])(
      'exibe o erro quando a API responde %i e não baixa nada',
      async (status, body, message) => {
        respondExport(createJsonResponse(body, status));
        await renderAndWaitForList();

        exportAs('CSV');

        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(downloads).toHaveLength(0);
      }
    );

    it('exibe mensagem padrão quando o corpo do erro não é JSON válido', async () => {
      respondExport({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('corpo inválido');
        },
      });
      await renderAndWaitForList();

      exportAs('CSV');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível exportar os lançamentos.'
      );
    });

    it('exibe mensagem padrão quando a requisição falha na rede', async () => {
      routeOverrides['GET /lancamentos/exportar'] = async () => {
        throw new Error('offline');
      };
      await renderAndWaitForList();

      exportAs('PDF');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível exportar os lançamentos.'
      );
    });

    it('informa sessão expirada sem consultar a API quando não há token', async () => {
      await renderAndWaitForList();
      sessionStorage.clear();

      exportAs('PDF');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Sessão expirada. Faça login novamente.'
      );
      expect(exportCalls()).toHaveLength(0);
    });

    it('limpa o erro anterior quando uma nova exportação é bem-sucedida', async () => {
      respondExport(createJsonResponse({}, 403));
      await renderAndWaitForList();

      exportAs('CSV');
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      respondExport({ ok: true, status: 200, blob: async () => exportBlob });
      exportAs('CSV');

      await waitFor(() => expect(downloads).toHaveLength(1));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('bloqueia a exportação quando a categoria filtrada não possui identificador', async () => {
      await renderAndWaitForList({
        initialData: [
          {
            id: 1,
            titulo: 'Lançamento antigo',
            categoria: 'Sem Identificador',
            tipo: 'entrada',
            valor: 10,
            data: '01/08/2026',
            status: 'realizado',
          },
        ],
      });

      fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
        target: { value: 'Sem Identificador' },
      });

      exportAs('PDF');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A categoria selecionada não foi encontrada. Atualize a página e tente novamente.'
      );
      expect(exportCalls()).toHaveLength(0);
    });

    it('fecha o menu de exportação com Escape e ao clicar fora', async () => {
      await renderAndWaitForList();
      const trigger = screen.getByRole('button', { name: /Relatório/i });

      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      fireEvent.click(trigger);
      fireEvent.mouseDown(
        screen.getByRole('heading', { level: 1, name: 'Controle Financeiro' })
      );
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('casos de borda do hook e da tabela de lançamentos', () => {
    const baseItem = {
      id: 1,
      titulo: 'Honorários',
      categoria: 'Honorários',
      categoria_id: 10,
      tipo: 'entrada',
      valor: 100,
      data: '10/08/2026',
      dataIso: '2026-08-10',
      status: 'pendente',
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('usa mensagens padrão quando os erros das operações não trazem mensagem', async () => {
      vi.spyOn(financasService, 'excluirFinancas').mockRejectedValue(
        new Error('')
      );
      vi.spyOn(financasService, 'criarFinancas').mockRejectedValue(
        new Error('')
      );
      vi.spyOn(financasService, 'atualizarFinancas').mockRejectedValue(
        new Error('')
      );
      vi.spyOn(financasService, 'mudarStatusLancamento').mockRejectedValue(
        new Error('')
      );
      const { result } = renderHook(() => useFinancas([baseItem]));

      await act(async () => {
        await result.current.handleDeleteLancamento(baseItem).catch(() => {});
        await result.current.handleCreateLancamento(baseItem).catch(() => {});
        await result.current.handleUpdateLancamento(baseItem).catch(() => {});
        await result.current.handleToggleStatus(baseItem).catch(() => {});
      });

      expect(result.current.deleteError).toBe('Erro ao excluir lançamento.');
      expect(result.current.saveError).toBe('Erro ao atualizar lançamento.');
      expect(result.current.statusError).toBe('Erro ao atualizar status.');

      await act(async () => {
        await result.current.handleCreateLancamento(baseItem).catch(() => {});
      });
      expect(result.current.saveError).toBe('Erro ao criar lançamento.');
    });

    it('classifica como "Outros" os lançamentos salvos sem categoria', async () => {
      vi.spyOn(financasService, 'criarFinancas').mockResolvedValue({ id: 77 });
      vi.spyOn(financasService, 'atualizarFinancas').mockResolvedValue({});
      const { result } = renderHook(() => useFinancas([baseItem]));

      let created;
      let updated;
      await act(async () => {
        created = await result.current.handleCreateLancamento({
          titulo: 'Sem categoria',
          tipo: 'entrada',
          valor: 10,
        });
        updated = await result.current.handleUpdateLancamento({
          id: 1,
          titulo: 'Sem categoria',
          tipo: 'entrada',
          valor: 10,
        });
      });

      expect(created.categoria).toBe('Outros');
      expect(updated.categoria).toBe('Outros');
    });

    it('ignora categorias sem nome e aceita listagens não paginadas', async () => {
      dbCategorias.push({ categoria_id: 99 });
      const list = vi
        .spyOn(financasService, 'listarFinancas')
        .mockResolvedValueOnce([baseItem])
        .mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useFinancas([baseItem]));

      await act(async () => {
        await result.current.handleFilterLancamentos({});
      });
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, page_size: 5 })
      );
      expect(result.current.lancamentos).toHaveLength(1);
      expect(result.current.pagination.total).toBe(1);

      await act(async () => {
        await result.current.handleFilterLancamentos({ page: 2 });
      });
      expect(result.current.lancamentos).toHaveLength(0);
      expect(result.current.pagination.totalPages).toBe(1);
    });

    it('não exporta quando a categoria filtrada só existe entre categorias sem nome', async () => {
      dbCategorias.push({ categoria_id: 99 });
      vi.spyOn(financasService, 'listarFinancas').mockResolvedValue({
        itens: [],
        total: 0,
      });
      const { result } = renderHook(() => useFinancas([baseItem]));

      await act(async () => {
        await result.current.handleFilterLancamentos({ categoria: 'Fantasma' });
      });
      await act(async () => {
        await result.current.exportReport('pdf');
      });

      expect(result.current.exportError).toBe(
        'A categoria selecionada não foi encontrada. Atualize a página e tente novamente.'
      );
    });

    it('filtra localmente por categoria, data e situação quando a tabela não recebe onFilter', () => {
      const items = [
        { ...baseItem, id: undefined, lancamento_id: undefined },
        {
          ...baseItem,
          id: 2,
          titulo: 'Custas pagas',
          categoria: 'Custas',
          tipo: 'saida',
          status: 'realizado',
          data: '20/08/2026',
          dataIso: undefined,
        },
        {
          id: 3,
          titulo: 'Sem categoria',
          tipo: 'entrada',
          valor: 5,
          status: 'pendente',
          data: '25/08/2026',
        },
      ];
      render(
        <LancamentosTable
          lancamentos={items}
          categorias={[{ categoria_id: 1 }, { nome: 'Custas' }]}
        />
      );

      expect(screen.getByText('Custas pagas')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Data inicial'), {
        target: { value: '2026-08-15' },
      });
      fireEvent.change(screen.getByLabelText('Data final'), {
        target: { value: '2026-08-30' },
      });
      fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
        target: { value: 'Custas' },
      });
      expect(screen.getByText('Custas pagas')).toBeInTheDocument();
      expect(screen.queryByText('Sem categoria')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Filtrar por status'), {
        target: { value: 'pendente' },
      });
      expect(screen.queryByText('Custas pagas')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Filtrar por status'), {
        target: { value: 'realizado' },
      });
      expect(screen.getByText('Custas pagas')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
      expect(screen.getByText('Sem categoria')).toBeInTheDocument();
    });

    it('lista todas as categorias conhecidas inclusive as de lançamentos sem categoria', () => {
      render(
        <LancamentosTable
          lancamentos={[{ ...baseItem, categoria: '' }]}
          categorias={[{ categoria_id: 5 }]}
        />
      );

      expect(
        within(screen.getByLabelText('Filtrar por categoria')).getAllByRole(
          'option'
        )
      ).toHaveLength(1);
    });
  });
});
