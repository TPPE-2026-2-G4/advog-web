import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  criarFuncionario,
  excluirFuncionario,
  listarFuncionarios,
  mudarAcessoFuncionario,
  mudarCargoFuncionario,
  mudarExibicaoInstitucional,
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
    sessionStorage.clear();
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
    it('envia nome, e-mail e cargo por POST e retorna o funcionário criado', async () => {
      const dados = {
        nome: 'Ana Paula Ribeiro',
        email: 'ana.ribeiro@teste.local',
        cargo_id: 2,
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
      [
        'validação estruturada do FastAPI',
        respostaComErro([
          {
            type: 'missing',
            loc: ['body', 'cargo_id'],
            msg: 'Field required',
          },
        ]),
        'Cargo: campo obrigatório.',
      ],
      [
        'validação estruturada de formato',
        respostaComErro([
          {
            type: 'value_error',
            loc: ['body', 'email'],
            msg: 'E-mail inválido',
          },
        ]),
        'E-mail: E-mail inválido',
      ],
      [
        'validação estruturada sem mensagem utilizável',
        respostaComErro([{}]),
        'Não foi possível cadastrar o usuário.',
      ],
    ])(
      'lança o erro com %s quando a criação falha',
      async (_descricao, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);

        await expect(
          criarFuncionario({
            nome: 'Maria',
            email: 'maria@teste.local',
            cargo_id: 2,
          })
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

  describe('mudarCargoFuncionario', () => {
    it('envia o cargo e o token por PATCH', async () => {
      const funcionario = { funcionario_id: 8, cargo_id: 2 };
      sessionStorage.setItem('access_token', 'token-jwt');
      fetch.mockResolvedValue(respostaJson(funcionario));

      await expect(mudarCargoFuncionario(8, '2')).resolves.toEqual(funcionario);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/funcionarios/8/mudar-cargo',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-jwt',
          },
          body: JSON.stringify({ cargo_id: 2 }),
        }
      );
    });

    it('não faz a requisição sem token', async () => {
      await expect(mudarCargoFuncionario(8, 2)).rejects.toThrow(
        'Sessão expirada. Faça login novamente.'
      );
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('mudarExibicaoInstitucional', () => {
    it('envia a visibilidade institucional e o token por PATCH', async () => {
      const funcionario = {
        funcionario_id: 8,
        exibicaoInstitucional: true,
      };
      sessionStorage.setItem('access_token', 'token-jwt');
      fetch.mockResolvedValue(respostaJson(funcionario));

      await expect(mudarExibicaoInstitucional(8, true)).resolves.toEqual(
        funcionario
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/funcionarios/8/exibicao-institucional',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-jwt',
          },
          body: JSON.stringify({ exibicaoInstitucional: true }),
        }
      );
    });

    it('lança erro quando a alteração de exibição institucional falha', async () => {
      fetch.mockResolvedValue(
        respostaComErro('Não autorizado a alterar visibilidade')
      );

      await expect(mudarExibicaoInstitucional(8, false)).rejects.toThrow(
        'Não autorizado a alterar visibilidade'
      );
    });
  });
});
