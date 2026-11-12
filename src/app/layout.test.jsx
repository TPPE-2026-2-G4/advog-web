import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout, { metadata } from './layout';

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: 'inter-font' }),
  Cormorant_Garamond: () => ({ variable: 'cormorant-font' }),
}));

describe('RootLayout', () => {
  it.each([
    { texto: 'child content', tag: 'p' },
    { texto: 'Conteúdo principal da aplicação', tag: 'main' },
  ])(
    'renderiza os elementos filhos ($tag: "$texto") com idioma pt-BR',
    ({ texto, tag: Tag }) => {
      render(
        <RootLayout>
          <Tag>{texto}</Tag>
        </RootLayout>
      );

      expect(screen.getByText(texto)).toBeInTheDocument();
      expect(document.documentElement).toHaveAttribute('lang', 'pt-BR');
    }
  );

  describe('Metadados da Aplicação (SEO e Identidade Visual)', () => {
    it('define o título padrão e o modelo de título como Carreiro Advocacia', () => {
      expect(metadata.title).toEqual({
        default: 'Carreiro Advocacia',
        template: '%s | Carreiro Advocacia',
      });
    });

    it('define a descrição otimizada para os resultados de busca do Google', () => {
      expect(metadata.description).toBeDefined();
      expect(metadata.description).toContain('Carreiro Advocacia');
      expect(metadata.description.length).toBeGreaterThan(50);
    });

    it('configura os ícones e favicons (SVG, ICO e Apple Touch Icon)', () => {
      expect(metadata.icons).toEqual({
        icon: [
          { url: '/icon.svg', type: 'image/svg+xml' },
          { url: '/favicon.ico', sizes: 'any' },
        ],
        apple: [
          { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      });
    });

    it('configura OpenGraph e robots para indexação adequada', () => {
      expect(metadata.openGraph.siteName).toBe('Carreiro Advocacia');
      expect(metadata.openGraph.locale).toBe('pt_BR');
      expect(metadata.robots.index).toBe(true);
      expect(metadata.robots.follow).toBe(true);
    });
  });
});
