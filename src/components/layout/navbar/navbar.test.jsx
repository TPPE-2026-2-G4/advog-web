import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from './navbar';

describe('Navbar', () => {
  it('renderiza o botão de notificações e a quantidade de notificações', () => {
    render(<Navbar />);

    expect(
      screen.getByRole('button', { name: 'Notificações' })
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renderiza o divisor e o menu do usuário', () => {
    const { container } = render(<Navbar />);

    expect(container.querySelector('[class*="divider"]')).toBeInTheDocument();
    expect(screen.getByText('Alexandre C.')).toBeInTheDocument();
  });

  it('mantém o menu do usuário fechado inicialmente', () => {
    render(<Navbar />);

    expect(screen.queryByText('Alexandre Carreiro')).not.toBeInTheDocument();
  });
});
