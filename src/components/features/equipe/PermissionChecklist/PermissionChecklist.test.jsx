import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  createEmptyPermission,
  PERMISSION_LABELS,
} from '@/constants/permissions';
import PermissionChecklist from './PermissionChecklist';

const permissionEntries = Object.entries(PERMISSION_LABELS);

describe('PermissionChecklist', () => {
  it('renderiza a legenda customizada e a quantidade total de checkboxes', () => {
    render(<PermissionChecklist legend="Permissões do cargo" />);

    expect(
      screen.getByRole('group', { name: 'Permissões do cargo' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(
      permissionEntries.length
    );
  });

  it.each(permissionEntries)(
    'renderiza a permissão "%s" como checkbox acessível com rótulo "%s"',
    (permissionName, permissionLabel) => {
      const permission = createEmptyPermission();
      permission[permissionName] = true;

      render(<PermissionChecklist permission={permission} />);

      const checkbox = screen.getByRole('checkbox', { name: permissionLabel });
      expect(checkbox).toBeChecked();

      for (const [otherName, otherLabel] of permissionEntries) {
        if (otherName !== permissionName) {
          expect(
            screen.getByRole('checkbox', { name: otherLabel })
          ).not.toBeChecked();
        }
      }
    }
  );

  it.each(permissionEntries)(
    'informa o id "%s" ao alternar o checkbox "%s"',
    (permissionName, permissionLabel) => {
      const onToggle = vi.fn();
      render(<PermissionChecklist onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('checkbox', { name: permissionLabel }));

      expect(onToggle).toHaveBeenCalledOnce();
      expect(onToggle).toHaveBeenCalledWith(permissionName);
    }
  );

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
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }
    expect(() => fireEvent.click(checkboxes[0])).not.toThrow();
  });

  it.each(permissionEntries)(
    'desabilita a permissão "%s" ("%s") quando disabled for verdadeiro',
    (_permissionName, permissionLabel) => {
      render(<PermissionChecklist disabled />);

      expect(
        screen.getByRole('checkbox', { name: permissionLabel })
      ).toBeDisabled();
    }
  );
});
