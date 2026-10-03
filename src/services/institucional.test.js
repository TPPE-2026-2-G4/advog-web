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

  it('exporta DEFAULT_EQUIPE_SITE com 4 advogados visíveis', () => {
    expect(DEFAULT_EQUIPE_SITE).toHaveLength(4);
    expect(DEFAULT_EQUIPE_SITE[0].nome).toBe('Dr. Alexandre Carreiro');
    expect(DEFAULT_EQUIPE_SITE[0].exibicaoInstitucional).toBe(true);
  });

  describe('buscarDadosInstitucionais', () => {
    it('retorna os dados da API quando sucesso', async () => {
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

    it('retorna DEFAULT_INSTITUCIONAL em caso de erro da API ou falha de rede', async () => {
      fetch.mockResolvedValue(respostaComErro('Erro interno'));
      const resultadoErro = await buscarDadosInstitucionais();
      expect(resultadoErro).toEqual(DEFAULT_INSTITUCIONAL);

      fetch.mockRejectedValue(new Error('Network error'));
      const resultadoRede = await buscarDadosInstitucionais();
      expect(resultadoRede).toEqual(DEFAULT_INSTITUCIONAL);
    });
  });

  describe('salvarDadosInstitucionais', () => {
    it('envia dados via PUT e retorna resposta da API com token se autenticado', async () => {
      getAccessToken.mockReturnValue('token-123');
      const novosDados = { nomeEscritorio: 'Novo Nome' };
      fetch.mockResolvedValue(respostaJson(novosDados));

      const res = await salvarDadosInstitucionais(novosDados);
      expect(res).toEqual(novosDados);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/institucional',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-123',
          },
          body: JSON.stringify(novosDados),
        })
      );
    });

    it('lança erro caso a API retorne erro detalhado', async () => {
      fetch.mockResolvedValue(respostaComErro('Cor primária inválida'));

      await expect(salvarDadosInstitucionais({})).rejects.toThrow(
        'Cor primária inválida'
      );
    });

    it('lança erro padrão quando resposta com erro não possui detail', async () => {
      fetch.mockResolvedValue({
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('Invalid json')),
      });

      await expect(salvarDadosInstitucionais({})).rejects.toThrow(
        'Não foi possível salvar as configurações do site.'
      );
    });

    it('retorna dados mesclados caso ocorra falha de conexão fetch', async () => {
      fetch.mockRejectedValue(new Error('fetch failed'));

      const res = await salvarDadosInstitucionais({
        nomeEscritorio: 'Offline Test',
      });
      expect(res.nomeEscritorio).toBe('Offline Test');
    });

    it('salva sem header de Authorization quando getAccessToken retorna null', async () => {
      getAccessToken.mockReturnValue(null);
      const novosDados = { nomeEscritorio: 'Sem Token' };
      fetch.mockResolvedValue(respostaJson(novosDados));

      const res = await salvarDadosInstitucionais(novosDados);
      expect(res).toEqual(novosDados);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/institucional',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });
  });

  describe('uploadImagemInstitucional', () => {
    it('retorna URL da imagem após upload bem-sucedido de sobre com token', async () => {
      getAccessToken.mockReturnValue('token-456');
      fetch.mockResolvedValue(
        respostaJson({
          url: 'http://localhost:9000/institucional/sobre/foto.jpg',
        })
      );

      const fakeFile = new File(['fake content'], 'foto.jpg', {
        type: 'image/jpeg',
      });
      const url = await uploadImagemInstitucional(fakeFile, 'sobre');
      expect(url).toBe('http://localhost:9000/institucional/sobre/foto.jpg');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/institucional/upload/sobre',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token-456',
          },
        })
      );
    });

    it('faz upload sem Authorization quando getAccessToken retorna null', async () => {
      getAccessToken.mockReturnValue(null);
      fetch.mockResolvedValue(respostaJson({ url: 'http://minio/logo.png' }));

      const fakeFile = new File(['fake content'], 'logo.png', {
        type: 'image/png',
      });
      const url = await uploadImagemInstitucional(fakeFile);
      expect(url).toBe('http://minio/logo.png');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/institucional/upload/logo',
        expect.objectContaining({
          headers: {},
        })
      );
    });

    it('retorna createObjectURL quando a API responde sem url', async () => {
      fetch.mockResolvedValue(respostaJson({}));

      const fakeFile = new File(['fake content'], 'logo.png', {
        type: 'image/png',
      });
      const url = await uploadImagemInstitucional(fakeFile, 'logo');
      expect(url).toMatch(/^blob:/);
    });

    it('retorna createObjectURL caso a API falhe ou ocorra exceção', async () => {
      fetch.mockResolvedValue(respostaComErro('Erro no upload'));

      const fakeFile = new File(['fake content'], 'logo.png', {
        type: 'image/png',
      });
      const url = await uploadImagemInstitucional(fakeFile, 'logo');
      expect(typeof url).toBe('string');
    });
  });
});
