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

  it('permite alterar a aba ativa', () => {
    const { result } = renderHook(() => useInstitucional());

    act(() => {
      result.current.setActiveTab('content');
    });
    expect(result.current.activeTab).toBe('content');

    act(() => {
      result.current.setActiveTab('colors');
    });
    expect(result.current.activeTab).toBe('colors');
  });

  it('atualiza campos do formulário através de handleInputChange', () => {
    const { result } = renderHook(() => useInstitucional());

    act(() => {
      result.current.handleInputChange('nomeEscritorio', 'Novo Escritório');
    });

    expect(result.current.formData.nomeEscritorio).toBe('Novo Escritório');
  });

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

  it('valida formato e tamanho ao fazer upload de logotipo', async () => {
    const { result } = renderHook(() => useInstitucional());

    const arquivoInvalido = new File(['x'], 'doc.pdf', {
      type: 'application/pdf',
    });
    await act(async () => {
      await result.current.handleUploadLogo(arquivoInvalido);
    });
    expect(result.current.uploadError).toContain('Formato inválido');

    const arquivoGrande = new File(
      [new ArrayBuffer(3 * 1024 * 1024)],
      'logo.png',
      {
        type: 'image/png',
      }
    );
    await act(async () => {
      await result.current.handleUploadLogo(arquivoGrande);
    });
    expect(result.current.uploadError).toContain('excede o limite');

    uploadImagemInstitucional.mockResolvedValueOnce('http://minio/logo.png');
    const arquivoValido = new File(['ok'], 'logo.png', { type: 'image/png' });
    await act(async () => {
      await result.current.handleUploadLogo(arquivoValido);
    });
    expect(result.current.formData.logotipo).toBe('http://minio/logo.png');
    expect(result.current.logoPreview).toBe('http://minio/logo.png');
  });

  it('valida formato ao fazer upload de banner hero', async () => {
    const { result } = renderHook(() => useInstitucional());

    const arquivoInvalido = new File(['x'], 'anim.gif', { type: 'image/gif' });
    await act(async () => {
      await result.current.handleUploadBanner(arquivoInvalido);
    });
    expect(result.current.uploadError).toContain('Formato inválido');

    const arquivoGrande = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      'banner.png',
      {
        type: 'image/png',
      }
    );
    await act(async () => {
      await result.current.handleUploadBanner(arquivoGrande);
    });
    expect(result.current.uploadError).toContain('excede o limite');

    uploadImagemInstitucional.mockResolvedValueOnce('http://minio/banner.jpg');
    const arquivoValido = new File(['ok'], 'banner.jpg', {
      type: 'image/jpeg',
    });
    await act(async () => {
      await result.current.handleUploadBanner(arquivoValido);
    });
    expect(result.current.formData.bannerHero).toBe('http://minio/banner.jpg');
    expect(result.current.bannerPreview).toBe('http://minio/banner.jpg');
  });

  it('salva configurações com sucesso através de handleSave', async () => {
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
  });

  it('reseta saveSuccess para false após 4000ms com setTimeout', async () => {
    vi.useFakeTimers();
    salvarDadosInstitucionais.mockResolvedValueOnce({
      ...DEFAULT_INSTITUCIONAL,
      nomeEscritorio: 'Timer Test',
    });

    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.saveSuccess).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.saveSuccess).toBe(false);
    vi.useRealTimers();
  });

  it('trata erro ao salvar configurações', async () => {
    salvarDadosInstitucionais.mockRejectedValueOnce(
      new Error('Erro de conexão ao salvar')
    );

    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.saveSuccess).toBe(false);
    expect(result.current.saveError).toBe('Erro de conexão ao salvar');
    expect(result.current.isSaving).toBe(false);
  });

  it('trata erro no upload de logotipo e banner quando serviço lança exceção', async () => {
    uploadImagemInstitucional.mockRejectedValueOnce(
      new Error('Falha no upload do logo')
    );
    const { result } = renderHook(() => useInstitucional());
    const arquivoValido = new File(['ok'], 'logo.png', { type: 'image/png' });

    await act(async () => {
      await result.current.handleUploadLogo(arquivoValido);
    });
    expect(result.current.uploadError).toBe('Falha no upload do logo');

    uploadImagemInstitucional.mockRejectedValueOnce(
      new Error('Falha no upload do banner')
    );
    const bannerValido = new File(['ok'], 'banner.jpg', {
      type: 'image/jpeg',
    });
    await act(async () => {
      await result.current.handleUploadBanner(bannerValido);
    });
    expect(result.current.uploadError).toBe('Falha no upload do banner');

    uploadImagemInstitucional.mockRejectedValueOnce({});
    await act(async () => {
      await result.current.handleUploadLogo(arquivoValido);
    });
    expect(result.current.uploadError).toBe('Falha ao carregar logotipo.');

    uploadImagemInstitucional.mockRejectedValueOnce({});
    await act(async () => {
      await result.current.handleUploadBanner(bannerValido);
    });
    expect(result.current.uploadError).toBe(
      'Falha ao carregar imagem do banner.'
    );
  });

  it('não executa upload se o arquivo for nulo ou indefinido', async () => {
    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current.handleUploadLogo(null);
      await result.current.handleUploadBanner(null);
    });

    expect(result.current.uploadError).toBe('');
  });

  it('permite limpar o logotipo e o banner através de handleInputChange', () => {
    const { result } = renderHook(() =>
      useInstitucional(
        {
          logotipo: 'http://example.com/logo.png',
          bannerHero: 'http://example.com/banner.jpg',
        },
        { isAdmin: false }
      )
    );

    expect(result.current.isAdmin).toBe(false);

    act(() => {
      result.current.handleInputChange('logotipo', '');
      result.current.handleInputChange('bannerHero', '');
    });
    expect(result.current.formData.logotipo).toBe('');
    expect(result.current.formData.bannerHero).toBe('');
  });

  it('permite alterar a aba ativa para team', () => {
    const { result } = renderHook(() => useInstitucional());

    act(() => {
      result.current.setActiveTab('team');
    });
    expect(result.current.activeTab).toBe('team');
  });

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

  it('valida formato e tamanho ao fazer upload de imagem sobre', async () => {
    const { result } = renderHook(() => useInstitucional());

    const arquivoInvalido = new File(['x'], 'doc.pdf', {
      type: 'application/pdf',
    });
    await act(async () => {
      await result.current.handleUploadImagemSobre(arquivoInvalido);
    });
    expect(result.current.uploadError).toContain('Formato inválido');

    const arquivoGrande = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      'sobre.png',
      {
        type: 'image/png',
      }
    );
    await act(async () => {
      await result.current.handleUploadImagemSobre(arquivoGrande);
    });
    expect(result.current.uploadError).toContain('excede o limite');

    uploadImagemInstitucional.mockResolvedValueOnce('http://minio/sobre.jpg');
    const arquivoValido = new File(['ok'], 'sobre.jpg', {
      type: 'image/jpeg',
    });
    await act(async () => {
      await result.current.handleUploadImagemSobre(arquivoValido);
    });
    expect(result.current.formData.imagemSobre).toBe('http://minio/sobre.jpg');
    expect(result.current.sobreImagePreview).toBe('http://minio/sobre.jpg');
  });

  it('trata erro no upload de imagem sobre', async () => {
    uploadImagemInstitucional.mockRejectedValueOnce(
      new Error('Falha no upload sobre')
    );
    const { result } = renderHook(() => useInstitucional());
    const arquivoValido = new File(['ok'], 'sobre.jpg', {
      type: 'image/jpeg',
    });

    await act(async () => {
      await result.current.handleUploadImagemSobre(arquivoValido);
    });
    expect(result.current.uploadError).toBe('Falha no upload sobre');

    uploadImagemInstitucional.mockRejectedValueOnce({});
    await act(async () => {
      await result.current.handleUploadImagemSobre(arquivoValido);
    });
    expect(result.current.uploadError).toBe(
      'Falha ao carregar imagem da seção sobre.'
    );

    await act(async () => {
      await result.current.handleUploadImagemSobre(null);
    });
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

    // Erro ao excluir com mensagem e sem mensagem
    excluirAtuacao.mockRejectedValueOnce(new Error('Falha ao excluir'));
    await act(async () => {
      await result.current.handleDeleteArea(1);
    });
    expect(result.current.saveError).toBe('Falha ao excluir');

    excluirAtuacao.mockRejectedValueOnce({});
    await act(async () => {
      await result.current.handleDeleteArea(1);
    });
    expect(result.current.saveError).toBe(
      'Não foi possível excluir a área de atuação.'
    );
  });

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

  it('trata erro genérico sem mensagem explícita ao salvar configurações', async () => {
    salvarDadosInstitucionais.mockRejectedValueOnce({});
    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.saveError).toBe('Erro ao salvar as configurações.');
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

    // Testa também retorno sem logotipo/banner/imagemSobre e sem nomeEscritorio
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
