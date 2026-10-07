import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessosPage from './page';

vi.mock('./processosClient', () => ({
  default: () => <output data-testid="processos-client" />,
}));

describe('ProcessosPage', () => {
  it('delega a carga autenticada ao componente cliente', () => {
    render(<ProcessosPage />);
    expect(screen.getByTestId('processos-client')).toBeInTheDocument();
  });
});
