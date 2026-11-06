import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';
import DashboardClient from './dashboardClient';

const mockSummary = {
  escopo: 'escritorio',
  pendentes: 3,
  em_execucao: 7,
  concluidas: 4,
  atrasadas: 2,
};

const mockKanban = {
  escopo: 'escritorio',
  etapas: [
    {
      etapa_id: 1,
      nome: 'Backlog',
      ordem: 1,
      atividades: [
        {
          atividade_id: 10,
          titulo: 'Redigir petição inicial',
          data_prazo: '2026-11-20T18:00:00',
          processo_id: 101,
          responsaveis: [{ funcionario_id: 1, nome: 'Ana Paula' }],
        },
      ],
    },
    {
      etapa_id: 2,
      nome: 'Em Execução',
      ordem: 2,
      atividades: [
        {
          atividade_id: 11,
          titulo: 'Pesquisa jurisprudencial',
          data_prazo: '2026-10-01T18:00:00',
          processo_id: null,
          responsaveis: [],
        },
      ],
    },
  ],
};

const mockClientes = [{ cliente_id: 1, nome: 'Empresa Alpha Ltda' }];
const mockFuncionarios = [{ funcionario_id: 2, nome: 'Dr. Roberto Dias' }];

const mockProcessosCriticos = [
  {
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
    descricao: 'Descrição completa do caso crítico com detalhes avançados.',
    descricao_proc:
      'Descrição completa do caso crítico com detalhes avançados.',
  },
  {
    processo_id: 102,
    cnj: '0079876-54.2026.8.26.0100',
    titulo: 'Execução Fiscal Especial',
    status: 'Ativo',
    tribunal: 'TRF1',
    area: 'Tributário',
    data_inicio: '2026-02-15T10:00:00',
    data_realizado: null,
    data_prazo: null,
    cliente_id: 99,
    funcionario_id: 88,
  },
  {
    processo_id: 103,
    cnj: '0081111-22.2026.8.26.0100',
    titulo: 'Processo Órfão Sem Datas',
    status: 'Ativo',
    tribunal: 'STJ',
    area: 'Penal',
    data_inicio: null,
    data_realizado: null,
    data_prazo: null,
    cliente_id: null,
    funcionario_id: null,
  },
];

const mockDetalheProcesso = {
  ...mockProcessosCriticos[0],
};

const mockMovimentacoes = [
  {
    movimentacao_id: 1,
    descricao: 'Autos encaminhados ao magistrado.',
    data_movimentacao: '2026-09-01T10:00:00',
    tipo_movimentacao: 'DESPACHO',
  },
];

const mockDocumentos = [
  {
    documento_id: 201,
    nome_original: 'peticao_inicial.pdf',
    url: 'https://cdn.advog.com/peticao_inicial.pdf',
    tamanho_bytes: 102400,
    data_upload: '2026-01-15T10:00:00',
  },
  {
    documento_id: 202,
    nome_original: 'procuracao.docx',
    url: null,
    tamanho_bytes: 204800,
    data_upload: '2026-01-16T11:00:00',
  },
];

function setupDefaultFetch() {
  return vi.fn(async (url, init = {}) => {
    const urlStr = String(url);
    const method = init.method || 'GET';

    if (urlStr.includes('/dashboard/atividades/resumo')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockSummary,
      };
    }

    if (urlStr.includes('/atividades/kanban')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockKanban,
      };
    }

    if (urlStr.includes('/clientes')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockClientes,
      };
    }

    if (urlStr.includes('/funcionarios')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockFuncionarios,
      };
    }

    if (urlStr.includes('/processos/criticos/')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockProcessosCriticos,
      };
    }

    if (urlStr.includes('/movimentacoes')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockMovimentacoes,
      };
    }

    if (urlStr.includes('/documentos/202/url')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: 'https://cdn.advog.com/signed/procuracao.docx',
        }),
      };
    }

    if (urlStr.includes('/documentos/202') && method === 'DELETE') {
      return {
        ok: true,
        status: 204,
        json: async () => ({}),
      };
    }

    if (urlStr.includes('/documentos') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => mockDocumentos,
      };
    }

    if (urlStr.includes('/documentos') && method === 'POST') {
      return {
        ok: true,
        status: 201,
        json: async () => ({
          documento_id: 203,
          nome_arquivo: 'novo_doc.pdf',
        }),
      };
    }

    if (urlStr.includes('/processos/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          itens: [mockDetalheProcesso],
          total: 1,
          page: 1,
          page_size: 1,
          total_pages: 1,
        }),
      };
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ detail: `Not found: ${urlStr}` }),
    };
  });
}

