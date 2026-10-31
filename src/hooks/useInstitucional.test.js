import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INSTITUCIONAL,
  DEFAULT_EQUIPE_SITE,
  buscarDadosInstitucionais,
  salvarDadosInstitucionais,
  uploadImagemInstitucional,
} from '@/services/institucional';
import {
  listarFuncionarios,
  mudarExibicaoInstitucional,
} from '@/services/funcionarios';
import {
  atualizarAtuacao,
  criarAtuacao,
  excluirAtuacao,
  listarAtuacoes,
  mudarExibicaoAtuacao,
} from '@/services/atuacoes';
import { useInstitucional } from './useInstitucional';

vi.mock('@/services/institucional', () => ({
  DEFAULT_INSTITUCIONAL: {
    id: 1,
    nomeEscritorio: 'Carreiro Advogados',
    descricao: 'Slogan teste',
    sobreEscritorio: 'Sobre teste',
    imagemSobre: null,
    textoAdicionalSobre: 'Texto adicional teste',
    email: 'contato@teste.com',
    telefone: '(61) 9999-9999',
    endereco: 'Brasília, DF',
    corPrimaria: '#1B2A4A',
    corSecundaria: '#B79A63',
    logotipo: '',
    bannerHero: '',
  },
  DEFAULT_EQUIPE_SITE: [
    {
      funcionario_id: 1,
      nome: 'Dr. Alexandre Carreiro',
      cargo: 'Sócio Fundador · Direito Trabalhista e Civil',
      exibicaoInstitucional: true,
    },
    {
      funcionario_id: 2,
      nome: 'Dra. Ana Paula Ribeiro',
      cargo: 'Advogada Sênior · Direito Civil e Previdenciário',
      exibicaoInstitucional: true,
    },
  ],
  buscarDadosInstitucionais: vi.fn().mockResolvedValue({}),
  salvarDadosInstitucionais: vi.fn(),
  uploadImagemInstitucional: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn().mockResolvedValue([]),
  mudarExibicaoInstitucional: vi.fn(),
}));

vi.mock('@/services/atuacoes', () => ({
  DEFAULT_ATUACOES_SITE: [
    {
      atuacao_id: 1,
      nome: 'Direito Civil',
      descricao: 'Contratos',
      exibicaoInstitucional: true,
    },
    {
      atuacao_id: 2,
      nome: 'Direito Trabalhista',
      descricao: 'Relações de trabalho',
      exibicaoInstitucional: true,
    },
  ],
  criarAtuacao: vi.fn(),
  atualizarAtuacao: vi.fn(),
  excluirAtuacao: vi.fn(),
  listarAtuacoes: vi.fn().mockResolvedValue([]),
  mudarExibicaoAtuacao: vi.fn(),
}));

