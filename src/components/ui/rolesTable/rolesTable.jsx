import { Shield, Plus } from 'lucide-react';
import styles from './rolesTable.module.css';

const rolesData = [
  {
    cargo_id: 'admin',
    nome_cargo: 'Admin',
    permissao: 9,
    descricao:
      'Acesso irrestrito a todas as funcionalidades e configurações do sistema.',
    cardStyle: styles.cardAdmin,
    badgeStyle: styles.badgeBlue,
  },
  {
    cargo_id: 'advogado',
    nome_cargo: 'Advogado',
    permissao: 6,
    descricao:
      'Pode criar e editar processos. Sem acesso a exclusão ou painel admin.',
    cardStyle: styles.cardAdvogado,
    badgeStyle: styles.badgeGreen,
  },
  {
    cargo_id: 'estagiario',
    nome_cargo: 'Estagiário',
    permissao: 3,
    descricao: 'Apenas visualização. Não pode criar, editar nem excluir dados.',
    cardStyle: styles.cardEstagiario,
    badgeStyle: styles.badgeYellow,
  },
];

export default function RolesTable() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.titleArea}>
          <Shield size={24} className={styles.iconShield} />
          Referência de Cargos de Acesso (RBAC)
        </h2>

        <button className={styles.addRoleBtn}>
          <Plus size={18} />
          Novo Cargo
        </button>
      </div>

      <div className={styles.cardsGrid}>
        {rolesData.map((nome_cargo) => (
          <div
            key={nome_cargo.cargo_id}
            className={`${styles.card} ${nome_cargo.cardStyle}`}
          >
            <div className={styles.cardHeader}>
              <span className={`${styles.badge} ${nome_cargo.badgeStyle}`}>
                {nome_cargo.nome_cargo}
              </span>
              <span className={styles.permCount}>
                {nome_cargo.permissao} permissões
              </span>
            </div>

            <p className={styles.description}>{nome_cargo.descricao}</p>

            <button className={styles.editLink}>Editar permissões →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
