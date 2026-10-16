import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';
import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  listarFuncionarios: vi.fn(),
}));

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listarFuncionarios.mockResolvedValue([]);
    buscarDadosInstitucionais.mockResolvedValue({});
  });

  describe('Sobre o Escritório', () => {
    it('renderiza o título, textos e imagem fornecidos pela API', async () => {
      buscarDadosInstitucionais.mockResolvedValue({
        sobreEscritorio: 'Texto mockado para teste.\nSegundo parágrafo.',
        imagemSobre: 'http://mock.com/imagem.jpg',
      });

      const jsx = await Home();
      render(jsx);

      expect(
        screen.getByRole('heading', { name: 'Sobre o Escritório' })
      ).toBeInTheDocument();
      expect(screen.getByText('Texto mockado para teste.')).toBeInTheDocument();
      expect(screen.getByText('Segundo parágrafo.')).toBeInTheDocument();

      const img = screen.getByAltText('Imagem do escritório');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://mock.com/imagem.jpg');
    });

    it('renderiza textos padrao e placeholder quando dados estão ausentes', async () => {
      buscarDadosInstitucionais.mockResolvedValue({
        sobreEscritorio: null,
        imagemSobre: null,
      });

      const jsx = await Home();
      render(jsx);

      expect(
        screen.getByRole('heading', { name: 'Sobre o Escritório' })
      ).toBeInTheDocument();

      // Nenhum parágrafo deve ser renderizado quando não há dados
      const paragraphsContainer =
        document.querySelector('._paragraphs_328416') ||
        document.querySelector('div[class*="paragraphs"]');
      if (paragraphsContainer) {
        expect(paragraphsContainer.children.length).toBe(0);
      }

      // Placeholder e ícone devem aparecer em vez da tag de imagem
      expect(
        screen.queryByAltText('Imagem do escritório')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Imagem do escritório')).toBeInTheDocument(); // Texto do placeholder
    });
  });

  describe('Nossa Equipe', () => {
    it('renderiza a seção Nossa Equipe corretamente', async () => {
      buscarDadosInstitucionais.mockResolvedValue({
        textoEquipe: 'Conheça nossos especialistas.',
      });

      listarFuncionarios.mockResolvedValue([
        {
          funcionario_id: 1,
          nome: 'Dr. Pedro Lima',
          cargo: { nome: 'Advogado Júnior · Direito Tributário' },
          uf_oab: 'DF',
          numero_oab: '34.567',
          exibicaoInstitucional: true,
        },
      ]);

      const jsx = await Home();
      render(jsx);

      expect(
        screen.getByRole('heading', { name: 'Nossa Equipe' })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Conheça nossos especialistas.')
      ).toBeInTheDocument();
      expect(screen.getByText('Dr. Pedro Lima')).toBeInTheDocument();
      expect(screen.getByText('Advogado Júnior')).toBeInTheDocument();
      expect(screen.getByText('Direito Tributário')).toBeInTheDocument();
      expect(screen.getByText('OAB/DF 34.567')).toBeInTheDocument();
      expect(screen.getByText('PL')).toBeInTheDocument(); // Iniciais
    });

    it('renderiza membro com cargo, especialidade/descrição e OAB formatada conforme o layout', async () => {
      buscarDadosInstitucionais.mockResolvedValue({});
      listarFuncionarios.mockResolvedValue([
        {
          funcionario_id: 1,
          nome: 'Dr. Alexandre Carreiro',
          cargo: {
            nome_cargo: 'Sócio Fundador',
            descricao: 'Direito Trabalhista e Civil',
          },
          uf_oab: 'DF',
          numero_oab: '12345',
          exibicaoInstitucional: true,
        },
        {
          funcionario_id: 2,
          nome: 'Lucas Silva',
          cargo: { nome_cargo: 'Estagiário' },
          uf_oab: null,
          numero_oab: null,
          exibicaoInstitucional: true,
        },
      ]);

      const jsx = await Home();
      render(jsx);

      expect(screen.getByText('Dr. Alexandre Carreiro')).toBeInTheDocument();
      expect(screen.getByText('Sócio Fundador')).toBeInTheDocument();
      expect(
        screen.getByText('Direito Trabalhista e Civil')
      ).toBeInTheDocument();
      expect(screen.getByText('OAB/DF 12.345')).toBeInTheDocument();

      expect(screen.getByText('Lucas Silva')).toBeInTheDocument();
      expect(screen.getByText('Estagiário')).toBeInTheDocument();
      // Estagiário não deve ter texto de OAB associado
      expect(screen.queryByText(/OAB.*null/i)).not.toBeInTheDocument();
      expect(screen.getAllByText(/OAB\//i)).toHaveLength(1);
    });

    it('não renderiza a seção Nossa Equipe se não houver membros visíveis', async () => {
      buscarDadosInstitucionais.mockResolvedValue({});
      listarFuncionarios.mockResolvedValue([]);

      const jsx = await Home();
      render(jsx);

      expect(
        screen.queryByRole('heading', { name: 'Nossa Equipe' })
      ).not.toBeInTheDocument();
    });

    it.each([
      [
        'textoEquipe',
        { textoEquipe: 'Equipe especializada' },
        'Equipe especializada',
      ],
      [
        'descricaoEquipe',
        { descricaoEquipe: 'Advogados comprometidos' },
        'Advogados comprometidos',
      ],
      [
        'sobreEquipe',
        { sobreEquipe: 'Time jurídico de elite' },
        'Time jurídico de elite',
      ],
      [
        'default fallback',
        {},
        'Profissionais qualificados e comprometidos com a excelência jurídica.',
      ],
    ])(
      'renderiza subtítulo a partir de %s',
      async (_caso, mockInstitucional, subtituloEsperado) => {
        buscarDadosInstitucionais.mockResolvedValue(mockInstitucional);
        listarFuncionarios.mockResolvedValue([
          { funcionario_id: 1, nome: 'Ana', exibicaoInstitucional: true },
        ]);

        const jsx = await Home();
        render(jsx);

        expect(screen.getByText(subtituloEsperado)).toBeInTheDocument();
      }
    );

    it.each([
      [
        'cargo string com hífen',
        { cargo: 'Advogado Sênior - Direito Penal' },
        'Advogado Sênior',
        'Direito Penal',
      ],
      [
        'cargo objeto sem separador mas com member.descricao',
        { cargo: { nome: 'Consultor' }, descricao: 'Compliance e Ética' },
        'Consultor',
        'Compliance e Ética',
      ],
      [
        'cargo objeto sem separador mas com member.especialidade',
        { cargo: { nome: 'Especialista' }, especialidade: 'Direito Digital' },
        'Especialista',
        'Direito Digital',
      ],
      [
        'cargo objeto sem separador mas com member.area',
        { cargo: { nome: 'Coordenador' }, area: 'Contratos e Societário' },
        'Coordenador',
        'Contratos e Societário',
      ],
      ['membro sem cargo informado', { cargo: null }, null, null],
    ])(
      'extrai papéis primário e secundário para %s',
      async (_caso, dadosCargo, expectedPrimary, expectedSecondary) => {
        buscarDadosInstitucionais.mockResolvedValue({});
        listarFuncionarios.mockResolvedValue([
          {
            funcionario_id: 10,
            nome: 'Carlos Santos',
            exibicaoInstitucional: true,
            ...dadosCargo,
          },
        ]);

        const jsx = await Home();
        render(jsx);

        if (expectedPrimary) {
          expect(screen.getByText(expectedPrimary)).toBeInTheDocument();
        }
        if (expectedSecondary) {
          expect(screen.getByText(expectedSecondary)).toBeInTheDocument();
        }
      }
    );

    it('renderiza as seções Sobre o Escritório e Nossa Equipe com seus respectivos containers e classes', async () => {
      buscarDadosInstitucionais.mockResolvedValue({
        sobreEscritorio: 'História do escritório.',
      });
      listarFuncionarios.mockResolvedValue([
        {
          funcionario_id: 1,
          nome: 'Dra. Maria',
          exibicaoInstitucional: true,
        },
      ]);

      const jsx = await Home();
      render(jsx);

      const sobreHeading = screen.getByRole('heading', {
        name: 'Sobre o Escritório',
      });
      const equipeHeading = screen.getByRole('heading', {
        name: 'Nossa Equipe',
      });

      const sobreSection = sobreHeading.closest('section');
      const equipeSection = equipeHeading.closest('section');

      expect(sobreSection).toBeInTheDocument();
      expect(equipeSection).toBeInTheDocument();
      expect(sobreSection).not.toBe(equipeSection);
    });
  });
});
