import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enviarSolicitacaoServico } from './solicitacoes';
import { API_URL } from './api';

const dados = {
  nome: 'Maria Silva',
  email: 'maria@example.com',
  telefone: '61999999999',
  descricao: 'Gostaria de solicitar atendimento.',
};

const response = (status, data) => ({
  ok: status === 201,
  status,
  json: vi.fn().mockResolvedValue(data),
});

describe('enviarSolicitacaoServico', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('envia os quatro campos por POST público e retorna o cliente criado', async () => {
    const cliente = {
      ...dados,
      cliente_id: 21,
      etapa_id: 1,
      created_at: '2026-10-11T12:00:00',
    };
    fetch.mockResolvedValue(response(201, cliente));
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    await expect(enviarSolicitacaoServico(dados)).resolves.toEqual(cliente);
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('informa falha de conexão sem confirmar o envio', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.'
    );
  });

  it('traduz o limite de cinco solicitações por minuto', async () => {
    fetch.mockResolvedValue(
      response(429, { error: 'Rate limit exceeded: 5 per 1 minute' })
    );
    await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
      'Muitas solicitações. Aguarde um minuto e tente novamente.'
    );
  });

  it('associa a validação do FastAPI aos campos do formulário', async () => {
    fetch.mockResolvedValue(
      response(422, {
        detail: [
          { loc: ['body', 'nome'], type: 'string_too_short' },
          { loc: ['body', 'email'], type: 'value_error' },
          { loc: ['body', 'telefone'], type: 'value_error' },
          { loc: ['body', 'descricao'], type: 'missing' },
          { loc: ['body', 'desconhecido'], type: 'value_error' },
          { type: 'value_error' },
        ],
      })
    );

    await expect(enviarSolicitacaoServico(dados)).rejects.toMatchObject({
      message: 'Confira os dados informados e tente novamente.',
      fields: {
        nome: 'Nome deve conter de 3 a 100 caracteres.',
        email: 'Informe um email válido.',
        telefone: 'Telefone deve conter DDD + número (10 ou 11 dígitos).',
        descricao: 'Preencha este campo.',
      },
    });
  });

  it('preserva uma mensagem textual retornada pela API', async () => {
    fetch.mockResolvedValue(
      response(400, { detail: 'Não foi possível registrar o pedido.' })
    );
    await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
      'Não foi possível registrar o pedido.'
    );
  });

  it.each([null, { detail: [] }, { detail: { erro: 'Falha' } }])(
    'usa mensagem padrão para erro sem detalhe textual (%s)',
    async (data) => {
      fetch.mockResolvedValue(response(500, data));
      await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
        'Não foi possível enviar sua solicitação. Tente novamente.'
      );
    }
  );

  it('trata respostas de erro que não são JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: vi.fn().mockRejectedValue(new SyntaxError()),
    });
    await expect(enviarSolicitacaoServico(dados)).rejects.toThrow(
      'Não foi possível enviar sua solicitação. Tente novamente.'
    );
  });
});
