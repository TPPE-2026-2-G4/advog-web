import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from './useAuth';

function AuthConsumer() {
  const context = useAuth();

  return createElement(
    'output',
    { 'data-testid': 'context' },
    String(Boolean(context))
  );
}

describe('useAuth', () => {
  it('retorna o contexto quando usado dentro do AuthProvider', () => {
    const { getByTestId } = render(
      createElement(AuthProvider, null, createElement(AuthConsumer))
    );

    expect(getByTestId('context')).toHaveTextContent('true');
  });

  it('lança um erro quando usado fora do AuthProvider', () => {
    expect(() => render(createElement(AuthConsumer))).toThrow(
      'useAuth deve ser usado dentro de um AuthProvider'
    );
  });
});
