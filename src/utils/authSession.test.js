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
    it('retorna o token do sessionStorage quando presente', () => {
      sessionStorage.setItem('access_token', 'token-session');
      expect(getAccessToken()).toBe('token-session');
    });

    it('retorna o access_token do localStorage quando ausente no sessionStorage', () => {
      localStorage.setItem('access_token', 'token-local-access');
      expect(getAccessToken()).toBe('token-local-access');
    });

    it('retorna o token do localStorage quando ausente nas demais chaves', () => {
      localStorage.setItem('token', 'token-legacy');
      expect(getAccessToken()).toBe('token-legacy');
    });

    it('retorna null quando nenhum token está armazenado', () => {
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('retorna o usuário do sessionStorage quando presente', () => {
      const user = { id: 1, nome: 'Dr. Teste' };
      sessionStorage.setItem('current_user', JSON.stringify(user));
      expect(getCurrentUser()).toEqual(user);
    });

    it('retorna o usuário do localStorage quando ausente no sessionStorage', () => {
      const user = { id: 2, nome: 'Dra. Teste' };
      localStorage.setItem('current_user', JSON.stringify(user));
      expect(getCurrentUser()).toEqual(user);
    });

    it('retorna null quando nenhum usuário está armazenado', () => {
      expect(getCurrentUser()).toBeNull();
    });

    it('retorna null quando o JSON armazenado é inválido', () => {
      sessionStorage.setItem('current_user', '{invalid_json}');
      expect(getCurrentUser()).toBeNull();
    });

    it('retorna null para token e usuário em ambiente servidor sem window', () => {
      const originalWindow = globalThis.window;
      delete globalThis.window;

      expect(getAccessToken()).toBeNull();
      expect(getCurrentUser()).toBeNull();

      globalThis.window = originalWindow;
    });

    it('descarta o usuário armazenado se o token pertencer a outro email', () => {
      const payloadAdmin = btoa(
        JSON.stringify({ sub: '1', email: 'advog@advog.com' })
      );
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
      ['token malformado', 'token-invalido-sem-pontos'],
      ['token com base64 inválido', 'header.%%%invalidbase64%%%.signature'],
      ['token com json inválido', `header.${btoa('not-json')}.signature`],
    ])('retorna null e trata graciosamente %s', (_caso, tokenInvalido) => {
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
