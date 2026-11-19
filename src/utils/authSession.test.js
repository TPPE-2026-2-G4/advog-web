import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_SESSION_EVENT,
  clearAuthSession,
  getAccessToken,
  getCurrentUser,
  syncCurrentUserMemberRole,
  syncCurrentUserRolePermissions,
  syncSessionWithLocalStorage,
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

  describe('sessão única entre abas e validação por sub', () => {
    const buildJwt = (payload) =>
      `header.${btoa(JSON.stringify(payload))}.signature`;

    it('descarta usuário armazenado quando sub numérico no JWT diverge de funcionario_id', () => {
      sessionStorage.setItem(
        'access_token',
        buildJwt({ sub: '9', nome: 'Davi' })
      );
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 1,
          email: 'admin@advog.com',
          nome: 'Administrador',
        })
      );

      expect(getCurrentUser()).toBeNull();
      expect(sessionStorage.getItem('current_user')).toBeNull();
    });

    it('descarta usuário armazenado quando sub é um e-mail diferente do usuário salvo', () => {
      sessionStorage.setItem(
        'access_token',
        buildJwt({ sub: 'davi@carreiro.adv.br' })
      );
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 1,
          email: 'admin@carreiro.adv.br',
          nome: 'Administrador',
        })
      );

      const user = getCurrentUser();
      expect(user.email).toBe('davi@carreiro.adv.br');
      expect(user.funcionario_id).toBeUndefined();
    });

    it('sincroniza a aba quando auth_active_token no localStorage muda para outra conta', () => {
      const tokenAdmin = buildJwt({ sub: '1', email: 'admin@adv.br' });
      const tokenDavi = buildJwt({ sub: '5', email: 'davi@adv.br' });

      sessionStorage.setItem('auth_active_token', tokenAdmin);
      sessionStorage.setItem('access_token', tokenAdmin);
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 1,
          email: 'admin@adv.br',
          nome: 'Admin',
        })
      );

      localStorage.setItem('auth_active_token', tokenDavi);
      localStorage.setItem('access_token', tokenDavi);
      localStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 5,
          email: 'davi@adv.br',
          nome: 'Davi',
        })
      );

      expect(getAccessToken()).toBe(tokenDavi);
      expect(getCurrentUser()).toEqual({
        funcionario_id: 5,
        email: 'davi@adv.br',
        nome: 'Davi',
      });
    });

    it('limpa o sessionStorage da aba quando a sessão ativa no localStorage é encerrada', () => {
      sessionStorage.setItem('auth_active_token', 'tok-admin');
      sessionStorage.setItem('access_token', 'tok-admin');
      sessionStorage.setItem('current_user', JSON.stringify({ nome: 'Admin' }));

      expect(getAccessToken()).toBeNull();
      expect(sessionStorage.getItem('current_user')).toBeNull();
    });

    it('sincroniza sessionStorage via syncSessionWithLocalStorage para eventos StorageEvent', () => {
      localStorage.setItem('auth_active_token', 'tok-davi');
      localStorage.setItem('access_token', 'tok-davi');
      localStorage.setItem('current_user', JSON.stringify({ nome: 'Davi' }));

      syncSessionWithLocalStorage(
        new StorageEvent('storage', {
          key: 'auth_active_token',
          newValue: 'tok-davi',
        })
      );

      expect(sessionStorage.getItem('access_token')).toBe('tok-davi');
      expect(JSON.parse(sessionStorage.getItem('current_user'))).toEqual({
        nome: 'Davi',
      });

      // Ignora chaves não relacionadas
      syncSessionWithLocalStorage(
        new StorageEvent('storage', {
          key: 'institucional_data',
          newValue: '{}',
        })
      );
      expect(sessionStorage.getItem('access_token')).toBe('tok-davi');

      // Remove apenas current_user quando current_user é apagado
      localStorage.removeItem('current_user');
      syncSessionWithLocalStorage(
        new StorageEvent('storage', { key: 'current_user', newValue: null })
      );
      expect(sessionStorage.getItem('current_user')).toBeNull();

      // Limpa toda a aba quando access_token/auth_active_token é apagado ou localStorage é limpo
      localStorage.clear();
      syncSessionWithLocalStorage(
        new StorageEvent('storage', { key: null, newValue: null })
      );
      expect(sessionStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('sincronização instantânea de cargos e permissões', () => {
    it('atualiza current_user nos storages e dispara evento quando o cargo do usuário tem permissões alteradas', () => {
      const listener = vi.fn();
      window.addEventListener(AUTH_SESSION_EVENT, listener);

      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 5,
          email: 'davi@adv.br',
          nome: 'Davi',
          cargo_id: 2,
          cargo: {
            cargo_id: 2,
            nome_cargo: 'Advogado',
            permissao: {
              visualizar_equipe: true,
              gerenciar_equipe: true,
              visualizar_financeiro: false,
            },
          },
          permissoes: ['visualizar_equipe', 'gerenciar_equipe'],
        })
      );

      const updatedUser = syncCurrentUserRolePermissions({
        cargo_id: 2,
        nome_cargo: 'Advogado',
        permissao: {
          visualizar_equipe: true,
          gerenciar_equipe: false,
          visualizar_financeiro: true,
        },
      });

      expect(updatedUser.cargo.permissao).toEqual({
        visualizar_equipe: true,
        gerenciar_equipe: false,
        visualizar_financeiro: true,
      });
      expect(updatedUser.permissoes).toEqual([
        'visualizar_equipe',
        'visualizar_financeiro',
      ]);
      expect(listener).toHaveBeenCalled();
      expect(getCurrentUser().cargo.permissao.visualizar_financeiro).toBe(true);
      expect(
        JSON.parse(localStorage.getItem('current_user')).cargo.permissao
          .gerenciar_equipe
      ).toBe(false);

      window.removeEventListener(AUTH_SESSION_EVENT, listener);
    });

    it('identifica o cargo do usuário via contextMembers quando cargo_id não está no current_user', () => {
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 5,
          email: 'davi@adv.br',
          nome: 'Davi',
        })
      );

      const updatedUser = syncCurrentUserRolePermissions(
        {
          cargo_id: 3,
          nome_cargo: 'Estagiário',
          permissao: { visualizar_processos: true },
        },
        [{ funcionario_id: 5, email_func: 'davi@adv.br', cargo_id: 3 }]
      );

      expect(updatedUser.cargo.permissao).toEqual({
        visualizar_processos: true,
      });
    });

    it('não altera current_user quando o cargo editado pertence a outro perfil', () => {
      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 1,
          email: 'admin@adv.br',
          cargo: { cargo_id: 1, nome_cargo: 'Administrador' },
        })
      );

      const res = syncCurrentUserRolePermissions({
        cargo_id: 2,
        nome_cargo: 'Advogado',
        permissao: { visualizar_processos: false },
      });

      expect(res).toBeNull();
      expect(getCurrentUser().cargo.nome_cargo).toBe('Administrador');
    });

    it('atualiza cargo e permissões imediatamente quando o cargo do próprio usuário logado é alterado', () => {
      const listener = vi.fn();
      window.addEventListener(AUTH_SESSION_EVENT, listener);

      sessionStorage.setItem(
        'current_user',
        JSON.stringify({
          funcionario_id: 5,
          email: 'davi@adv.br',
          nome: 'Davi',
          cargo_id: 3,
          cargo: {
            cargo_id: 3,
            nome_cargo: 'Estagiário',
            permissao: { visualizar_processos: true },
          },
        })
      );

      const updatedUser = syncCurrentUserMemberRole(
        { funcionario_id: 5, email_func: 'davi@adv.br' },
        { funcionario_id: 5, cargo_id: 2 },
        {
          cargo_id: 2,
          nome_cargo: 'Advogado',
          permissao: {
            visualizar_processos: true,
            gerenciar_financeiro: true,
          },
        }
      );

      expect(updatedUser.cargo_id).toBe(2);
      expect(updatedUser.cargo.nome_cargo).toBe('Advogado');
      expect(updatedUser.cargo.permissao).toEqual({
        visualizar_processos: true,
        gerenciar_financeiro: true,
      });
      expect(listener).toHaveBeenCalled();

      // Não altera se for outro funcionário
      expect(
        syncCurrentUserMemberRole({ funcionario_id: 99 }, { cargo_id: 3 })
      ).toBeNull();

      window.removeEventListener(AUTH_SESSION_EVENT, listener);
    });
  });
});
