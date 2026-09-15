import { describe, expect, it } from 'vitest';
import {
  createEmptyPermission,
  getPermissionLabel,
  PERMISSION_LABELS,
} from './permissions';

describe('metadados visuais de permissões', () => {
  it('cria o objeto inicial com os nove campos desabilitados', () => {
    const permission = createEmptyPermission();

    expect(Object.keys(permission)).toEqual(Object.keys(PERMISSION_LABELS));
    expect(Object.values(permission)).toHaveLength(9);
    expect(Object.values(permission).every((value) => value === false)).toBe(
      true
    );
  });

  it('cria um novo objeto a cada chamada', () => {
    expect(createEmptyPermission()).not.toBe(createEmptyPermission());
  });

  it('retorna o rótulo em português de um campo conhecido', () => {
    expect(getPermissionLabel('configuracoes_sistema')).toBe(
      'Configurações do sistema'
    );
  });

  it('gera um rótulo legível para um campo novo do backend', () => {
    expect(getPermissionLabel('exportar_relatorios')).toBe(
      'Exportar relatorios'
    );
  });
});
