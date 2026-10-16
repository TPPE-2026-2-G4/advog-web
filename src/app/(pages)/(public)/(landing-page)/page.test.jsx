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

    it('não renderiza a seção Nossa Equipe se não houver membros visíveis', async () => {
      buscarDadosInstitucionais.mockResolvedValue({});
      listarFuncionarios.mockResolvedValue([]);

      const jsx = await Home();
      render(jsx);

      expect(
        screen.queryByRole('heading', { name: 'Nossa Equipe' })
      ).not.toBeInTheDocument();
    });
  });
});
