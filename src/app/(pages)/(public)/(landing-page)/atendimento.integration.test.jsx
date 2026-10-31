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

function mockLandingGetEndpoints(
  institucional = {},
  funcionarios = [],
  atuacoes = []
) {
  fetch.mockImplementation(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/institucional')) {
      return { ok: true, status: 200, json: async () => institucional };
    }
    if (urlStr.includes('/funcionarios')) {
      return { ok: true, status: 200, json: async () => funcionarios };
    }
    if (urlStr.includes('/atuacoes')) {
      return { ok: true, status: 200, json: async () => atuacoes };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
}

async function preencherEEnviar(setupSolicitacaoFetch) {
  render(await Home());
  if (setupSolicitacaoFetch) {
    setupSolicitacaoFetch();
  }
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));
}

describe('Integração: Landing Page Institucional e Solicitação Pública de Atendimento', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockLandingGetEndpoints();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renderiza a landing page completa integrando dados institucionais, áreas de atuação e equipe com diferentes formatos de cargo e OAB via fetch', async () => {
    mockLandingGetEndpoints(
      {
        sobreEscritorio:
          'Primeiro parágrafo institucional.\n\nSegundo parágrafo.',
        imagemSobre: 'http://minio:9000/bucket/sobre.jpg',
        textoEquipe: 'Equipe de excelência em Brasília.',
      },
      [
        {
          funcionario_id: 1,
          nome: 'Dr. Alexandre Carreiro',
          cargo: 'Sócio Fundador · Direito Empresarial',
          numero_oab: '12345',
          uf_oab: 'DF',
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 2,
          nome: 'Dra. Beatriz Rocha',
          cargo: 'Advogada Sênior - Contencioso Cível',
          oab: 'OAB/SP 99887',
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 3,
          nome: 'Carlos Eduardo',
          cargo: { nome: 'Advogado Pleno', descricao: 'Tributário' },
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 4,
          nome: 'Daniela Martins',
          cargo: { nome_cargo: 'Consultora' },
          especialidade: 'Direito Trabalhista',
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 5,
          nome: 'Eduardo Nogueira',
          cargo: null,
          area: 'Direito Digital',
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 6,
          nome: 'Membro Oculto',
          cargo: 'Estagiário',
          exibicaoInstitucional: false,
        },
      ],
      [
        {
          atuacao_id: 10,
          titulo: 'Direito Civil',
          descricao: 'Contratos e responsabilidade civil.',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 11,
          nome: 'Direito Societário',
          descricao: 'Societário e fusões.',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 12,
          nome: 'Área Oculta',
          descricao: 'Não visível.',
          exibicaoInstitucional: false,
        },
      ]
    );

    render(await Home());

    expect(
      screen.getByText('Primeiro parágrafo institucional.')
    ).toBeInTheDocument();
    expect(screen.getByText('Segundo parágrafo.')).toBeInTheDocument();
    expect(screen.getByAltText('Imagem do escritório')).toHaveAttribute(
      'src',
      'http://localhost:9000/bucket/sobre.jpg'
    );
    expect(screen.getByText('Áreas de Atuação')).toBeInTheDocument();
    expect(screen.getByText('Direito Civil')).toBeInTheDocument();
    expect(screen.getByText('Direito Societário')).toBeInTheDocument();
    expect(screen.queryByText('Área Oculta')).not.toBeInTheDocument();

    expect(screen.getByText('Nossa Equipe')).toBeInTheDocument();
    expect(
      screen.getByText('Equipe de excelência em Brasília.')
    ).toBeInTheDocument();
    expect(screen.getByText('Dr. Alexandre Carreiro')).toBeInTheDocument();
    expect(screen.getByText('Sócio Fundador')).toBeInTheDocument();
    expect(screen.getByText('OAB/DF 12.345')).toBeInTheDocument();
    expect(screen.getByText('Dra. Beatriz Rocha')).toBeInTheDocument();
    expect(screen.getByText('Contencioso Cível')).toBeInTheDocument();
    expect(screen.getByText('Tributário')).toBeInTheDocument();
    expect(screen.getByText('Direito Trabalhista')).toBeInTheDocument();
    expect(screen.getByText('Direito Digital')).toBeInTheDocument();
    expect(screen.queryByText('Membro Oculto')).not.toBeInTheDocument();
  });

  it('confirma o recebimento somente após a resposta da API e permite nova solicitação', async () => {
    let resolve;
    mockLandingGetEndpoints();
    render(await Home());

    fetch.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    for (const [label, value] of Object.entries(values)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Solicitação' }));

    expect(fetch).toHaveBeenLastCalledWith(`${API_URL}/solicitacoes`, {
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
    await preencherEEnviar(() => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          detail: [
            {
              loc: ['body', 'email'],
              type: 'value_error',
              msg: 'Invalid email',
            },
          ],
        }),
      });
    });

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
    await preencherEEnviar(() => {
      fetch.mockImplementationOnce(response);
    });
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
