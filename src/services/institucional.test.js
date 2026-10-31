import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INSTITUCIONAL,
  DEFAULT_EQUIPE_SITE,
  buscarDadosInstitucionais,
  salvarDadosInstitucionais,
  uploadImagemInstitucional,
} from './institucional';
import { getAccessToken } from '@/utils/authSession';

vi.mock('@/utils/authSession', () => ({
  getAccessToken: vi.fn(),
}));

const respostaJson = (dados, configuracao = {}) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(dados),
  ...configuracao,
});

const respostaComErro = (detail) => ({
  ok: false,
  json: vi.fn().mockResolvedValue({ detail }),
});

describe('serviço institucional', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue(null);
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    }
  });

  it('exporta DEFAULT_EQUIPE_SITE como array vazio (seed via backend)', () => {
    expect(DEFAULT_EQUIPE_SITE).toHaveLength(0);
  });

  describe('buscarDadosInstitucionais', () => {
    it('retorna os dados da API mesclados quando sucesso', async () => {
      const dadosApi = {
        nomeEscritorio: 'Carreiro Advogados Atualizado',
        corPrimaria: '#000000',
      };
      fetch.mockResolvedValue(respostaJson(dadosApi));

      const resultado = await buscarDadosInstitucionais();
      expect(resultado.nomeEscritorio).toBe('Carreiro Advogados Atualizado');
      expect(resultado.corPrimaria).toBe('#000000');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/institucional',
        {
          cache: 'no-store',
        }
      );
    });

    it.each([
      {
        cenario: 'resposta da API com erro HTTP',
        setupFetch: () =>
          fetch.mockResolvedValue(respostaComErro('Erro interno')),
      },
      {
        cenario: 'exceção de rede no fetch',
        setupFetch: () => fetch.mockRejectedValue(new Error('Network error')),
      },
    ])(
      'retorna DEFAULT_INSTITUCIONAL quando ocorre $cenario',
      async ({ setupFetch }) => {
        setupFetch();
        const resultado = await buscarDadosInstitucionais();
        expect(resultado).toEqual(DEFAULT_INSTITUCIONAL);
      }
    );
  });

  describe('salvarDadosInstitucionais', () => {
    it.each([
      {
        cenario: 'autenticado com token Bearer',
        token: 'token-123',
        novosDados: { nomeEscritorio: 'Novo Nome' },
        headersEsperados: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
      },
      {
        cenario: 'sem token de autenticação',
        token: null,
        novosDados: { nomeEscritorio: 'Sem Token' },
        headersEsperados: {
          'Content-Type': 'application/json',
        },
      },
    ])(
      'envia dados via PUT e retorna resposta da API ($cenario)',
      async ({ token, novosDados, headersEsperados }) => {
        getAccessToken.mockReturnValue(token);
        fetch.mockResolvedValue(respostaJson(novosDados));

        const res = await salvarDadosInstitucionais(novosDados);
        expect(res).toEqual(novosDados);
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/institucional',
          expect.objectContaining({
            method: 'PUT',
            headers: headersEsperados,
            body: JSON.stringify(novosDados),
          })
        );
      }
    );

    it.each([
      {
        cenario: 'API retorna erro detalhado',
        respostaMock: respostaComErro('Cor primária inválida'),
        mensagemEsperada: 'Cor primária inválida',
      },
      {
        cenario: 'resposta com erro não possui JSON/detail válido',
        respostaMock: {
          ok: false,
          json: vi.fn().mockRejectedValue(new Error('Invalid json')),
        },
        mensagemEsperada: 'Não foi possível salvar as configurações do site.',
      },
    ])(
      'lança erro quando $cenario',
      async ({ respostaMock, mensagemEsperada }) => {
        fetch.mockResolvedValue(respostaMock);
        await expect(salvarDadosInstitucionais({})).rejects.toThrow(
          mensagemEsperada
        );
      }
    );

    it('retorna dados mesclados caso ocorra falha de conexão fetch', async () => {
      fetch.mockRejectedValue(new Error('fetch failed'));

      const res = await salvarDadosInstitucionais({
        nomeEscritorio: 'Offline Test',
      });
      expect(res.nomeEscritorio).toBe('Offline Test');
    });
  });

  describe('uploadImagemInstitucional', () => {
    it.each([
      {
        cenario: 'tipo "sobre" com token de autenticação',
        token: 'token-456',
        tipo: 'sobre',
        arquivoNome: 'foto.jpg',
        mimeType: 'image/jpeg',
        urlRetornada: 'http://localhost:9000/institucional/sobre/foto.jpg',
        endpointEsperado: 'http://localhost:8000/institucional/upload/sobre',
        headersEsperados: { Authorization: 'Bearer token-456' },
      },
      {
        cenario: 'tipo padrão ("logo") sem token de autenticação',
        token: null,
        tipo: undefined,
        arquivoNome: 'logo.png',
        mimeType: 'image/png',
        urlRetornada: 'http://minio/logo.png',
        endpointEsperado: 'http://localhost:8000/institucional/upload/logo',
        headersEsperados: {},
      },
    ])(
      'retorna URL da imagem após upload bem-sucedido para $cenario',
      async ({
        token,
        tipo,
        arquivoNome,
        mimeType,
        urlRetornada,
        endpointEsperado,
        headersEsperados,
      }) => {
        getAccessToken.mockReturnValue(token);
        fetch.mockResolvedValue(respostaJson({ url: urlRetornada }));

        const fakeFile = new File(['fake content'], arquivoNome, {
          type: mimeType,
        });
        const url = await uploadImagemInstitucional(fakeFile, tipo);
        expect(url).toBe(urlRetornada);
        expect(fetch).toHaveBeenCalledWith(
          endpointEsperado,
          expect.objectContaining({
            headers: headersEsperados,
          })
        );
      }
    );

    it.each([
      {
        cenario: 'API responde sucesso mas sem campo url',
        setupFetch: () => fetch.mockResolvedValue(respostaJson({})),
      },
      {
        cenario: 'API responde com erro HTTP',
        setupFetch: () =>
          fetch.mockResolvedValue(respostaComErro('Erro no upload')),
      },
    ])(
      'retorna fallback createObjectURL quando $cenario',
      async ({ setupFetch }) => {
        setupFetch();
        const fakeFile = new File(['fake content'], 'logo.png', {
          type: 'image/png',
        });
        const url = await uploadImagemInstitucional(fakeFile, 'logo');
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      }
    );
  });
});
