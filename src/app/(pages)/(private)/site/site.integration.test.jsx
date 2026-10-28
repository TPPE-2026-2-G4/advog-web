import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SitePage from './page';
import SiteClient from './siteClient';
import { formatParagraphs, getImageUrl } from '@/utils/institucional';
import {
  buscarDadosInstitucionais,
  salvarDadosInstitucionais,
  uploadImagemInstitucional,
} from '@/services/institucional';
import {
  listarAtuacoes,
  criarAtuacao,
  atualizarAtuacao,
  mudarExibicaoAtuacao,
  excluirAtuacao,
} from '@/services/atuacoes';

const mockInitialData = {
  id: 1,
  nomeEscritorio: 'Carreiro Advogados',
  descricao: 'Slogan teste',
  sobreEscritorio: 'História teste',
  imagemSobre: null,
  textoAdicionalSobre: 'Texto adicional teste',
  email: 'contato@carreiro.adv.br',
  telefone: '(61) 98765-4321',
  endereco: 'Brasília, DF',
  corPrimaria: '#1B2A4A',
  corSecundaria: '#B79A63',
  logotipo: '',
  bannerHero: '',
};

const mockInitialTeam = [
  {
    funcionario_id: 1,
    nome: 'Dr. Alexandre Carreiro',
    cargo: 'Sócio Fundador',
    exibicaoInstitucional: true,
  },
  {
    funcionario_id: 2,
    nome: 'Dra. Ana Paula Ribeiro',
    cargo: 'Advogada Sênior',
    exibicaoInstitucional: false,
  },
];

const mockInitialAreas = [
  {
    atuacao_id: 1,
    nome: 'Direito Civil',
    descricao: 'Contratos e obrigações',
    exibicaoInstitucional: true,
  },
];

const renderSiteClient = (props = {}) =>
  render(
    <SiteClient
      initialData={mockInitialData}
      initialTeam={mockInitialTeam}
      initialAreas={mockInitialAreas}
      {...props}
    />
  );

