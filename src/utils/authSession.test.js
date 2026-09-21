import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccessToken, getCurrentUser } from './authSession';

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
  });
});
