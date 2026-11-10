import { describe, expect, it } from 'vitest';
import {
  createEmptyPermission,
  getPermissionLabel,
  PERMISSION_LABELS,
  PERMISSOES_IMPLICADAS,
  togglePermission,
} from './permissions';

describe('metadados visuais de permissões', () => {
  it('cria o objeto inicial com os dez campos desabilitados e independentes', () => {
    const permission = createEmptyPermission();

    expect(Object.keys(permission)).toEqual(Object.keys(PERMISSION_LABELS));
    expect(Object.values(permission)).toHaveLength(10);
    expect(Object.values(permission).every((value) => value === false)).toBe(
      true
    );
    expect(permission).not.toBe(createEmptyPermission());
  });

  it('ativa automaticamente a permissão de visualização ao marcar gerenciar', () => {
    for (const [gerenciar, visualizar] of Object.entries(
      PERMISSOES_IMPLICADAS
    )) {
      const initial = createEmptyPermission();
      expect(initial[gerenciar]).toBe(false);
      expect(initial[visualizar]).toBe(false);

      const updated = togglePermission(initial, gerenciar);
      expect(updated[gerenciar]).toBe(true);
      expect(updated[visualizar]).toBe(true);
    }
  });

  it('desmarca gerenciar sem alterar visualização ao desmarcar gerenciar', () => {
    const initial = {
      ...createEmptyPermission(),
      gerenciar_processos: true,
      visualizar_processos: true,
    };
    const updated = togglePermission(initial, 'gerenciar_processos');
    expect(updated.gerenciar_processos).toBe(false);
    expect(updated.visualizar_processos).toBe(true);
  });

  it.each([
    {
      cenario: 'campo conhecido (visualizar_processos)',
      chave: 'visualizar_processos',
      esperado: 'Visualizar processos',
    },
    {
      cenario: 'campo conhecido com acentuação (configuracoes_sistema)',
      chave: 'configuracoes_sistema',
      esperado: 'Configurações do sistema',
    },
    {
      cenario: 'campo dinâmico não mapeado vindo do backend',
      chave: 'exportar_relatorios',
      esperado: 'Exportar relatorios',
    },
    {
      cenario: 'campo dinâmico com múltiplos underscores',
      chave: 'gerenciar_usuarios_externos',
      esperado: 'Gerenciar usuarios externos',
    },
  ])(
    'getPermissionLabel retorna "$esperado" para $cenario',
    ({ chave, esperado }) => {
      expect(getPermissionLabel(chave)).toBe(esperado);
    }
  );
});
