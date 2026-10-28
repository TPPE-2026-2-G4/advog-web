import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingDots from './LoadingDots';
import styles from './LoadingDots.module.css';

describe('LoadingDots', () => {
  it('renderiza o container acessível de carregamento com três pontos animados', () => {
    const { container } = render(<LoadingDots />);

    const status = screen.getByRole('status', { name: 'Carregando' });
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass(styles.dots);

    const dots = container.querySelectorAll(`.${styles.dot}`);
    expect(dots).toHaveLength(3);
  });

  it.each([
    { index: 0, expectedExtraClass: null },
    { index: 1, expectedExtraClass: styles.delayOne },
    { index: 2, expectedExtraClass: styles.delayTwo },
  ])(
    'aplica classes de animação corretas no ponto de índice $index',
    ({ index, expectedExtraClass }) => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll(`.${styles.dot}`);

      expect(dots[index]).toHaveClass(styles.dot);
      if (expectedExtraClass) {
        expect(dots[index]).toHaveClass(expectedExtraClass);
      }
    }
  );
});
