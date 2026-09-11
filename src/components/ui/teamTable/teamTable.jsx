import { CircleCheck, CircleSlash, Settings, Trash2 } from 'lucide-react';
import { createEmptyPermission } from '@/constants/permissions';
import styles from './teamTable.module.css';

const roleBadgePalette = [
  styles.badgeBlue,
  styles.badgeGreen,
  styles.badgeYellow,
  styles.badgeTeal,
  styles.badgeOrange,
  styles.badgeRose,
];

const getRoleBadgeStyle = (role) => {
  const roleName = role || 'Não informado';
  const roleHash = [...roleName].reduce(
    (hash, character) => hash + character.charCodeAt(0),
    0
  );

  return roleBadgePalette[roleHash % roleBadgePalette.length];
};

const getStatusBadgeStyle = (status) => {
  if (status === 'Ativo') return styles.badgeGreen;
  if (status === 'Inativo') return styles.badgeRed;
  return styles.badgeYellow;
};

const getMemberPermission = (member, roles) => {
  const memberRole = roles.find(
    (role) => String(role.cargo_id) === String(member.cargo_id)
  );
  const permission = memberRole?.permissao ?? member.permissao;

  return permission && Object.keys(permission).length > 0
    ? permission
    : createEmptyPermission();
};

export default function TeamTable({
  members = [],
  roles = [],
  onDelete,
  onChangeAccess,
  onEdit,
}) {
  return (
    <div className={styles.tableContainer}>
      <h2 className={styles.headerTitle}>Membros da Equipe</h2>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Nome</th>
              <th className={styles.th}>E-mail</th>
              <th className={styles.th}>Nível de Acesso</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Permissões</th>
              <th className={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const permission = getMemberPermission(member, roles);
              const permissionCount =
                Object.values(permission).filter(Boolean).length;
              const permissionTotal = Object.keys(permission).length;

              return (
                <tr key={member.funcionario_id} className={styles.tr}>
                  <td className={styles.td} data-label="Nome">
                    <div className={styles.nameCell}>
                      <div className={styles.avatar}>{member.initials}</div>
                      <div className={styles.nameTextWrap}>
                        <p className={styles.nameText}>{member.nome_func}</p>
                        {member.telefone && (
                          <p className={styles.phoneText}>{member.telefone}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className={styles.td} data-label="E-mail">
                    <span className={styles.emailText}>
                      {member.email_func}
                    </span>
                  </td>

                  <td className={styles.td} data-label="Nível de Acesso">
                    <span
                      className={`${styles.badge} ${getRoleBadgeStyle(member.cargo)}`}
                    >
                      {member.cargo}
                    </span>
                  </td>

                  <td className={styles.td} data-label="Status">
                    <span
                      className={`${styles.badge} ${getStatusBadgeStyle(member.status)}`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className={styles.td} data-label="Permissões">
                    <div
                      className={styles.permissionSummary}
                      aria-label={`${permissionCount} de ${permissionTotal} permissões`}
                    >
                      <span
                        className={styles.permissionTrack}
                        aria-hidden="true"
                      >
                        <span
                          className={styles.permissionFill}
                          style={{
                            width: `${(permissionCount / permissionTotal) * 100}%`,
                          }}
                        />
                      </span>
                      <span className={styles.permissionCount}>
                        {permissionCount}/{permissionTotal}
                      </span>
                    </div>
                  </td>

                  <td className={styles.td} data-label="Ações">
                    <div className={styles.actionsCell}>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        title="Editar usuário"
                        onClick={() => onEdit?.(member)}
                        type="button"
                      >
                        <Settings size={17} aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                      {member.status !== 'Pendente' && (
                        <button
                          className={`${styles.actionBtn} ${
                            member.status === 'Ativo'
                              ? styles.revokeAccessBtn
                              : styles.allowAccessBtn
                          }`}
                          title={
                            member.status === 'Ativo'
                              ? 'Revogar acesso'
                              : 'Permitir acesso'
                          }
                          onClick={() => onChangeAccess(member)}
                          type="button"
                        >
                          {member.status === 'Ativo' ? (
                            <>
                              <CircleSlash size={17} aria-hidden="true" />
                              <span>Revogar acesso</span>
                            </>
                          ) : (
                            <>
                              <CircleCheck size={17} aria-hidden="true" />
                              <span>Permitir acesso</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Excluir usuário"
                        onClick={() => onDelete(member)}
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
