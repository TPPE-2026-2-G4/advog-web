import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
    if (urlStr.includes('/institucional/equipe')) {
      return { ok: true, status: 200, json: async () => funcionarios };
    }
    if (urlStr.includes('/institucional')) {
      return { ok: true, status: 200, json: async () => institucional };
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
    expect(
      screen.getAllByText('Áreas de Atuação').length
    ).toBeGreaterThanOrEqual(1);
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
    expect(
      fetch.mock.calls.some(([url]) => String(url).endsWith('/funcionarios'))
    ).toBe(false);
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

    expect(fetch).toHaveBeenLastCalledWith(`${API_URL}/clientes/`, {
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

  it('renderiza landing page completa com todas as categorias de ícone, identidade visual personalizada, logotipo e dados de contato no rodapé', async () => {
    mockLandingGetEndpoints(
      {
        corPrimaria: '#0f172a',
        corSecundaria: '#f59e0b',
        nomeEscritorio: 'Albuquerque Advocacia',
        descricao: 'Excelência jurídica personalizada',
        logotipo: 'http://minio:9000/bucket/logo.png',
        bannerHero: 'http://minio:9000/bucket/hero.jpg',
        telefone: '(61) 3333-4444',
        email: 'contato@albuquerque.adv.br',
        endereco: 'Brasília Shopping, Torre Sul, Sala 500',
        sobreEscritorio: 'Fundado em 2010.',
      },
      [
        {
          funcionario_id: 1,
          nome: 'Dr. Albuquerque',
          cargo: 'Sócio Gestor',
          exibicaoInstitucional: true,
        },
      ],
      [
        {
          atuacao_id: 1,
          nome: 'Direito Penal e Criminal',
          descricao: 'Defesa penal especializada',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 2,
          nome: 'Direito Tributário e Público',
          descricao: 'Planejamento e contencioso fiscal',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 3,
          nome: 'Direito de Família e Sucessões',
          descricao: 'Inventários e divórcios',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 4,
          nome: 'Contratos e Direito do Consumidor',
          descricao: 'Consultoria e litígios',
          exibicaoInstitucional: true,
        },
        {
          atuacao_id: 5,
          nome: 'Direito Internacional',
          descricao: 'Assessoria transfronteiriça',
          exibicaoInstitucional: true,
        },
      ]
    );

    render(await Home());

    expect(
      screen.getByAltText('Logotipo Albuquerque Advocacia')
    ).toBeInTheDocument();
    expect(screen.getByText('Direito Penal e Criminal')).toBeInTheDocument();
    expect(
      screen.getByText('Direito Tributário e Público')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Direito de Família e Sucessões')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Contratos e Direito do Consumidor')
    ).toBeInTheDocument();
    expect(screen.getByText('Direito Internacional')).toBeInTheDocument();

    // Rodapé
    expect(screen.getByText('(61) 3333-4444')).toBeInTheDocument();
    expect(screen.getByText('contato@albuquerque.adv.br')).toBeInTheDocument();
    expect(
      screen.getByText('Brasília Shopping, Torre Sul, Sala 500')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`© ${new Date().getFullYear()} Albuquerque Advocacia`)
      )
    ).toBeInTheDocument();
  });

  it('interage com a PublicNavbar na landing page: scroll para início, seções e menu mobile', async () => {
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;

    mockLandingGetEndpoints(
      {},
      [{ funcionario_id: 1, exibicaoInstitucional: true }],
      [{ atuacao_id: 1, exibicaoInstitucional: true }]
    );
    render(await Home());

    // Scroll para início via desktop link
    const inicioLinks = screen.getAllByRole('link', { name: /Início/i });
    fireEvent.click(inicioLinks[0]);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    // Scroll para seção com elemento no documento
    const areasLinks = screen.getAllByRole('link', {
      name: /Áreas de Atuação/i,
    });
    fireEvent.click(areasLinks[0]);
    expect(scrollToSpy).toHaveBeenCalled();

    // Menu Mobile toggle
    const hamburgerBtn = screen.getByRole('button', {
      name: 'Abrir menu de navegação',
    });
    expect(hamburgerBtn).toHaveAttribute('aria-expanded', 'false');

    // Abre menu mobile
    fireEvent.click(hamburgerBtn);
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Fechar menu de navegação' })
    ).toHaveAttribute('aria-expanded', 'true');

    // Clica em um link dentro do menu mobile fecha o menu
    const mobileMenu = screen.getByTestId('mobile-menu');
    const mobileSobreLink = within(mobileMenu).getByRole('link', {
      name: 'Sobre',
    });
    fireEvent.click(mobileSobreLink);
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();

    // Reabre e clica em Acessar Painel fecha o menu
    fireEvent.click(
      screen.getByRole('button', { name: 'Abrir menu de navegação' })
    );
    const mobileActionBtn = within(screen.getByTestId('mobile-menu')).getByRole(
      'link',
      { name: 'Acessar Painel' }
    );
    fireEvent.click(mobileActionBtn);
    expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
  });
});
