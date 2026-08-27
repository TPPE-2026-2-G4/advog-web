import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home', () => {
  it('renders the getting started heading', () => {
    render(<Home />);

    expect(screen.getByText(/to get started, edit the/i)).toBeInTheDocument();
  });

  it('renders links to the Next.js templates and docs', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /templates/i })).toHaveAttribute(
      'href',
      expect.stringContaining('vercel.com/templates')
    );
    expect(
      screen.getByRole('link', { name: /documentation/i })
    ).toHaveAttribute('href', expect.stringContaining('nextjs.org/docs'));
  });
});
