import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';
import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarAtuacoes } from '@/services/atuacoes';

vi.mock('@/services/institucional', () => ({
  buscarDadosInstitucionais: vi.fn(),
}));

vi.mock('@/services/atuacoes', () => ({
  listarAtuacoes: vi.fn(),
}));

describe('Landing Page - Sobre o Escritório e Áreas de Atuação', () => {
  it('renderiza o título, textos, imagem e áreas de atuação visíveis fornecidos pela API', async () => {
    buscarDadosInstitucionais.mockResolvedValue({
      sobreEscritorio: 'Texto mockado para teste.\nSegundo parágrafo.',
      imagemSobre: 'http://mock.com/imagem.jpg',
    });
    listarAtuacoes.mockResolvedValue([
      {
        atuacao_id: 1,
        titulo: 'Direito Civil',
        descricao: 'Contratos e obrigações.',
        exibicaoInstitucional: true,
      },
      {
        atuacao_id: 2,
        nome: 'Direito Trabalhista',
        descricao: 'Defesa trabalhista.',
        exibicaoInstitucional: true,
      },
      {
        atuacao_id: 3,
        nome: 'Direito Oculto',
        descricao: 'Não deve aparecer.',
        exibicaoInstitucional: false,
      },
    ]);

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

    expect(
      screen.getByRole('heading', { name: 'Áreas de Atuação' })
    ).toBeInTheDocument();
    expect(screen.getByText('Direito Civil')).toBeInTheDocument();
    expect(screen.getByText('Direito Trabalhista')).toBeInTheDocument();
    expect(screen.queryByText('Direito Oculto')).not.toBeInTheDocument();
  });

  it('renderiza textos padrão e oculta seção de áreas quando não há áreas visíveis', async () => {
    buscarDadosInstitucionais.mockResolvedValue({
      sobreEscritorio: null,
      imagemSobre: null,
    });
    listarAtuacoes.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(
      screen.getByRole('heading', { name: 'Sobre o Escritório' })
    ).toBeInTheDocument();

    const paragraphsContainer =
      document.querySelector('._paragraphs_328416') ||
      document.querySelector('div[class*="paragraphs"]');
    if (paragraphsContainer) {
      expect(paragraphsContainer.children.length).toBe(0);
    }

    expect(
      screen.queryByAltText('Imagem do escritório')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Imagem do escritório')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Áreas de Atuação' })
    ).not.toBeInTheDocument();
  });
});
