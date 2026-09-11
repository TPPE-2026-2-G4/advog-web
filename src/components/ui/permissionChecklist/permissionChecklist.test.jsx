import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  createEmptyPermission,
  PERMISSION_LABELS,
} from '@/constants/permissions';
import PermissionChecklist from './permissionChecklist';

const permissionEntries = Object.entries(PERMISSION_LABELS);

describe('PermissionChecklist', () => {
  it('renderiza a legenda e todas as permissões como checkboxes acessíveis', () => {
    render(<PermissionChecklist legend="Permissões do cargo" />);

    expect(
      screen.getByRole('group', { name: 'Permissões do cargo' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(
      permissionEntries.length
    );

    permissionEntries.forEach(([, permissionLabel]) => {
      expect(
        screen.getByRole('checkbox', { name: permissionLabel })
      ).toBeInTheDocument();
    });
  });

  it('marca os campos booleanos habilitados pelo backend', () => {
    const permission = createEmptyPermission();
    permission[permissionEntries[0][0]] = true;
    permission[permissionEntries.at(-1)[0]] = true;

    render(<PermissionChecklist permission={permission} />);

    permissionEntries.forEach(([permissionName, permissionLabel]) => {
      const checkbox = screen.getByRole('checkbox', {
        name: permissionLabel,
      });

      if (permission[permissionName]) {
        expect(checkbox).toBeChecked();
      } else {
        expect(checkbox).not.toBeChecked();
      }
    });
  });

  it('informa o id correto ao alternar uma permissão', () => {
    const onToggle = vi.fn();
    const [permissionName, permissionLabel] = permissionEntries[1];
    render(<PermissionChecklist onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('checkbox', { name: permissionLabel }));

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith(permissionName);
  });

  it('apresenta chaves novas do backend com um rótulo legível', () => {
    render(<PermissionChecklist permission={{ exportar_relatorios: true }} />);

    expect(
      screen.getByRole('checkbox', { name: 'Exportar relatorios' })
    ).toBeChecked();
  });

  it('usa os valores padrão sem exigir propriedades', () => {
    render(<PermissionChecklist />);

    expect(
      screen.getByRole('group', { name: 'Permissões' })
    ).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
    expect(() => fireEvent.click(checkboxes[0])).not.toThrow();
  });

  it('desabilita todas as permissões quando solicitado', () => {
    render(<PermissionChecklist disabled />);

    screen
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).toBeDisabled());
  });
});
