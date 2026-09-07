import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './statCard';

const IconeDeTeste = ({ size, color }) => (
  <span data-testid="icone-teste" data-size={size} data-color={color} />
);

describe('StatCard', () => {
  it.each([
    ['Total de usuários', 0],
    ['Usuários ativos', 12],
    ['Usuários pendentes', 'não informado'],
  ])('renderiza o título %s e o valor %s', (title, value) => {
    render(<StatCard title={title} value={value} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(String(value))).toBeInTheDocument();
  });

  it('renderiza o ícone quando ele é fornecido', () => {
    render(<StatCard title="Total" value={10} icon={IconeDeTeste} />);

    expect(screen.getByTestId('icone-teste')).toBeInTheDocument();
  });

  it('não renderiza um ícone quando ele não é fornecido', () => {
    render(<StatCard title="Total" value={10} />);

    expect(screen.queryByTestId('icone-teste')).not.toBeInTheDocument();
  });

  it.each([
    ['#C1A077', '#111827'],
    ['#166534', '#166534'],
    ['rgb(10, 20, 30)', 'rgb(40, 50, 60)'],
  ])(
    'usa as cores padrão ou customizadas do ícone e do valor: %s e %s',
    (iconColor, valueColor) => {
      render(
        <StatCard
          title="Usuários"
          value={8}
          icon={IconeDeTeste}
          iconColor={iconColor}
          valueColor={valueColor}
        />
      );

      const icon = screen.getByTestId('icone-teste');
      const value = screen.getByText('8');

      expect(icon).toHaveAttribute('data-size', '20');
      expect(icon).toHaveAttribute('data-color', iconColor);
      expect(value).toHaveStyle({ color: valueColor });
    }
  );

  it('usa as cores padrão quando elas não são fornecidas', () => {
    render(<StatCard title="Usuários" value={8} icon={IconeDeTeste} />);

    expect(screen.getByTestId('icone-teste')).toHaveAttribute(
      'data-color',
      '#C1A077'
    );
    expect(screen.getByText('8')).toHaveStyle({ color: '#111827' });
  });

  it('renderiza somente um card com a estrutura principal', () => {
    render(<StatCard title="Total" value={5} />);

    expect(screen.getByText('Total').closest('div')).toBeInTheDocument();
    expect(screen.getByText('5').tagName).toBe('P');
  });
});
