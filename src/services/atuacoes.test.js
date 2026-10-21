import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ATUACOES_SITE,
  atualizarAtuacao,
  criarAtuacao,
  excluirAtuacao,
  listarAtuacoes,
  mudarExibicaoAtuacao,
} from './atuacoes';
import { getAccessToken } from '@/utils/authSession';

vi.mock('@/utils/authSession', () => ({
  getAccessToken: vi.fn(),
}));

const respostaJson = (dados, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(dados),
});

describe('serviço de áreas de atuação', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    getAccessToken.mockReturnValue('token-admin');
  });

  describe('listarAtuacoes', () => {
    it.each([
      [
        [{ atuacao_id: 1, nome: 'Direito Civil', descricao: 'Contratos' }],
        [{ atuacao_id: 1, nome: 'Direito Civil', descricao: 'Contratos' }],
      ],
      [{ invalido: true }, DEFAULT_ATUACOES_SITE],
    ])(
      'retorna lista esperada quando a API responde %j',
      async (payloadApi, esperado) => {
        fetch.mockResolvedValue(respostaJson(payloadApi));
        const res = await listarAtuacoes();
        expect(res).toEqual(esperado);
      }
    );

    it('retorna DEFAULT_ATUACOES_SITE quando API falha ou ocorre erro de rede', async () => {
      fetch.mockResolvedValue(respostaJson({ detail: 'Erro' }, false));
      expect(await listarAtuacoes()).toEqual([]);

      fetch.mockRejectedValue(new Error('Network error'));
      expect(await listarAtuacoes()).toEqual([]);
    });
  });

  describe('criarAtuacao', () => {
    it('envia POST com token e retorna a área criada', async () => {
      const nova = {
        atuacao_id: 1,
        nome: 'Direito Civil',
        descricao: 'Contratos',
        exibicaoInstitucional: true,
      };
      fetch.mockResolvedValue(respostaJson(nova));

      const res = await criarAtuacao({
        nome: 'Direito Civil',
        descricao: 'Contratos',
      });
      expect(res).toEqual(nova);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/atuacoes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-admin',
          },
        })
      );
    });

    it.each([
      [
        { detail: 'Área de atuação já cadastrada' },
        'Área de atuação já cadastrada',
      ],
      [null, 'Não foi possível cadastrar a área de atuação.'],
    ])('lança erro adequado quando POST falha (%j)', async (erroBody, msg) => {
      getAccessToken.mockReturnValue(null);
      fetch.mockResolvedValue({
        ok: false,
        json: erroBody
          ? vi.fn().mockResolvedValue(erroBody)
          : vi.fn().mockRejectedValue(new Error('invalid json')),
      });

      await expect(
        criarAtuacao({ nome: 'Civil', descricao: 'Desc' })
      ).rejects.toThrow(msg);
    });
  });

  describe('atualizarAtuacao', () => {
    it('envia PUT e retorna área atualizada', async () => {
      const atualizada = {
        atuacao_id: 1,
        nome: 'Direito Penal',
        descricao: 'Defesa criminal',
      };
      fetch.mockResolvedValue(respostaJson(atualizada));

      const res = await atualizarAtuacao(1, {
        nome: 'Direito Penal',
        descricao: 'Defesa criminal',
      });
      expect(res).toEqual(atualizada);
    });

    it.each([
      [{ detail: 'Área não encontrada' }, 'Área não encontrada'],
      [null, 'Não foi possível atualizar a área de atuação.'],
    ])('lança erro quando PUT falha (%j)', async (erroBody, msg) => {
      fetch.mockResolvedValue({
        ok: false,
        json: erroBody
          ? vi.fn().mockResolvedValue(erroBody)
          : vi.fn().mockRejectedValue(new Error('invalid')),
      });

      await expect(atualizarAtuacao(1, { nome: 'X' })).rejects.toThrow(msg);
    });
  });

  describe('mudarExibicaoAtuacao', () => {
    it('envia PATCH e retorna área atualizada', async () => {
      const atualizada = { atuacao_id: 1, exibicaoInstitucional: false };
      fetch.mockResolvedValue(respostaJson(atualizada));

      const res = await mudarExibicaoAtuacao(1, false);
      expect(res).toEqual(atualizada);
    });

    it.each([
      [{ detail: 'Erro ao alterar' }, 'Erro ao alterar'],
      [null, 'Não foi possível alterar a exibição da área de atuação.'],
    ])('lança erro quando PATCH falha (%j)', async (erroBody, msg) => {
      fetch.mockResolvedValue({
        ok: false,
        json: erroBody
          ? vi.fn().mockResolvedValue(erroBody)
          : vi.fn().mockRejectedValue(new Error('invalid')),
      });

      await expect(mudarExibicaoAtuacao(1, false)).rejects.toThrow(msg);
    });
  });

  describe('excluirAtuacao', () => {
    it('envia DELETE e retorna confirmação', async () => {
      fetch.mockResolvedValue(respostaJson({ atuacao_id: 1 }));
      const res = await excluirAtuacao(1);
      expect(res).toEqual({ atuacao_id: 1 });
    });

    it.each([
      [{ detail: 'Erro ao excluir' }, 'Erro ao excluir'],
      [null, 'Não foi possível excluir a área de atuação.'],
    ])('lança erro quando DELETE falha (%j)', async (erroBody, msg) => {
      fetch.mockResolvedValue({
        ok: false,
        json: erroBody
          ? vi.fn().mockResolvedValue(erroBody)
          : vi.fn().mockRejectedValue(new Error('invalid')),
      });

      await expect(excluirAtuacao(1)).rejects.toThrow(msg);
    });
  });
});
