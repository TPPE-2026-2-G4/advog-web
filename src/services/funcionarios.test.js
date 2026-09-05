import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  criarFuncionario,
  excluirFuncionario,
  listarFuncionarios,
  mudarAcessoFuncionario,
} from './funcionarios';

const respostaJson = (dados, configuracao = {}) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(dados),
  ...configuracao,
});

const respostaComErro = (detail) => ({
  ok: false,
  json: vi.fn().mockResolvedValue({ detail }),
});

const respostaComErroSemJson = () => ({
  ok: false,
  json: vi.fn().mockRejectedValue(new Error('Resposta inválida')),
});

describe('serviço de funcionários', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('listarFuncionarios', () => {
    it('retorna os funcionários recebidos pela API', async () => {
      const funcionarios = [
        { funcionario_id: 1, nome: 'Maria Silva', status: 'Ativo' },
        { funcionario_id: 2, nome: 'João Santos', status: 'Pendente' },
      ];
      fetch.mockResolvedValue(respostaJson(funcionarios));

      await expect(listarFuncionarios()).resolves.toEqual(funcionarios);
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/funcionarios', {
        cache: 'no-store',
      });
    });

    it.each([
      ['resposta HTTP inválida', () => respostaComErro('Falha interna')],
      ['falha de rede', () => Promise.reject(new Error('NetworkError'))],
      [
        'JSON inválido',
        () =>
          Promise.resolve({
            ok: true,
            json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
          }),
      ],
    ])(
      'retorna uma lista vazia em caso de %s',
      async (_descricao, resposta) => {
        fetch.mockReturnValueOnce(resposta());

        await expect(listarFuncionarios()).resolves.toEqual([]);
      }
    );
  });

  describe('criarFuncionario', () => {
    it('envia nome e e-mail por POST e retorna o funcionário criado', async () => {
      const dados = {
        nome: 'Ana Paula Ribeiro',
        email: 'ana.ribeiro@teste.local',
      };
      const funcionario = { funcionario_id: 3, ...dados, status: 'Pendente' };
      fetch.mockResolvedValue(respostaJson(funcionario));

      await expect(criarFuncionario(dados)).resolves.toEqual(funcionario);
      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
    });

    it.each([
      [
        'mensagem da API',
        respostaComErro('E-mail já cadastrado'),
        'E-mail já cadastrado',
      ],
      [
        'mensagem padrão',
        respostaComErroSemJson(),
        'Não foi possível cadastrar o usuário.',
      ],
    ])(
      'lança o erro com %s quando a criação falha',
      async (_descricao, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);

        await expect(
          criarFuncionario({ nome: 'Maria', email: 'maria@teste.local' })
        ).rejects.toThrow(mensagemEsperada);
      }
    );
  });

  describe('excluirFuncionario', () => {
    it('envia DELETE para o funcionário informado', async () => {
      fetch.mockResolvedValue(respostaJson(null));

      await expect(excluirFuncionario(8)).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/funcionarios/8',
        {
          method: 'DELETE',
        }
      );
    });

    it.each([
      [
        'mensagem da API',
        respostaComErro('Funcionário não encontrado'),
        'Funcionário não encontrado',
      ],
      [
        'mensagem padrão',
        respostaComErroSemJson(),
        'Não foi possível excluir o usuário.',
      ],
    ])(
      'lança o erro com %s quando a exclusão falha',
      async (_descricao, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);

        await expect(excluirFuncionario(8)).rejects.toThrow(mensagemEsperada);
      }
    );
  });

  describe('mudarAcessoFuncionario', () => {
    it.each(['Ativo', 'Inativo'])(
      'envia PATCH e retorna o funcionário com status %s',
      async (status) => {
        const funcionario = { funcionario_id: 8, status };
        fetch.mockResolvedValue(respostaJson(funcionario));

        await expect(mudarAcessoFuncionario(8)).resolves.toEqual(funcionario);
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/funcionarios/8/mudar-acesso',
          { method: 'PATCH' }
        );
      }
    );

    it.each([
      [
        'mensagem da API',
        respostaComErro('Funcionário ainda está pendente'),
        'Funcionário ainda está pendente',
      ],
      [
        'mensagem padrão',
        respostaComErroSemJson(),
        'Não foi possível atualizar o acesso.',
      ],
    ])(
      'lança o erro com %s quando a alteração falha',
      async (_descricao, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);

        await expect(mudarAcessoFuncionario(8)).rejects.toThrow(
          mensagemEsperada
        );
      }
    );
  });
});
