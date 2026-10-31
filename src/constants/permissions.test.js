import { describe, expect, it } from 'vitest';
import {
  createEmptyPermission,
  getPermissionLabel,
  PERMISSION_LABELS,
} from './permissions';

describe('metadados visuais de permissões', () => {
  it('cria o objeto inicial com os nove campos desabilitados e independentes', () => {
    const permission = createEmptyPermission();

    expect(Object.keys(permission)).toEqual(Object.keys(PERMISSION_LABELS));
    expect(Object.values(permission)).toHaveLength(9);
    expect(Object.values(permission).every((value) => value === false)).toBe(
      true
    );
    expect(permission).not.toBe(createEmptyPermission());
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
