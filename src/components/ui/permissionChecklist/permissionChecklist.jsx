import {
  createEmptyPermission,
  getPermissionLabel,
} from '@/constants/permissions';
import styles from './permissionChecklist.module.css';

export default function PermissionChecklist({
  permission = createEmptyPermission(),
  onToggle = () => {},
  legend = 'Permissões',
  disabled = false,
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>

      <div className={styles.grid}>
        {Object.entries(permission).map(([permissionName, isAllowed]) => (
          <label className={styles.option} key={permissionName}>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={isAllowed}
              onChange={() => onToggle(permissionName)}
              disabled={disabled}
            />
            <span className={styles.optionLabel}>
              {getPermissionLabel(permissionName)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
