import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiUrl = 'https://api.exemplo.com';
const envOriginal = process.env;

const respostaJson = (dados, configuracao = {}) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(dados),
  ...configuracao,
});

const respostaComErro = (dados) => ({
  ok: false,
  json: vi.fn().mockResolvedValue(dados),
});

const respostaComErroSemJson = () => ({
  ok: false,
  json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
});

describe('serviço de autenticação', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...envOriginal,
      NEXT_PUBLIC_API_URL: apiUrl,
    };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = envOriginal;
  });

  describe('login', () => {
    it('envia as credenciais por POST e retorna os dados da autenticação', async () => {
      const dados = {
        user: { id: 1, email: 'ana@exemplo.com' },
        token: 'token-de-acesso',
      };
      fetch.mockResolvedValue(respostaJson(dados));
      const { login } = await import('./auth');

      await expect(login('ana@exemplo.com', 'senha-segura')).resolves.toEqual(
        dados
      );
      expect(fetch).toHaveBeenCalledWith(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ana@exemplo.com',
          senha: 'senha-segura',
        }),
      });
    });

    it.each([
      [
        'a mensagem da API',
        respostaComErro({ message: 'Credenciais inválidas' }),
        'Credenciais inválidas',
      ],
      [
        'a mensagem padrão quando a API não informa uma mensagem',
        respostaComErro({}),
        'Email ou senha inválidos',
      ],
      [
        'a mensagem padrão quando o JSON é inválido',
        respostaComErroSemJson(),
        'Email ou senha inválidos',
      ],
    ])(
      'lança %s quando a autenticação falha',
      async (_descricao, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);
        const { login } = await import('./auth');

        await expect(login('ana@exemplo.com', 'senha')).rejects.toThrow(
          mensagemEsperada
        );
      }
    );
  });

  describe('firstLogin', () => {
    it('envia os dados do primeiro acesso por PATCH e retorna a resposta', async () => {
      const dados = { success: true };
      fetch.mockResolvedValue(respostaJson(dados));
      const { firstLogin } = await import('./auth');

      await expect(
        firstLogin({
          token: 'token-inicial',
          nome: 'Ana Souza',
          senha: 'senha-segura',
          uf_oab: 'DF',
          numero_oab: '123456',
        })
      ).resolves.toEqual(dados);
      expect(fetch).toHaveBeenCalledWith(
        `${apiUrl}/funcionarios/primeiro-acesso`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'token-inicial',
            nome: 'Ana Souza',
            senha: 'senha-segura',
            uf_oab: 'DF',
            numero_oab: '123456',
          }),
        }
      );
    });

    it('envia undefined para os dados opcionais ausentes', async () => {
      fetch.mockResolvedValue(respostaJson({ success: true }));
      const { firstLogin } = await import('./auth');

      await firstLogin({
        token: 'token-inicial',
        nome: 'Ana Souza',
        senha: 'senha-segura',
      });

      expect(fetch).toHaveBeenCalledWith(
        `${apiUrl}/funcionarios/primeiro-acesso`,
        expect.objectContaining({
          body: JSON.stringify({
            token: 'token-inicial',
            nome: 'Ana Souza',
            senha: 'senha-segura',
            uf_oab: undefined,
            numero_oab: undefined,
          }),
        })
      );
    });

    it.each([
      [
        'a mensagem da API',
        respostaComErro({ message: 'Token expirado' }),
        'Token expirado',
      ],
      [
        'a mensagem padrão quando a API não informa uma mensagem',
        respostaComErro({}),
        'Não foi possível concluir o cadastro.',
      ],
      [
        'a mensagem padrão quando o JSON é inválido',
        respostaComErroSemJson(),
        'Não foi possível concluir o cadastro.',
      ],
    ])(
      'lança %s quando o primeiro acesso falha',
      async (_descricao, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);
        const { firstLogin } = await import('./auth');

        await expect(
          firstLogin({
            token: 'token',
            nome: 'Ana',
            senha: 'senha',
          })
        ).rejects.toThrow(mensagemEsperada);
      }
    );
  });

  describe('requestPasswordReset', () => {
    it('solicita a recuperação por POST /auth/esqueci-senha', async () => {
      const dados = {
        mensagem: 'Se o e-mail estiver cadastrado, você receberá um link.',
      };
      fetch.mockResolvedValue(respostaJson(dados));
      const { requestPasswordReset } = await import('./auth');

      await expect(requestPasswordReset('ana@exemplo.com')).resolves.toEqual(
        dados
      );
      expect(fetch).toHaveBeenCalledWith(`${apiUrl}/auth/esqueci-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ana@exemplo.com' }),
      });
    });

    it.each([
      [
        'detail da API',
        respostaComErro({
          detail: 'Não foi possível solicitar a recuperação.',
        }),
        'Não foi possível solicitar a recuperação.',
      ],
      [
        'message da API',
        respostaComErro({ message: 'Serviço indisponível' }),
        'Serviço indisponível',
      ],
      [
        'resposta sem mensagem',
        respostaComErro({}),
        'Não foi possível enviar o link de redefinição.',
      ],
      [
        'JSON inválido',
        respostaComErroSemJson(),
        'Não foi possível enviar o link de redefinição.',
      ],
    ])(
      'traduz o erro de solicitação usando %s',
      async (_cenario, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);
        const { requestPasswordReset } = await import('./auth');

        await expect(requestPasswordReset('ana@exemplo.com')).rejects.toThrow(
          mensagemEsperada
        );
      }
    );
  });

  describe('resetPassword', () => {
    it('redefine a senha por POST /auth/redefinir-senha', async () => {
      const dados = { mensagem: 'Senha redefinida com sucesso.' };
      fetch.mockResolvedValue(respostaJson(dados));
      const { resetPassword } = await import('./auth');

      await expect(
        resetPassword({ token: 'token-reset', senha: 'senha-nova-segura' })
      ).resolves.toEqual(dados);
      expect(fetch).toHaveBeenCalledWith(`${apiUrl}/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'token-reset',
          senha: 'senha-nova-segura',
        }),
      });
    });

    it.each([
      [
        'detail da API',
        respostaComErro({ detail: 'Token inválido ou expirado' }),
        'Token inválido ou expirado',
      ],
      [
        'message da API',
        respostaComErro({ message: 'Senha fraca' }),
        'Senha fraca',
      ],
      [
        'resposta sem mensagem',
        respostaComErro({}),
        'Não foi possível redefinir sua senha.',
      ],
      [
        'lista de validações da API',
        respostaComErro({
          detail: [{ msg: 'Token obrigatório' }, { msg: 'Senha inválida' }],
        }),
        'Token obrigatório Senha inválida',
      ],
      [
        'senha com menos de 8 caracteres',
        respostaComErro({
          detail: [
            {
              loc: ['body', 'senha'],
              type: 'string_too_short',
              msg: 'String should have at least 8 characters',
              ctx: { min_length: 8 },
            },
          ],
        }),
        'A nova senha deve conter pelo menos 8 caracteres.',
      ],
      [
        'JSON inválido',
        respostaComErroSemJson(),
        'Não foi possível redefinir sua senha.',
      ],
    ])(
      'propaga o erro de redefinição informado por %s',
      async (_cenario, resposta, mensagemEsperada) => {
        fetch.mockResolvedValue(resposta);
        const { resetPassword } = await import('./auth');

        await expect(
          resetPassword({ token: 'token-reset', senha: 'senha' })
        ).rejects.toThrow(mensagemEsperada);
      }
    );
  });

  it.each(['login', 'firstLogin', 'requestPasswordReset', 'resetPassword'])(
    'lança erro quando a URL da API não está configurada (%s)',
    async (funcao) => {
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.API_URL;
      const auth = await import('./auth');

      const chamadas = {
        login: () => auth.login('ana@exemplo.com', 'senha'),
        firstLogin: () =>
          auth.firstLogin({ token: 'token', nome: 'Ana', senha: 'senha' }),
        requestPasswordReset: () =>
          auth.requestPasswordReset('ana@exemplo.com'),
        resetPassword: () =>
          auth.resetPassword({ token: 'token', senha: 'senha' }),
      };
      const chamada = chamadas[funcao]();

      await expect(chamada).rejects.toThrow('URL da API não configurada');
      expect(fetch).not.toHaveBeenCalled();
    }
  );
});
