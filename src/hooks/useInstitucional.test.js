import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INSTITUCIONAL,
  salvarDadosInstitucionais,
  uploadImagemInstitucional,
} from '@/services/institucional';
import { useInstitucional } from './useInstitucional';

vi.mock('@/services/institucional', () => ({
  DEFAULT_INSTITUCIONAL: {
    id: 1,
    nomeEscritorio: 'Carreiro Advogados',
    descricao: 'Slogan teste',
    sobreEscritorio: 'Sobre teste',
    email: 'contato@teste.com',
    telefone: '(61) 9999-9999',
    endereco: 'Brasília, DF',
    corPrimaria: '#1B2A4A',
    corSecundaria: '#B79A63',
    logotipo: '',
    bannerHero: '',
  },
  salvarDadosInstitucionais: vi.fn(),
  uploadImagemInstitucional: vi.fn(),
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

  it('trata erro genérico sem mensagem explícita ao salvar configurações', async () => {
    salvarDadosInstitucionais.mockRejectedValueOnce({});
    const { result } = renderHook(() => useInstitucional());

    await act(async () => {
      await result.current.handleSave();
    });

    expect(result.current.saveError).toBe('Erro ao salvar as configurações.');
  });
});
