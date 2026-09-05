import { CircleCheck, CircleSlash, Pencil, Trash2 } from 'lucide-react';
import styles from './teamTable.module.css';

const getRoleBadgeStyle = (role) => {
  if (role === 'Admin') return styles.badgeBlue;
  if (role === 'Advogado') return styles.badgeGreen;
  return styles.badgeYellow;
};

const getStatusBadgeStyle = (status) => {
  if (status === 'Ativo') return styles.badgeGreen;
  if (status === 'Inativo') return styles.badgeRed;
  return styles.badgeYellow;
};

export default function TeamTable({ members = [], onDelete, onChangeAccess }) {
  return (
    <div className={styles.tableContainer}>
      <h2 className={styles.headerTitle}>Membros da Equipe</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Nome</th>
            <th className={styles.th}>E-mail</th>
            <th className={styles.th}>Nível de Acesso</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.funcionario_id} className={styles.tr}>
              <td className={styles.td}>
                <div className={styles.nameCell}>
                  <div className={styles.avatar}>{member.initials}</div>
                  <div>
                    <p className={styles.nameText}>{member.nome_func}</p>
                  </div>
                </div>
              </td>

              <td className={styles.td}>
                <span className={styles.emailText}>{member.email_func}</span>
              </td>

              <td className={styles.td}>
                <span
                  className={`${styles.badge} ${getRoleBadgeStyle(member.cargo)}`}
                >
                  {member.cargo}
                </span>
              </td>

              <td className={styles.td}>
                <span
                  className={`${styles.badge} ${getStatusBadgeStyle(member.status)}`}
                >
                  {member.status}
                </span>
              </td>

              <td className={styles.td}>
                <div className={styles.actionsCell}>
                  <button className={styles.actionBtn} title="Editar usuário">
                    <Pencil size={18} />
                  </button>
                  {member.status !== 'Pendente' && (
                    <button
                      className={styles.actionBtn}
                      title={
                        member.status === 'Ativo'
                          ? 'Revogar acesso'
                          : 'Permitir acesso'
                      }
                      onClick={() => onChangeAccess(member)}
                      type="button"
                    >
                      {member.status === 'Ativo' ? (
                        <CircleSlash size={18} />
                      ) : (
                        <CircleCheck size={18} />
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
