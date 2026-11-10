import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarPerfilFuncionario,
  criarFuncionario,
  excluirFuncionario,
  listarFuncionarios,
  mudarAcessoFuncionario,
  mudarCargoFuncionario,
  mudarExibicaoInstitucional,
  obterMeuPerfil,
  uploadFotoPerfilFuncionario,
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
    localStorage.clear();
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
    beforeEach(() => {
      sessionStorage.setItem('access_token', 'token-admin');
    });

    it('não envia a requisição quando não há token de autenticação', async () => {
      sessionStorage.clear();

      await expect(criarFuncionario({})).rejects.toThrow(
        'Sessão expirada. Faça login novamente.'
      );
      expect(fetch).not.toHaveBeenCalled();
    });

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-admin',
        },
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

    it('envia DELETE para o funcionário informado com cabeçalho de autorização quando logado', async () => {
      sessionStorage.setItem('access_token', 'token-admin');
      fetch.mockResolvedValue(respostaJson(null));

      await expect(excluirFuncionario(8)).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/funcionarios/8',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer token-admin',
          },
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

    it('envia PATCH com cabeçalho de autorização quando logado', async () => {
      sessionStorage.setItem('access_token', 'token-admin');
      const funcionario = { funcionario_id: 8, status: 'Inativo' };
      fetch.mockResolvedValue(respostaJson(funcionario));

      await expect(mudarAcessoFuncionario(8)).resolves.toEqual(funcionario);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/funcionarios/8/mudar-acesso',
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer token-admin',
          },
        }
      );
    });

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

    it.each([
      ['mensagem da API', respostaComErro('Cargo inválido'), 'Cargo inválido'],
      [
        'mensagem padrão',
        respostaComErroSemJson(),
        'Não foi possível alterar o cargo.',
      ],
    ])(
      'lança o erro com %s quando a alteração de cargo falha',
      async (_descricao, resposta, mensagemEsperada) => {
        sessionStorage.setItem('access_token', 'token-jwt');
        fetch.mockResolvedValue(resposta);
        await expect(mudarCargoFuncionario(8, 2)).rejects.toThrow(
          mensagemEsperada
        );
      }
    );
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

    describe('atualizarPerfilFuncionario', () => {
      it('envia os dados do perfil autenticado por PATCH', async () => {
        const funcionario = {
          funcionario_id: 8,
          nome: 'Ana Souza',
          uf_oab: 'DF',
          numero_oab: '12345',
        };
        sessionStorage.setItem('access_token', 'token-jwt');
        fetch.mockResolvedValue(respostaJson(funcionario));

        await expect(
          atualizarPerfilFuncionario({
            nome: 'Ana Souza',
            uf_oab: 'DF',
            numero_oab: '12345',
          })
        ).resolves.toEqual(funcionario);
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/funcionarios/perfil',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer token-jwt',
            },
            body: JSON.stringify({
              nome: 'Ana Souza',
              uf_oab: 'DF',
              numero_oab: '12345',
            }),
          }
        );
      });

      it('não envia a requisição sem autenticação', async () => {
        await expect(
          atualizarPerfilFuncionario({ nome: 'Ana Souza' })
        ).rejects.toThrow('Sessão expirada. Faça login novamente.');
        expect(fetch).not.toHaveBeenCalled();
      });

      it('exibe o erro retornado pela API', async () => {
        sessionStorage.setItem('access_token', 'token-jwt');
        fetch.mockResolvedValue(respostaComErro('Dados inválidos'));

        await expect(
          atualizarPerfilFuncionario({ nome: 'Ana Souza' })
        ).rejects.toThrow('Dados inválidos');
      });
    });

    describe('obterMeuPerfil', () => {
      it('busca o perfil autenticado e atualiza os dados sem cache', async () => {
        const perfil = {
          funcionario_id: 8,
          nome: 'Ana Souza',
          atuacao_id: 5,
          foto_perfil_url: 'https://storage.exemplo.com/perfil.png',
        };
        sessionStorage.setItem('access_token', 'token-jwt');
        fetch.mockResolvedValue(respostaJson(perfil));

        await expect(obterMeuPerfil()).resolves.toEqual(perfil);
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8000/funcionarios/perfil',
          {
            headers: { Authorization: 'Bearer token-jwt' },
            cache: 'no-store',
          }
        );
      });

      it('não busca o perfil sem autenticação', async () => {
        await expect(obterMeuPerfil()).rejects.toThrow(
          'Sessão expirada. Faça login novamente.'
        );
        expect(fetch).not.toHaveBeenCalled();
      });
    });

    describe('uploadFotoPerfilFuncionario', () => {
      it('envia arquivo de foto por PUT com autenticação Bearer', async () => {
        const arquivo = new File(['foto'], 'perfil.png', {
          type: 'image/png',
        });
        const funcionario = {
          funcionario_id: 8,
          foto_perfil_url: 'https://storage.exemplo.com/perfil.png',
        };
        sessionStorage.setItem('access_token', 'token-jwt');
        fetch.mockResolvedValue(respostaJson(funcionario));

        await expect(uploadFotoPerfilFuncionario(arquivo)).resolves.toEqual(
          funcionario
        );

        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('http://localhost:8000/funcionarios/perfil/foto');
        expect(options.method).toBe('PUT');
        expect(options.headers).toEqual({
          Authorization: 'Bearer token-jwt',
        });
        expect(options.body).toBeInstanceOf(FormData);
        expect(options.body.get('file')).toBe(arquivo);
      });

      it('não envia a foto sem autenticação', async () => {
        await expect(
          uploadFotoPerfilFuncionario(new File(['foto'], 'perfil.png'))
        ).rejects.toThrow('Sessão expirada. Faça login novamente.');
        expect(fetch).not.toHaveBeenCalled();
      });

      it('exibe o erro retornado pela API ao enviar a foto', async () => {
        sessionStorage.setItem('access_token', 'token-jwt');
        fetch.mockResolvedValue(respostaComErro('Arquivo inválido'));

        await expect(
          uploadFotoPerfilFuncionario(
            new File(['foto'], 'perfil.png', { type: 'image/png' })
          )
        ).rejects.toThrow('Arquivo inválido');
      });
    });
  });
});