describe('useInstitucional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicializa com os dados padrões quando nenhum dado inicial é passado', () => {
    const { result } = renderHook(() => useInstitucional());

    expect(result.current.formData.nomeEscritorio).toBe('Carreiro Advogados');
    expect(result.current.activeTab).toBe('visual');
    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.areas).toHaveLength(2);
  });

  it.each([{ aba: 'content' }, { aba: 'colors' }, { aba: 'team' }])(
    'permite alterar a aba ativa para "$aba"',
    ({ aba }) => {
      const { result } = renderHook(() => useInstitucional());

      act(() => {
        result.current.setActiveTab(aba);
      });

      expect(result.current.activeTab).toBe(aba);
    }
  );

  it.each([
    {
      campo: 'nomeEscritorio',
      valorInicial: 'Carreiro Advogados',
      novoValor: 'Novo Escritório',
    },
    {
      campo: 'logotipo',
      valorInicial: 'http://example.com/logo.png',
      novoValor: '',
    },
    {
      campo: 'bannerHero',
      valorInicial: 'http://example.com/banner.jpg',
      novoValor: '',
    },
  ])(
    'atualiza o campo "$campo" do formulário através de handleInputChange',
    ({ campo, valorInicial, novoValor }) => {
      const { result } = renderHook(() =>
        useInstitucional(
          {
            ...DEFAULT_INSTITUCIONAL,
            [campo]: valorInicial,
          },
          { isAdmin: false }
        )
      );

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.formData[campo]).toBe(valorInicial);

      act(() => {
        result.current.handleInputChange(campo, novoValor);
      });

      expect(result.current.formData[campo]).toBe(novoValor);
    }
  );

  it('abre e fecha o modal de prévia', () => {
    const { result } = renderHook(() => useInstitucional());

    act(() => {
      result.current.setIsPreviewOpen(true);
    });
    expect(result.current.isPreviewOpen).toBe(true);

    act(() => {
      result.current.setIsPreviewOpen(false);
    });
    expect(result.current.isPreviewOpen).toBe(false);
  });

  it.each([
    {
      cenario: 'logotipo com formato inválido',
      handler: 'handleUploadLogo',
      file: new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
      erroEsperado: 'Formato inválido. Selecione um arquivo PNG ou SVG.',
    },
    {
      cenario: 'logotipo acima do tamanho máximo (2 MB)',
      handler: 'handleUploadLogo',
      file: new File([new ArrayBuffer(3 * 1024 * 1024)], 'logo.png', {
        type: 'image/png',
      }),
      erroEsperado: 'O arquivo excede o limite máximo de 2 MB.',
    },
    {
      cenario: 'banner hero com formato inválido',
      handler: 'handleUploadBanner',
      file: new File(['x'], 'anim.gif', { type: 'image/gif' }),
      erroEsperado: 'Formato inválido. Selecione um arquivo JPG ou PNG.',
    },
    {
      cenario: 'banner hero acima do tamanho máximo (5 MB)',
      handler: 'handleUploadBanner',
      file: new File([new ArrayBuffer(6 * 1024 * 1024)], 'banner.png', {
        type: 'image/png',
      }),
      erroEsperado: 'O arquivo excede o limite máximo de 5 MB.',
    },
    {
      cenario: 'imagem sobre com formato inválido',
      handler: 'handleUploadImagemSobre',
      file: new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
      erroEsperado: 'Formato inválido. Selecione um arquivo JPG ou PNG.',
    },
    {
      cenario: 'imagem sobre acima do tamanho máximo (5 MB)',
      handler: 'handleUploadImagemSobre',
      file: new File([new ArrayBuffer(6 * 1024 * 1024)], 'sobre.png', {
        type: 'image/png',
      }),
      erroEsperado: 'O arquivo excede o limite máximo de 5 MB.',
    },
  ])('rejeita upload de $cenario', async ({ handler, file, erroEsperado }) => {
    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current[handler](file);
    });

    expect(result.current.uploadError).toBe(erroEsperado);
    expect(uploadImagemInstitucional).not.toHaveBeenCalled();
  });

  it.each([
    {
      tipo: 'logotipo',
      handler: 'handleUploadLogo',
      file: new File(['ok'], 'logo.png', { type: 'image/png' }),
      urlRetornada: 'http://minio/logo.png',
      formField: 'logotipo',
      previewKey: 'logoPreview',
    },
    {
      tipo: 'banner hero',
      handler: 'handleUploadBanner',
      file: new File(['ok'], 'banner.jpg', { type: 'image/jpeg' }),
      urlRetornada: 'http://minio/banner.jpg',
      formField: 'bannerHero',
      previewKey: 'bannerPreview',
    },
    {
      tipo: 'imagem sobre',
      handler: 'handleUploadImagemSobre',
      file: new File(['ok'], 'sobre.jpg', { type: 'image/jpeg' }),
      urlRetornada: 'http://minio/sobre.jpg',
      formField: 'imagemSobre',
      previewKey: 'sobreImagePreview',
    },
  ])(
    'realiza upload válido de $tipo e atualiza preview e formData',
    async ({ handler, file, urlRetornada, formField, previewKey }) => {
      uploadImagemInstitucional.mockResolvedValueOnce(urlRetornada);
      const { result } = renderHook(() => useInstitucional());

      await act(async () => {
        await result.current[handler](file);
      });

      expect(result.current.formData[formField]).toBe(urlRetornada);
      expect(result.current[previewKey]).toBe(urlRetornada);
      expect(result.current.uploadError).toBe('');
    }
  );

  it.each([
    {
      cenario: 'logotipo com mensagem de erro da API',
      handler: 'handleUploadLogo',
      file: new File(['ok'], 'logo.png', { type: 'image/png' }),
      erroSimulado: new Error('Falha no upload do logo'),
      mensagemEsperada: 'Falha no upload do logo',
    },
    {
      cenario: 'logotipo com erro sem mensagem explícita',
      handler: 'handleUploadLogo',
      file: new File(['ok'], 'logo.png', { type: 'image/png' }),
      erroSimulado: {},
      mensagemEsperada: 'Falha ao carregar logotipo.',
    },
    {
      cenario: 'banner hero com mensagem de erro da API',
      handler: 'handleUploadBanner',
      file: new File(['ok'], 'banner.jpg', { type: 'image/jpeg' }),
      erroSimulado: new Error('Falha no upload do banner'),
      mensagemEsperada: 'Falha no upload do banner',
    },
    {
      cenario: 'banner hero com erro sem mensagem explícita',
      handler: 'handleUploadBanner',
      file: new File(['ok'], 'banner.jpg', { type: 'image/jpeg' }),
      erroSimulado: {},
      mensagemEsperada: 'Falha ao carregar imagem do banner.',
    },
    {
      cenario: 'imagem sobre com mensagem de erro da API',
      handler: 'handleUploadImagemSobre',
      file: new File(['ok'], 'sobre.jpg', { type: 'image/jpeg' }),
      erroSimulado: new Error('Falha no upload sobre'),
      mensagemEsperada: 'Falha no upload sobre',
    },
    {
      cenario: 'imagem sobre com erro sem mensagem explícita',
      handler: 'handleUploadImagemSobre',
      file: new File(['ok'], 'sobre.jpg', { type: 'image/jpeg' }),
      erroSimulado: {},
      mensagemEsperada: 'Falha ao carregar imagem da seção sobre.',
    },
  ])(
    'trata erro no upload de $cenario',
    async ({ handler, file, erroSimulado, mensagemEsperada }) => {
      uploadImagemInstitucional.mockRejectedValueOnce(erroSimulado);
      const { result } = renderHook(() => useInstitucional());

      await act(async () => {
        await result.current[handler](file);
      });

      expect(result.current.uploadError).toBe(mensagemEsperada);
    }
  );

  it.each([
    { handler: 'handleUploadLogo' },
    { handler: 'handleUploadBanner' },
    { handler: 'handleUploadImagemSobre' },
  ])(
    'não executa upload em $handler se o arquivo for nulo',
    async ({ handler }) => {
      const { result } = renderHook(() => useInstitucional());

      await act(async () => {
        await result.current[handler](null);
      });

      expect(result.current.uploadError).toBe('');
      expect(uploadImagemInstitucional).not.toHaveBeenCalled();
    }
  );

  it('salva configurações com sucesso através de handleSave e reseta saveSuccess após 4000ms', async () => {
    vi.useFakeTimers();
    const dadosSalvos = {
      ...DEFAULT_INSTITUCIONAL,
      nomeEscritorio: 'Escritório Salvo',
    };
    salvarDadosInstitucionais.mockResolvedValueOnce(dadosSalvos);

    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.saveSuccess).toBe(true);
    expect(result.current.formData.nomeEscritorio).toBe('Escritório Salvo');
    expect(result.current.isSaving).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.saveSuccess).toBe(false);
    vi.useRealTimers();
  });

  it.each([
    {
      cenario: 'erro com mensagem explícita',
      erroSimulado: new Error('Erro de conexão ao salvar'),
      mensagemEsperada: 'Erro de conexão ao salvar',
    },
    {
      cenario: 'erro genérico sem mensagem explícita',
      erroSimulado: {},
      mensagemEsperada: 'Erro ao salvar as configurações.',
    },
  ])(
    'trata falha ao salvar configurações ($cenario)',
    async ({ erroSimulado, mensagemEsperada }) => {
      salvarDadosInstitucionais.mockRejectedValueOnce(erroSimulado);
      const { result } = renderHook(() => useInstitucional());

      await act(async () => {
        await result.current.handleSave();
      });

      expect(result.current.saveSuccess).toBe(false);
      expect(result.current.saveError).toBe(mensagemEsperada);
      expect(result.current.isSaving).toBe(false);
    }
  );

  it('inicializa team e areas com opções customizadas quando fornecidas', () => {
    const customTeam = [
      { funcionario_id: 99, nome: 'Dr. Teste', exibicaoInstitucional: false },
    ];
    const customAreas = [
      { atuacao_id: 50, nome: 'Direito Penal', exibicaoInstitucional: true },
    ];
    const { result } = renderHook(() =>
      useInstitucional(null, {
        initialTeam: customTeam,
        initialAreas: customAreas,
      })
    );

    expect(result.current.team).toEqual(customTeam);
    expect(result.current.areas).toEqual(customAreas);
  });

  it('alterna a visibilidade de um advogado da equipe através de handleToggleLawyerVisibility', () => {
    const { result } = renderHook(() => useInstitucional());

    const initialMember = result.current.team.find(
      (m) => m.funcionario_id === 1
    );
    expect(initialMember.exibicaoInstitucional).toBe(true);

    act(() => {
      result.current.handleToggleLawyerVisibility(1);
    });

    const updatedMember = result.current.team.find(
      (m) => m.funcionario_id === 1
    );
    expect(updatedMember.exibicaoInstitucional).toBe(false);

    act(() => {
      result.current.handleToggleLawyerVisibility(9999);
    });
    expect(result.current.team.length).toBe(DEFAULT_EQUIPE_SITE.length);
  });

  it('gerencia áreas de atuação (alternar visibilidade, criar, editar e excluir)', async () => {
    const { result } = renderHook(() => useInstitucional());

    act(() => {
      result.current.handleToggleAreaVisibility(1);
      result.current.handleToggleAreaVisibility(999);
    });
    expect(result.current.areas[0].exibicaoInstitucional).toBe(false);

    criarAtuacao.mockResolvedValueOnce({
      atuacao_id: 3,
      nome: 'Direito Tributário',
      descricao: 'Impostos',
      exibicaoInstitucional: true,
    });
    await act(async () => {
      await result.current.handleCreateArea({
        nome: 'Direito Tributário',
        descricao: 'Impostos',
      });
    });
    expect(result.current.areas).toHaveLength(3);

    atualizarAtuacao.mockResolvedValueOnce({
      atuacao_id: 3,
      nome: 'Direito Tributário e Fiscal',
      descricao: 'Impostos',
      exibicaoInstitucional: true,
    });
    await act(async () => {
      await result.current.handleUpdateArea(3, {
        nome: 'Direito Tributário e Fiscal',
      });
    });
    expect(result.current.areas[2].nome).toBe('Direito Tributário e Fiscal');

    excluirAtuacao.mockResolvedValueOnce({ atuacao_id: 3 });
    await act(async () => {
      await result.current.handleDeleteArea(3);
    });
    expect(result.current.areas).toHaveLength(2);
  });

  it.each([
    {
      cenario: 'erro com mensagem explícita',
      erroSimulado: new Error('Falha ao excluir'),
      mensagemEsperada: 'Falha ao excluir',
    },
    {
      cenario: 'erro sem mensagem explícita',
      erroSimulado: {},
      mensagemEsperada: 'Não foi possível excluir a área de atuação.',
    },
  ])(
    'trata erro ao excluir área de atuação ($cenario)',
    async ({ erroSimulado, mensagemEsperada }) => {
      excluirAtuacao.mockRejectedValueOnce(erroSimulado);
      const { result } = renderHook(() => useInstitucional());

      await act(async () => {
        await result.current.handleDeleteArea(1);
      });

      expect(result.current.saveError).toBe(mensagemEsperada);
    }
  );

  it('sincroniza a visibilidade da equipe e áreas no salvar', async () => {
    salvarDadosInstitucionais.mockResolvedValueOnce(DEFAULT_INSTITUCIONAL);
    mudarExibicaoInstitucional.mockResolvedValue({});
    mudarExibicaoAtuacao.mockResolvedValue({});

    const { result } = renderHook(() => useInstitucional());

    act(() => {
      result.current.handleToggleLawyerVisibility(1);
      result.current.handleToggleAreaVisibility(1);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(salvarDadosInstitucionais).toHaveBeenCalledWith(
      result.current.formData
    );
    expect(mudarExibicaoInstitucional).toHaveBeenCalledWith(1, false);
    expect(mudarExibicaoAtuacao).toHaveBeenCalledWith(1, false);
    expect(result.current.saveSuccess).toBe(true);
  });

  it('salva com sucesso quando team e areas são vazios ou inexistentes', async () => {
    salvarDadosInstitucionais.mockResolvedValueOnce(DEFAULT_INSTITUCIONAL);

    const { result } = renderHook(() =>
      useInstitucional(null, { initialTeam: [], initialAreas: [] })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(salvarDadosInstitucionais).toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(true);
  });

  it('busca dados, equipe e áreas no cliente quando SSR retorna vazio', async () => {
    buscarDadosInstitucionais.mockResolvedValueOnce({
      id: 1,
      nomeEscritorio: 'Escritório Carregado',
      logotipo: 'http://logo.png',
      bannerHero: 'http://banner.jpg',
      imagemSobre: 'http://sobre.jpg',
    });
    listarFuncionarios.mockResolvedValueOnce([
      {
        funcionario_id: 7,
        nome: 'Dra. Juliana',
        exibicaoInstitucional: true,
      },
    ]);
    listarAtuacoes.mockResolvedValueOnce([
      {
        atuacao_id: 99,
        nome: 'Direito Tributário',
        descricao: 'Planejamento fiscal',
        exibicaoInstitucional: true,
      },
    ]);

    const { result } = renderHook(() =>
      useInstitucional(
        { id: 1, nomeEscritorio: '' },
        { initialTeam: [], initialAreas: [] }
      )
    );

    await act(async () => {});

    expect(buscarDadosInstitucionais).toHaveBeenCalled();
    expect(listarFuncionarios).toHaveBeenCalled();
    expect(listarAtuacoes).toHaveBeenCalled();
    expect(result.current.formData.nomeEscritorio).toBe('Escritório Carregado');
    expect(result.current.logoPreview).toBe('http://logo.png');
    expect(result.current.bannerPreview).toBe('http://banner.jpg');
    expect(result.current.sobreImagePreview).toBe('http://sobre.jpg');
    expect(result.current.team).toHaveLength(1);
    expect(result.current.areas).toHaveLength(1);
    expect(result.current.areas[0].nome).toBe('Direito Tributário');

    buscarDadosInstitucionais.mockResolvedValueOnce({
      id: 1,
      nomeEscritorio: 'Escritório Sem Mídia',
    });
    const { result: res2 } = renderHook(() =>
      useInstitucional({ id: 1, nomeEscritorio: '' })
    );
    await act(async () => {});
    expect(res2.current.formData.nomeEscritorio).toBe('Escritório Sem Mídia');

    buscarDadosInstitucionais.mockResolvedValueOnce({
      id: 1,
      nomeEscritorio: '',
    });
    renderHook(() => useInstitucional({ id: 1, nomeEscritorio: '' }));
    await act(async () => {});
  });
});
