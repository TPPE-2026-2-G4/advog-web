import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';
import { API_URL } from '@/services/api';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/atuacoes', () => ({
  listarAtuacoes: vi.fn().mockResolvedValue([]),
}));

const values = {
  'Nome completo': ' Maria Silva ',
  Email: 'maria@example.com',
  Telefone: '(61) 99999-9999',
  'Descreva sua demanda': ' Gostaria de solicitar atendimento. ',
};
const dados = {
  nome: 'Maria Silva',
  email: 'maria@example.com',
  telefone: '61999999999',
  descricao: 'Gostaria de solicitar atendimento.',
};

async function preencherEEnviar() {
  render(await Home());
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));
}

describe('Integração: solicitação pública de atendimento', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('confirma o recebimento somente após a resposta da API e permite nova solicitação', async () => {
    let resolve;
    fetch.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    await preencherEEnviar();

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    expect(
      screen.queryByRole('status', { name: 'Solicitação enviada' })
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeDisabled();

    await act(async () =>
      resolve({
        ok: true,
        status: 201,
        json: async () => ({
          ...dados,
          cliente_id: 21,
          etapa_id: 1,
          created_at: '2026-10-11T12:00:00',
        }),
      })
    );
    expect(
      screen.getByRole('status', { name: 'Solicitação enviada' })
    ).toHaveTextContent('Recebemos sua solicitação com sucesso.');
    fireEvent.click(
      screen.getByRole('button', { name: 'Preencher nova solicitação' })
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Nome completo')).toHaveFocus()
    );
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('mostra a validação 422 junto ao campo e permite corrigir e reenviar', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          { loc: ['body', 'email'], type: 'value_error', msg: 'Invalid email' },
        ],
      }),
    });
    await preencherEEnviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Confira os dados informados e tente novamente.'
    );
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAccessibleDescription('Informe um email válido.');
    await waitFor(() => expect(email).toHaveFocus());
    expect(screen.getByLabelText('Telefone')).toHaveValue(values.Telefone);
    expect(
      screen.queryByRole('status', { name: 'Solicitação enviada' })
    ).not.toBeInTheDocument();

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente_id: 22 }),
    });
    fireEvent.change(email, { target: { value: 'maria@outro.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));
    expect(
      await screen.findByRole('status', { name: 'Solicitação enviada' })
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'limite de envios',
      () => Promise.resolve({ ok: false, status: 429 }),
      'Muitas solicitações. Aguarde um minuto e tente novamente.',
    ],
    [
      'falha de rede',
      () => Promise.reject(new TypeError('Failed to fetch')),
      'Não foi possível conectar ao servidor. Tente novamente.',
    ],
  ])('preserva os dados após %s', async (_scenario, response, message) => {
    fetch.mockImplementationOnce(response);
    await preencherEEnviar();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    for (const [label, value] of Object.entries(values)) {
      expect(screen.getByLabelText(label)).toHaveValue(value);
    }
    expect(
      screen.queryByRole('status', { name: 'Solicitação enviada' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enviar Solicitação' })
    ).toBeEnabled();
  });
});