describe('Integração: Módulo de Personalização do Site', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    } else {
      vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    }
    window.localStorage.setItem('access_token', 'token-admin-site');
  });

  it('renderiza a página Server Component (SitePage) buscando dados iniciais da API', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/institucional')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockInitialData,
        };
      }
      if (String(url).includes('/funcionarios')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockInitialTeam,
        };
      }
      if (String(url).includes('/atuacoes')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockInitialAreas,
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    const pageElement = await SitePage();
    render(pageElement);

    expect(screen.getByText('Personalização do Site')).toBeInTheDocument();
    expect(screen.getByText('Logotipo')).toBeInTheDocument();
  });

  it('carrega dados via useEffect quando initialData está vazio e arrays iniciais estão vazios', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/institucional')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ...mockInitialData,
            nomeEscritorio: 'Escritório Carregado via Hook',
            logotipo: 'http://localhost:9000/logo.png',
            bannerHero: 'http://localhost:9000/banner.jpg',
            imagemSobre: 'http://localhost:9000/sobre.jpg',
          }),
        };
      }
      if (String(url).includes('/funcionarios')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockInitialTeam,
        };
      }
      if (String(url).includes('/atuacoes')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockInitialAreas,
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });

    render(
      <SiteClient
        initialData={{ nomeEscritorio: '' }}
        initialTeam={[]}
        initialAreas={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Logotipo do escritório')).toBeInTheDocument();
      expect(screen.getByAltText('Banner Hero')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));
    expect(screen.getByLabelText('Nome do escritório')).toHaveValue(
      'Escritório Carregado via Hook'
    );
  });

  it('usa fallbacks padrão quando SiteClient recebe props indefinidas', () => {
    render(<SiteClient initialData={null} />);
    expect(screen.getByText('Personalização do Site')).toBeInTheDocument();
  });

  it('permite navegar entre as 5 abas e interagir com os formulários', () => {
    renderSiteClient();

    expect(screen.getByText('Logotipo')).toBeInTheDocument();
    expect(screen.getByText('Imagem do Banner (Hero)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));
    expect(screen.getByText('Textos Institucionais')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do escritório')).toHaveValue(
      'Carreiro Advogados'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Áreas de Atuação' }));
    expect(
      screen.getByText('Áreas de Atuação exibidas no site')
    ).toBeInTheDocument();
    expect(screen.getByText('Direito Civil')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /equipe no site/i }));
    expect(screen.getByText('Advogados exibidos no site')).toBeInTheDocument();
    expect(screen.getByText('Dr. Alexandre Carreiro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Cores' }));
    expect(screen.getByText('Paleta de cores')).toBeInTheDocument();
    expect(screen.getByText('Prévia da navbar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Identidade Visual' }));
    expect(screen.getByText('Logotipo')).toBeInTheDocument();
  });

  it.each([
    {
      tabName: 'Identidade Visual',
      expectedHeading: 'Logotipo',
      expectedSubtext: 'Imagem do Banner (Hero)',
    },
    {
      tabName: 'Conteúdo',
      expectedHeading: 'Textos Institucionais',
      expectedSubtext: 'Dados de contato público',
    },
    {
      tabName: 'Áreas de Atuação',
      expectedHeading: 'Áreas de Atuação exibidas no site',
      expectedSubtext: 'Direito Civil',
    },
    {
      tabName: 'Equipe no Site',
      expectedHeading: 'Advogados exibidos no site',
      expectedSubtext: 'Dr. Alexandre Carreiro',
    },
    {
      tabName: 'Cores',
      expectedHeading: 'Paleta de cores',
      expectedSubtext: 'Prévia da navbar',
    },
  ])(
    'ativa a aba "$tabName" e renderiza a seção "$expectedHeading"',
    ({ tabName, expectedHeading, expectedSubtext }) => {
      renderSiteClient();

      const tabButton = screen.getByRole('tab', { name: tabName });
      fireEvent.click(tabButton);

      expect(tabButton).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText(expectedHeading)).toBeInTheDocument();
      expect(screen.getByText(expectedSubtext)).toBeInTheDocument();
    }
  );

  it('abre o modal de prévia ao clicar no botão "Ver prévia", exibe todos os elementos e fecha via botão, Escape ou clique no overlay', () => {
    process.env.NEXT_PUBLIC_MINIO_INTERNAL = 'http://minio:9000';
    process.env.NEXT_PUBLIC_MINIO_EXTERNAL = 'http://localhost:9000';

    renderSiteClient({
      initialData: {
        ...mockInitialData,
        logotipo: 'http://minio:9000/bucket/logo.png',
        bannerHero: 'http://minio:9000/bucket/banner.jpg',
        imagemSobre: 'http://minio:9000/bucket/sobre.jpg',
      },
      initialTeam: [
        ...mockInitialTeam,
        {
          funcionario_id: 3,
          nome: 'Dr. Carlos Mendes',
          cargo: { nome: 'Associado' },
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 4,
          nome: 'Dra. Beatriz Lima',
          cargo: { nome_cargo: 'Consultora' },
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 5,
          nome: 'Dr. Marcos',
          cargo: {},
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 6,
          nome: 'Dra. Sem Cargo',
          cargo: null,
          exibicaoInstitucional: true,
        },
      ],
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Sobre o Escritório')).toBeInTheDocument();

    const logoImg = screen.getByAltText('Carreiro Advogados');
    expect(logoImg).toHaveAttribute(
      'src',
      'http://localhost:9000/bucket/logo.png'
    );
    expect(screen.getByAltText('Sobre o Escritório')).toHaveAttribute(
      'src',
      'http://localhost:9000/bucket/sobre.jpg'
    );

    // Clicar dentro do modal não deve fechá-lo
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Tecla diferente de Escape não fecha
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Escape fecha o modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reabre e fecha clicando no overlay
    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('preview-modal-overlay'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reabre e fecha pelo botão X
    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    fireEvent.click(screen.getByLabelText('Fechar prévia'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza modal de prévia e aba Conteúdo com fallbacks quando campos opcionais estão vazios', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/institucional')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ nomeEscritorio: '' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [],
      };
    });

    renderSiteClient({
      initialData: {
        id: 1,
        nomeEscritorio: '',
        descricao: '',
        sobreEscritorio: '',
        imagemSobre: null,
        textoAdicionalSobre: '',
        email: '',
        telefone: '',
        endereco: '',
        corPrimaria: '',
        corSecundaria: 'invalida',
        logotipo: '',
        bannerHero: '',
      },
      initialTeam: [],
      initialAreas: [],
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));
    expect(screen.getByLabelText('Nome do escritório')).toHaveValue('');
    expect(screen.getByLabelText('Endereço')).toHaveValue('');

    fireEvent.click(screen.getByRole('tab', { name: 'Cores' }));
    expect(screen.getByLabelText('Selecionar cor primária')).toHaveValue(
      '#1b2a4a'
    );
    expect(screen.getByLabelText('Selecionar cor de acento')).toHaveValue(
      '#b79a63'
    );
    fireEvent.change(
      screen.getByLabelText('Cor de acento (botões, ícones, destaques)'),
      { target: { value: '' } }
    );

    fireEvent.click(screen.getByRole('button', { name: /ver prévia/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('Tradição e excelência na defesa dos seus direitos')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fechar prévia'));

    // Salvar quando team e areas estão vazios
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Configurações do site salvas com sucesso!')
      ).toBeInTheDocument();
    });
  });

  it('realiza uploads e validações na aba Identidade Visual (logo e banner)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'http://localhost:9000/uploaded.png' }),
    });

    renderSiteClient();

    const logoInput = screen.getByTestId('logo-file-input');
    const bannerInput = screen.getByTestId('banner-file-input');

    // Eventos sem arquivo não disparam upload
    fireEvent.change(logoInput, { target: { files: [] } });
    fireEvent.change(bannerInput, { target: { files: [] } });

    // Cliques e teclado nas áreas de upload
    fireEvent.click(screen.getByRole('button', { name: 'Fazer upload' }));
    const bannerUploadArea = screen.getByRole('button', {
      name: /clique para fazer upload/i,
    });
    fireEvent.click(bannerUploadArea);
    fireEvent.keyDown(bannerUploadArea, { key: 'Enter' });
    fireEvent.keyDown(bannerUploadArea, { key: ' ' });
    fireEvent.keyDown(bannerUploadArea, { key: 'Tab' });

    // Formato inválido para logo
    const invalidLogo = new File(['abc'], 'documento.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(logoInput, { target: { files: [invalidLogo] } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Formato inválido. Selecione um arquivo PNG ou SVG.'
    );

    // Tamanho > 2MB para logo
    const bigLogo = new File([new ArrayBuffer(2 * 1024 * 1024 + 10)], 'b.png', {
      type: 'image/png',
    });
    fireEvent.change(logoInput, { target: { files: [bigLogo] } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'O arquivo excede o limite máximo de 2 MB.'
    );

    // Upload de logo válido
    const validLogo = new File(['img'], 'logo.png', { type: 'image/png' });
    fireEvent.change(logoInput, { target: { files: [validLogo] } });

    await waitFor(() => {
      expect(screen.getByAltText('Logotipo do escritório')).toBeInTheDocument();
    });

    // Formato inválido para banner
    const invalidBanner = new File(['abc'], 'anim.gif', { type: 'image/gif' });
    fireEvent.change(bannerInput, { target: { files: [invalidBanner] } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Formato inválido. Selecione um arquivo JPG ou PNG.'
    );

    // Tamanho > 5MB para banner
    const bigBanner = new File(
      [new ArrayBuffer(5 * 1024 * 1024 + 10)],
      'banner.jpg',
      { type: 'image/jpeg' }
    );
    fireEvent.change(bannerInput, { target: { files: [bigBanner] } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'O arquivo excede o limite máximo de 5 MB.'
    );

    // Upload de banner válido
    const validBanner = new File(['img'], 'banner.jpg', { type: 'image/jpeg' });
    fireEvent.change(bannerInput, { target: { files: [validBanner] } });

    await waitFor(() => {
      expect(screen.getByAltText('Banner Hero')).toBeInTheDocument();
    });

    // Botão substituir imagem do banner
    fireEvent.click(screen.getByRole('button', { name: /substituir imagem/i }));

    // Falha crítica no upload de logo e banner (acionando catch no hook com e sem mensagem)
    global.fetch.mockResolvedValue({ ok: false, status: 500 });
    vi.spyOn(global.URL, 'createObjectURL').mockImplementationOnce(() => {
      throw new Error('');
    });
    fireEvent.change(logoInput, { target: { files: [validLogo] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Falha ao carregar logotipo.'
      );
    });

    vi.spyOn(global.URL, 'createObjectURL').mockImplementationOnce(() => {
      throw new Error('Erro customizado logo');
    });
    fireEvent.change(logoInput, { target: { files: [validLogo] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Erro customizado logo'
      );
    });

    vi.spyOn(global.URL, 'createObjectURL').mockImplementationOnce(() => {
      throw new Error('');
    });
    fireEvent.change(bannerInput, { target: { files: [validBanner] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Falha ao carregar imagem do banner.'
      );
    });

    vi.spyOn(global.URL, 'createObjectURL').mockImplementationOnce(() => {
      throw new Error('Erro customizado banner');
    });
    fireEvent.change(bannerInput, { target: { files: [validBanner] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Erro customizado banner'
      );
    });
  });

  it('edita todos os campos e faz upload da imagem na aba Conteúdo', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: 'http://localhost:9000/sobre.png' }),
    });

    renderSiteClient();
    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));

    fireEvent.change(screen.getByLabelText('Nome do escritório'), {
      target: { value: 'Novo Nome' },
    });
    fireEvent.change(screen.getByLabelText('Slogan / subtítulo do hero'), {
      target: { value: 'Novo Slogan' },
    });
    fireEvent.change(screen.getByLabelText('Sobre o escritório'), {
      target: { value: 'Nova história' },
    });
    fireEvent.change(
      screen.getByLabelText(
        'Informações adicionais (exibidas abaixo da descrição)'
      ),
      { target: { value: 'Novos dados adicionais' } }
    );
    fireEvent.change(screen.getByLabelText('Telefone'), {
      target: { value: '(61) 3333-4444' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'novo@email.com' },
    });
    fireEvent.change(screen.getByLabelText('Endereço'), {
      target: { value: 'Novo Endereço' },
    });

    expect(screen.getByLabelText('Nome do escritório')).toHaveValue(
      'Novo Nome'
    );
    expect(screen.getByLabelText('Telefone')).toHaveValue('(61) 3333-4444');
    expect(screen.getByLabelText('Email')).toHaveValue('novo@email.com');
    expect(screen.getByLabelText('Endereço')).toHaveValue('Novo Endereço');

    const sobreInput = screen.getByTestId('sobre-file-input');
    fireEvent.change(sobreInput, { target: { files: [] } });

    const uploadArea = screen.getByRole('button', {
      name: /clique para fazer upload/i,
    });
    fireEvent.click(uploadArea);
    fireEvent.keyDown(uploadArea, { key: 'Enter' });
    fireEvent.keyDown(uploadArea, { key: ' ' });
    fireEvent.keyDown(uploadArea, { key: 'Escape' });

    // Validação formato inválido e tamanho > 5MB na imagem sobre
    const invalidFile = new File(['a'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(sobreInput, { target: { files: [invalidFile] } });

    const bigFile = new File(
      [new ArrayBuffer(5 * 1024 * 1024 + 10)],
      'sobre.png',
      { type: 'image/png' }
    );
    fireEvent.change(sobreInput, { target: { files: [bigFile] } });

    // Upload válido
    const validFile = new File(['img'], 'sobre.png', { type: 'image/png' });
    fireEvent.change(sobreInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByAltText('Imagem da seção Sobre')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /substituir imagem/i }));

    // Falha crítica no upload da imagem sobre (acionando catch no hook)
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    vi.spyOn(global.URL, 'createObjectURL').mockImplementationOnce(() => {
      throw new Error('');
    });
    fireEvent.change(sobreInput, { target: { files: [validFile] } });
  });

  it('gerencia criação, validação, edição e exclusão na aba Áreas de Atuação', async () => {
    renderSiteClient();
    fireEvent.click(screen.getByRole('tab', { name: 'Áreas de Atuação' }));

    // Abrir form de nova área
    fireEvent.click(screen.getByRole('button', { name: /nova área/i }));
    expect(screen.getByText('Nova área de atuação')).toBeInTheDocument();

    // Validação de campos curtos
    fireEvent.change(screen.getByLabelText(/título da área/i), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByLabelText(/descrição da área/i), {
      target: { value: 'B' },
    });
    fireEvent.click(screen.getByRole('button', { name: /adicionar área/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o título e a descrição com pelo menos 2 caracteres.'
    );

    // Cancelar formulário
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Nova área de atuação')).not.toBeInTheDocument();

    // Criar nova área com erro da API primeiro
    fireEvent.click(screen.getByRole('button', { name: /nova área/i }));
    fireEvent.change(screen.getByLabelText(/título da área/i), {
      target: { value: 'Direito Trabalhista' },
    });
    fireEvent.change(screen.getByLabelText(/descrição da área/i), {
      target: { value: 'Defesa trabalhista empresarial' },
    });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Área já existe' }),
    });
    fireEvent.click(screen.getByRole('button', { name: /adicionar área/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Área já existe');
    });

    // Criar nova área com sucesso
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        atuacao_id: 2,
        nome: 'Direito Trabalhista',
        descricao: 'Defesa trabalhista empresarial',
        exibicaoInstitucional: true,
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: /adicionar área/i }));
    await waitFor(() => {
      expect(screen.getByText('Direito Trabalhista')).toBeInTheDocument();
    });

    // Alternar exibição quando há mais de uma área na lista
    fireEvent.click(
      screen.getByRole('switch', { name: 'Exibir Direito Civil no site' })
    );

    // Editar área existente
    fireEvent.click(screen.getByLabelText('Editar Direito Civil'));
    expect(screen.getByText('Editar área de atuação')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/título da área/i), {
      target: { value: 'Direito Civil e Família' },
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        atuacao_id: 1,
        nome: 'Direito Civil e Família',
        descricao: 'Contratos e obrigações',
        exibicaoInstitucional: true,
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: /salvar área/i }));
    await waitFor(() => {
      expect(screen.getByText('Direito Civil e Família')).toBeInTheDocument();
    });

    // Modal de exclusão: abrir e fechar pelo botão Cancelar
    fireEvent.click(screen.getByLabelText('Excluir Direito Civil e Família'));
    expect(screen.getByText('Excluir área de atuação?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByText('Excluir área de atuação?')
    ).not.toBeInTheDocument();

    // Abrir e fechar pelo botão X (Fechar)
    fireEvent.click(screen.getByLabelText('Excluir Direito Civil e Família'));
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(
      screen.queryByText('Excluir área de atuação?')
    ).not.toBeInTheDocument();

    // Abrir e fechar clicando no overlay (e testar clique no próprio modal)
    fireEvent.click(screen.getByLabelText('Excluir Direito Civil e Família'));
    const deleteDialog = screen.getByRole('dialog');
    fireEvent.click(deleteDialog);
    expect(screen.getByText('Excluir área de atuação?')).toBeInTheDocument();
    fireEvent.click(deleteDialog.parentElement);
    expect(
      screen.queryByText('Excluir área de atuação?')
    ).not.toBeInTheDocument();

    // Confirmar exclusão com falha na API (exibe saveError no topo)
    fireEvent.click(screen.getByLabelText('Excluir Direito Trabalhista'));
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Erro ao remover área' }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir área' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Erro ao remover área'
      );
    });

    // Confirmar exclusão com sucesso
    fireEvent.click(screen.getByLabelText('Excluir Direito Trabalhista'));
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir área' }));
    await waitFor(() => {
      expect(screen.queryByText('Direito Trabalhista')).not.toBeInTheDocument();
    });
  });

  it('altera cores primária e secundária via seletor nativo e input hexadecimal na aba Cores', () => {
    renderSiteClient({
      initialData: {
        ...mockInitialData,
        nomeEscritorio: '',
        corPrimaria: 'invalida',
        corSecundaria: '',
      },
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Cores' }));

    const nativePrimaria = screen.getByLabelText('Selecionar cor primária');
    const hexPrimaria = screen.getByLabelText(
      'Cor primária (fundo, navbar, rodapé)'
    );
    const nativeSecundaria = screen.getByLabelText('Selecionar cor de acento');
    const hexSecundaria = screen.getByLabelText(
      'Cor de acento (botões, ícones, destaques)'
    );

    fireEvent.change(nativePrimaria, { target: { value: '#112233' } });
    expect(hexPrimaria).toHaveValue('#112233');

    fireEvent.change(hexPrimaria, { target: { value: '#445566' } });
    expect(hexPrimaria).toHaveValue('#445566');

    fireEvent.change(nativeSecundaria, { target: { value: '#aabbcc' } });
    expect(hexSecundaria).toHaveValue('#AABBCC');

    fireEvent.change(hexSecundaria, { target: { value: '#DDEEFF' } });
    expect(hexSecundaria).toHaveValue('#DDEEFF');
  });

  it('renderiza diferentes formatos de cargo na aba Equipe no Site', () => {
    renderSiteClient({
      initialTeam: [
        {
          funcionario_id: 1,
          nome: 'Advogado Cargo Objeto Nome',
          cargo: { nome: 'Sócio' },
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 2,
          nome: 'Advogado Cargo Objeto NomeCargo',
          cargo: { nome_cargo: 'Pleno' },
          exibicaoInstitucional: false,
        },
        {
          funcionario_id: 3,
          nome: 'Advogado Cargo Vazio',
          cargo: {},
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 4,
          nome: 'Advogado Sem Cargo',
          cargo: null,
          exibicaoInstitucional: false,
        },
      ],
    });

    fireEvent.click(screen.getByRole('tab', { name: /equipe no site/i }));
    expect(screen.getByText('Sócio')).toBeInTheDocument();
    expect(screen.getByText('Pleno')).toBeInTheDocument();
    expect(screen.getByText('Advogado Cargo Vazio')).toBeInTheDocument();
    expect(screen.getByText('Advogado Sem Cargo')).toBeInTheDocument();
  });

  it('salva os dados via HTTP PUT /institucional com sucesso e exibe confirmação', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockInitialData,
        descricao: 'Slogan alterado',
      }),
    });

    renderSiteClient();

    fireEvent.click(screen.getByRole('tab', { name: 'Conteúdo' }));
    const inputDescricao = screen.getByLabelText('Slogan / subtítulo do hero');
    fireEvent.change(inputDescricao, { target: { value: 'Slogan alterado' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/institucional$/),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token-admin-site',
          }),
          body: expect.stringContaining('"descricao":"Slogan alterado"'),
        })
      );
      expect(
        screen.getByText('Configurações do site salvas com sucesso!')
      ).toBeInTheDocument();
    });
  });

  it.each([
    {
      cenario: 'erro 400 com mensagem detalhada do backend',
      status: 400,
      payload: { detail: 'Falha ao conectar no servidor' },
      expectedAlert: 'Falha ao conectar no servidor',
    },
    {
      cenario: 'erro 422 de validação nos campos institucionais',
      status: 422,
      payload: { detail: 'E-mail institucional inválido.' },
      expectedAlert: 'E-mail institucional inválido.',
    },
    {
      cenario: 'erro 500 interno sem detail estruturado',
      status: 500,
      payload: {},
      expectedAlert: 'Não foi possível salvar as configurações do site.',
    },
  ])(
    'exibe alerta de erro ao salvar configurações quando ocorre $cenario',
    async ({ status, payload, expectedAlert }) => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => payload,
      });

      renderSiteClient();

      fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/institucional$/),
          expect.objectContaining({ method: 'PUT' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(expectedAlert);
      });
    }
  );

  it('bloqueia o acesso caso o usuário não seja administrador', () => {
    renderSiteClient({ isAdmin: false });

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(
      screen.getByText(/apenas administradores possuem permissão/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Conteúdo' })
    ).not.toBeInTheDocument();
  });

  it('permite alternar visibilidade da equipe e áreas e sincronizar via PATCH na API', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockInitialData,
    });

    renderSiteClient();

    fireEvent.click(screen.getByRole('tab', { name: 'Áreas de Atuação' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Exibir Direito Civil no site' })
    );

    fireEvent.click(screen.getByRole('tab', { name: /equipe no site/i }));
    const toggleAlexandre = screen.getByRole('switch', {
      name: 'Exibir Dr. Alexandre Carreiro no site',
    });
    fireEvent.click(toggleAlexandre);

    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Configurações do site salvas com sucesso!')
      ).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/funcionarios\/1\/exibicao-institucional$/),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ exibicaoInstitucional: false }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/atuacoes\/1\/exibicao-institucional$/),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ exibicaoInstitucional: false }),
      })
    );
  });

  it('cobre utilitários de institucional e fallbacks de erro nos serviços de institucional e atuações', async () => {
    // formatParagraphs
    expect(formatParagraphs('')).toEqual([]);
    expect(formatParagraphs(null)).toEqual([]);
    expect(formatParagraphs('Linha 1\n\nLinha 2\n  ')).toEqual([
      'Linha 1',
      'Linha 2',
    ]);

    // getImageUrl
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(123)).toBe(123);

    process.env.NEXT_PUBLIC_MINIO_INTERNAL = 'http://minio:9000';
    process.env.NEXT_PUBLIC_MINIO_EXTERNAL = 'http://localhost:9000';
    process.env.NEXT_PUBLIC_MINIO_ALIAS = 'minio://';
    process.env.NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL = 'https://cdn.adv.br/';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    expect(getImageUrl('http://minio:9000/img.png')).toBe(
      'http://localhost:9000/img.png'
    );
    expect(getImageUrl('minio://bucket/img.png')).toBe(
      'https://cdn.adv.br/bucket/img.png'
    );
    expect(getImageUrl('/uploads/img.png')).toBe(
      'http://localhost:8000/uploads/img.png'
    );
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getImageUrl('/uploads/img.png')).toBe('/uploads/img.png');
    expect(getImageUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png'
    );

    // buscarDadosInstitucionais fallbacks
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await buscarDadosInstitucionais()).toEqual(
      expect.objectContaining({ corPrimaria: '#1B2A4A' })
    );

    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    expect(await buscarDadosInstitucionais()).toEqual(
      expect.objectContaining({ corPrimaria: '#1B2A4A' })
    );

    // salvarDadosInstitucionais fallback de erro de rede ('fetch') e erro sem JSON válido
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
    const fallbackSaved = await salvarDadosInstitucionais({
      nomeEscritorio: 'Offline',
    });
    expect(fallbackSaved.nomeEscritorio).toBe('Offline');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Bad JSON');
      },
    });
    await expect(
      salvarDadosInstitucionais({ nomeEscritorio: 'Erro' })
    ).rejects.toThrow('Não foi possível salvar as configurações do site.');

    // uploadImagemInstitucional fallbacks (sem data.url e com erro HTTP)
    const dummyFile = new File(['x'], 'logo.png', { type: 'image/png' });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    expect(await uploadImagemInstitucional(dummyFile, 'logo')).toBe(
      'blob:mock-url'
    );

    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await uploadImagemInstitucional(dummyFile)).toBe('blob:mock-url');

    // listarAtuacoes fallbacks
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await listarAtuacoes()).toEqual([]);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ naoArray: true }),
    });
    expect(await listarAtuacoes()).toEqual([]);

    global.fetch.mockRejectedValueOnce(new Error('Network fail'));
    expect(await listarAtuacoes()).toEqual([]);

    // criarAtuacao, atualizarAtuacao, mudarExibicaoAtuacao, excluirAtuacao erros sem detail / JSON inválido
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });
    await expect(criarAtuacao({ nome: 'Teste' })).rejects.toThrow(
      'Não foi possível cadastrar a área de atuação.'
    );

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });
    await expect(atualizarAtuacao(1, { nome: 'Teste' })).rejects.toThrow(
      'Não foi possível atualizar a área de atuação.'
    );

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });
    await expect(mudarExibicaoAtuacao(1, true)).rejects.toThrow(
      'Não foi possível alterar a exibição da área de atuação.'
    );

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });
    await expect(excluirAtuacao(1)).rejects.toThrow(
      'Não foi possível excluir a área de atuação.'
    );
  });
});
