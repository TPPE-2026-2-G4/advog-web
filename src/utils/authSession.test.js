import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
} from './authSession';

describe('authSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('getAccessToken', () => {
    it.each([
      {
        cenario: 'sessionStorage possui access_token',
        setup: () => sessionStorage.setItem('access_token', 'token-session'),
        esperado: 'token-session',
      },
      {
        cenario:
          'localStorage possui access_token quando sessionStorage está vazio',
        setup: () => localStorage.setItem('access_token', 'token-local-access'),
        esperado: 'token-local-access',
      },
      {
        cenario:
          'localStorage possui chave legada token quando demais estão vazias',
        setup: () => localStorage.setItem('token', 'token-legacy'),
        esperado: 'token-legacy',
      },
      {
        cenario: 'nenhum token está armazenado',
        setup: () => {},
        esperado: null,
      },
    ])('retorna $esperado quando $cenario', ({ setup, esperado }) => {
      setup();
      expect(getAccessToken()).toBe(esperado);
    });
  });

  describe('getCurrentUser', () => {
    it.each([
      {
        cenario: 'usuário presente no sessionStorage',
        setup: () =>
          sessionStorage.setItem(
            'current_user',
            JSON.stringify({ id: 1, nome: 'Dr. Teste' })
          ),
        esperado: { id: 1, nome: 'Dr. Teste' },
      },
      {
        cenario:
          'usuário presente no localStorage quando ausente no sessionStorage',
        setup: () =>
          localStorage.setItem(
            'current_user',
            JSON.stringify({ id: 2, nome: 'Dra. Teste' })
          ),
        esperado: { id: 2, nome: 'Dra. Teste' },
      },
      {
        cenario: 'nenhum usuário armazenado',
        setup: () => {},
        esperado: null,
      },
      {
        cenario: 'JSON armazenado em current_user é inválido',
        setup: () => sessionStorage.setItem('current_user', '{invalid_json}'),
        esperado: null,
      },
    ])(
      'retorna o resultado esperado quando $cenario',
      ({ setup, esperado }) => {
        setup();
        expect(getCurrentUser()).toEqual(esperado);
      }
    );

    it('retorna null para token e usuário em ambiente servidor sem window', () => {
      const originalWindow = globalThis.window;
      delete globalThis.window;

      expect(getAccessToken()).toBeNull();
      expect(getCurrentUser()).toBeNull();

      globalThis.window = originalWindow;
    });

    it('descarta o usuário armazenado se o token pertencer a outro email', () => {
      const tokenDavi = `header.${btoa(JSON.stringify({ sub: '5', email: 'davi@davi.com' }))}.signature`;

      sessionStorage.setItem('access_token', tokenDavi);
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 1,
          email: 'advog@advog.com',
          nome: 'Administrador',
        })
      );

      const user = getCurrentUser();
      expect(user.email).toBe('davi@davi.com');
      expect(user.nome).toBe('davi');
    });

    it('infere usuário a partir do token JWT quando não há current_user armazenado', () => {
      const token = `header.${btoa(JSON.stringify({ sub: '5', email: 'davi@davi.com', nome: 'Davi Rodrigues', cargo: 'Teste1' }))}.signature`;
      sessionStorage.setItem('access_token', token);

      const user = getCurrentUser();
      expect(user).toEqual({
        funcionario_id: 5,
        email: 'davi@davi.com',
        nome: 'Davi Rodrigues',
        cargo: 'Teste1',
      });
    });

    it.each([
      {
        cenario: 'token malformado sem pontos',
        tokenInvalido: 'token-invalido-sem-pontos',
      },
      {
        cenario: 'token com base64 inválido',
        tokenInvalido: 'header.%%%invalidbase64%%%.signature',
      },
      {
        cenario: 'token com json inválido',
        tokenInvalido: `header.${btoa('not-json')}.signature`,
      },
    ])('retorna null e trata graciosamente $cenario', ({ tokenInvalido }) => {
      sessionStorage.setItem('access_token', tokenInvalido);
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('clearAuthSession', () => {
    it('remove tokens e usuário do localStorage e sessionStorage e expira o cookie access_token', () => {
      localStorage.setItem('token', 'token-legacy');
      localStorage.setItem('access_token', 'token-access');
      localStorage.setItem('current_user', JSON.stringify({ id: 1 }));
      sessionStorage.setItem('token', 'token-session');
      sessionStorage.setItem('access_token', 'token-access-session');
      sessionStorage.setItem('current_user', JSON.stringify({ id: 1 }));
      document.cookie = 'access_token=token-cookie; path=/';

      clearAuthSession();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('current_user')).toBeNull();
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem('current_user')).toBeNull();
    });

    it('não lança erro quando executado em ambiente servidor sem window', () => {
      const originalWindow = globalThis.window;
      delete globalThis.window;

      expect(() => clearAuthSession()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });
});
