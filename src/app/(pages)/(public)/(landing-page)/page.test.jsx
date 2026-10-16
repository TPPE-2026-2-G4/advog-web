import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';
import { buscarDadosInstitucionais } from '@/services/institucional';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

describe('Landing Page - Sobre o Escritório', () => {
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
