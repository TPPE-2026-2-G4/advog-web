import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';
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
  it.each([
    {
      cenario: 'dentro do AuthProvider padrão',
      renderElement: () =>
        createElement(AuthProvider, null, createElement(AuthConsumer)),
    },
    {
      cenario: 'dentro de um AuthContext.Provider com valor definido',
      renderElement: () =>
        createElement(
          AuthContext.Provider,
          { value: { user: { id: 1 }, isAuthenticated: true } },
          createElement(AuthConsumer)
        ),
    },
  ])('retorna o contexto quando usado $cenario', ({ renderElement }) => {
    const { getByTestId } = render(renderElement());

    expect(getByTestId('context')).toHaveTextContent('true');
  });

  it.each([
    {
      cenario: 'fora do AuthProvider',
      renderElement: () => createElement(AuthConsumer),
    },
    {
      cenario: 'com contexto nulo no Provider',
      renderElement: () =>
        createElement(
          AuthContext.Provider,
          { value: null },
          createElement(AuthConsumer)
        ),
    },
  ])('lança um erro quando usado $cenario', ({ renderElement }) => {
    expect(() => render(renderElement())).toThrow(
      'useAuth deve ser usado dentro de um AuthProvider'
    );
  });
});
