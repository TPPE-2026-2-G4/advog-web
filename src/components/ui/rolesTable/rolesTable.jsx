import { Shield, Plus, Trash2 } from 'lucide-react';
import styles from './rolesTable.module.css';

const roleStyles = {
  admin: { card: styles.cardAdmin, badge: styles.badgeBlue },
  advogado: { card: styles.cardAdvogado, badge: styles.badgeGreen },
  estagiario: { card: styles.cardEstagiario, badge: styles.badgeYellow },
  blue: { card: styles.cardAdmin, badge: styles.badgeBlue },
  info: { card: styles.cardAdmin, badge: styles.badgeBlue },
  green: { card: styles.cardAdvogado, badge: styles.badgeGreen },
  success: { card: styles.cardAdvogado, badge: styles.badgeGreen },
  yellow: { card: styles.cardEstagiario, badge: styles.badgeYellow },
  warning: { card: styles.cardEstagiario, badge: styles.badgeYellow },
  default: { card: styles.cardDefault, badge: styles.badgeDefault },
};

const normalizeRoleName = (roleName = '') =>
  roleName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const roleVariantByName = {
  admin: 'info',
  administrador: 'info',
  advogado: 'success',
  estagiario: 'warning',
};

const getRoleStyles = (role) => {
  const roleVariant =
    role.variant || roleVariantByName[normalizeRoleName(role.nome_cargo)];

  return roleStyles[roleVariant] || roleStyles.default;
};

const getPermissionCount = (permission = {}) =>
  Object.values(permission).filter(Boolean).length;

export default function RolesTable({
  roles = [],
  onCreateRole,
  onEditPermissions,
  onDeleteRole,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.titleArea}>
          <Shield size={24} className={styles.iconShield} />
          Referência de Cargos de Acesso (RBAC)
        </h2>

        <button
          className={styles.addRoleBtn}
          onClick={onCreateRole}
          type="button"
        >
          <Plus size={18} />
          Novo Cargo
        </button>
      </div>

      <div className={styles.cardsGrid}>
        {roles.map((role) => {
          const roleStyle = getRoleStyles(role);

          return (
            <div
              key={role.cargo_id}
              className={`${styles.card} ${roleStyle.card}`}
            >
              <div className={styles.cardHeader}>
                <span className={`${styles.badge} ${roleStyle.badge}`}>
                  {role.nome_cargo}
                </span>
                <span className={styles.permCount}>
                  {getPermissionCount(role.permissao)} permissões
                </span>
              </div>

              <p className={styles.description}>{role.descricao}</p>

              <div className={styles.cardActions}>
                <button
                  className={styles.editLink}
                  onClick={() => onEditPermissions?.(role)}
                  type="button"
                >
                  Editar permissões →
                </button>
                <button
                  className={styles.deleteLink}
                  onClick={() => onDeleteRole?.(role)}
                  type="button"
                  aria-label={`Excluir cargo ${role.nome_cargo}`}
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
