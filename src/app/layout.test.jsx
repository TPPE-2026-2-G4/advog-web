import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RootLayout from './layout';

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: 'inter-font' }),
  Cormorant_Garamond: () => ({ variable: 'cormorant-font' }),
}));

describe('RootLayout', () => {
  it('renders its children', () => {
    render(
      <RootLayout>
        <p>child content</p>
      </RootLayout>
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders the document with the Portuguese language', () => {
    render(
      <RootLayout>
        <p>child content</p>
      </RootLayout>
    );

    expect(document.documentElement).toHaveAttribute('lang', 'pt-BR');
  });
});
