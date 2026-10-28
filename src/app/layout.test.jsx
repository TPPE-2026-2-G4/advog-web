import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout from './layout';

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
});
