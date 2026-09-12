import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INSTITUCIONAL,
  buscarDadosInstitucionais,
  salvarDadosInstitucionais,
  uploadImagemInstitucional,
} from './institucional';

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
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    }
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
    it('envia dados via PUT e retorna resposta da API', async () => {
      const novosDados = { nomeEscritorio: 'Novo Nome' };
      fetch.mockResolvedValue(respostaJson(novosDados));

      const res = await salvarDadosInstitucionais(novosDados);
      expect(res).toEqual(novosDados);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/institucional',
        expect.objectContaining({
          method: 'PUT',
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
  });

  describe('uploadImagemInstitucional', () => {
    it('retorna URL da imagem após upload bem-sucedido', async () => {
      fetch.mockResolvedValue(
        respostaJson({ url: 'http://localhost:9000/institucional/logo.png' })
      );

      const fakeFile = new File(['fake content'], 'logo.png', {
        type: 'image/png',
      });
      const url = await uploadImagemInstitucional(fakeFile, 'logo');
      expect(url).toBe('http://localhost:9000/institucional/logo.png');
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