describe('Dashboard Frontend Integration (DashboardPage + DashboardClient + Real Services + Modals + Utils)', () => {
  let fetchMock;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    const userPayload = {
      sub: '2',
      nome: 'Dr. Roberto Dias',
      email: 'roberto@advog.com',
      cargo: {
        permissao: {
          visualizar_processos: true,
          editar_processos: true,
        },
      },
    };
    const token = `header.${btoa(JSON.stringify(userPayload))}.signature`;
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('current_user', JSON.stringify(userPayload));

    fetchMock = setupDefaultFetch();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('renderiza DashboardPage como wrapper do DashboardClient', () => {
    const page = DashboardPage();
    expect(page).toBeTruthy();
  });

  it('bloqueia acesso quando o usuário não possui permissão de visualizar processos', () => {
    const userSemPermissao = {
      sub: '2',
      nome: 'Usuário Sem Acesso',
      email: 'semacesso@advog.com',
      cargo: { permissao: { visualizar_processos: false } },
    };
    const tokenSemPermissao = `header.${btoa(JSON.stringify(userSemPermissao))}.signature`;
    sessionStorage.setItem('access_token', tokenSemPermissao);
    sessionStorage.setItem('current_user', JSON.stringify(userSemPermissao));

    render(<DashboardClient />);

    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/processos/criticos')
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/clientes')
    );
  });

  it('carrega o resumo de atividades, kanban recente e processos críticos enriquecidos e ordenados', async () => {
    render(<DashboardClient />);

    // Resumo de atividades
    await waitFor(() => {
      expect(screen.getByText('Pendentes')).toBeInTheDocument();
      expect(screen.getByText('Em execução')).toBeInTheDocument();
      expect(screen.getByText('Concluídas')).toBeInTheDocument();
      expect(screen.getByText('Atrasadas')).toBeInTheDocument();
    });

    // Atividades recentes do kanban
    expect(screen.getByText('Redigir petição inicial')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa jurisprudencial')).toBeInTheDocument();

    // Expande processos críticos
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Ver lista/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Ver lista/i }));

    // Processos críticos enriquecidos
    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
      expect(
        screen.getAllByText('Execução Fiscal Especial')[0]
      ).toBeInTheDocument();
      expect(
        screen.getAllByText('Processo Órfão Sem Datas')[0]
      ).toBeInTheDocument();
    });

    // Enriquecimento: mapeado, cliente fallback e sem cliente
    expect(screen.getAllByText('Empresa Alpha Ltda')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Cliente #99')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Sem cliente')[0]).toBeInTheDocument();
  });

  it('interage completamente com o ProcessDetailsModal: abas, teclado, movimentações, upload, visualização e exclusão de documentos', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    render(<DashboardClient />);

    // Expande o accordion de processos críticos
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Ver lista/i })
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Ver lista/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Ação de Cobrança Teste')[0]
      ).toBeInTheDocument();
    });

    // Abre detalhes do primeiro processo crítico
    const analyzeButtons = await screen.findAllByRole('button', {
      name: 'Analisar',
    });
    fireEvent.click(analyzeButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Descrição completa do caso crítico com detalhes avançados/
        )
      ).toBeInTheDocument();
    });

    // Aba Movimentações selecionada via clique na aba
    fireEvent.click(screen.getByRole('tab', { name: 'Movimentações' }));

    await waitFor(() => {
      expect(
        screen.getByText('Autos encaminhados ao magistrado.')
      ).toBeInTheDocument();
    });

    // Navega para aba Documentos via clique
    const documentosTab = screen.getByRole('tab', { name: 'Documentos' });
    fireEvent.click(documentosTab);

    await waitFor(() => {
      expect(screen.getByText('peticao_inicial.pdf')).toBeInTheDocument();
      expect(screen.getByText('procuracao.docx')).toBeInTheDocument();
    });

    // Validação de extensão de arquivo inválida no upload
    const fileInput = document.querySelector('input[type="file"]');
    const invalidFile = new File(['dummy content'], 'script.exe', {
      type: 'application/x-msdownload',
    });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Formato inválido. Envie arquivos PDF, DOCX, DOC, PNG ou JPG.'
        )
      ).toBeInTheDocument();
    });

    // Validação de arquivo que excede o limite máximo de 25MB
    const bigFile = new File(['a'], 'documento_gigante.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(bigFile, 'size', { value: 26 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(
        screen.getByText('O arquivo excede o limite máximo permitido de 25MB.')
      ).toBeInTheDocument();
    });

    // Upload com sucesso de arquivo válido
    const validFile = new File(['conteudo pdf'], 'novo_documento.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/documentos'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Visualização de documento com URL direta
    const viewButtons = screen.getAllByTitle('Visualizar documento');
    fireEvent.click(viewButtons[0]);
    expect(openSpy).toHaveBeenCalledWith(
      'https://cdn.advog.com/peticao_inicial.pdf',
      '_blank'
    );

    // Visualização de documento que busca URL assinada via API
    fireEvent.click(viewButtons[1]);
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://cdn.advog.com/signed/procuracao.docx',
        '_blank'
      );
    });

    // Exclusão de documento: abrir modal de confirmação, cancelar e depois confirmar
    const deleteButtons = screen.getAllByTitle('Excluir documento');
    fireEvent.click(deleteButtons[1]);

    expect(screen.getByText('Excluir documento?')).toBeInTheDocument();

    // Cancelar exclusão
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByText('Excluir documento?')).not.toBeInTheDocument();
    });

    // Reabrir e confirmar exclusão
    fireEvent.click(deleteButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/documentos/202'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    // Fechar modal de detalhes
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    openSpy.mockRestore();
  });

  it('trata erro de sessão expirada 401 no resumo de atividades', async () => {
    fetchMock.mockImplementationOnce(async (url) => {
      if (String(url).includes('/dashboard/atividades/resumo')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Token inválido' }),
        };
      }
      return setupDefaultFetch()(url);
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByText('Sessão expirada. Faça login novamente.')
      ).toBeInTheDocument();
    });
  });

  it('permite recarregar resumo quando a API retorna erro 500', async () => {
    let falhou = true;
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes('/dashboard/atividades/resumo') && falhou) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ detail: 'Erro interno no resumo' }),
        };
      }
      return setupDefaultFetch()(url, init);
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByText('Erro interno no resumo')).toBeInTheDocument();
    });

    falhou = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(screen.getByText('Pendentes')).toBeInTheDocument();
    });
  });

  it('mostra fallback de erro quando a busca de clientes e responsáveis falha', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes('/clientes')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ detail: 'Erro clientes' }),
        };
      }
      return setupDefaultFetch()(url, init);
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Erro clientes');
    });
  });

  it('permite tentar novamente quando a listagem de processos críticos falha', async () => {
    let tentativas = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes('/processos/criticos/')) {
        tentativas += 1;
        if (tentativas === 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ detail: 'Falha ao listar críticos' }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => [],
        };
      }
      return setupDefaultFetch()(url, init);
    });

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

  it('permite recarregar kanban quando a busca de atividades falha', async () => {
    let falhou = true;
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes('/atividades/kanban') && falhou) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ detail: 'Sem permissão' }),
        };
      }
      return setupDefaultFetch()(url, init);
    });

    render(<DashboardClient />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Você não possui permissão para visualizar as atividades.'
        )
      ).toBeInTheDocument();
    });

    falhou = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(screen.getByText('Redigir petição inicial')).toBeInTheDocument();
    });
  });
});
