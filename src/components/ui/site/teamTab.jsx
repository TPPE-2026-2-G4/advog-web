'use client';

import { Users, Check } from 'lucide-react';
import { getLawyerInitials } from '@/utils/funcionario';
import styles from './site.module.css';

export default function TeamTab({ team = [], onToggleLawyer }) {
  const visibleCount = team.filter(
    (member) => member.exibicaoInstitucional
  ).length;
  const totalCount = team.length;

  return (
    <div className={styles.card}>
      <div className={styles.teamCardHeader}>
        <Users size={20} color="#b79a63" />
        <h3>Advogados exibidos no site</h3>
      </div>
      <p className={styles.cardDescription}>
        Selecione quais advogados aparecem na página institucional e gerencie a
        exibição de suas informações.
      </p>

      <div className={styles.teamList}>
        {team.map((member) => {
          const initials = getLawyerInitials(member.nome);
          const cargo = !member.cargo
            ? ''
            : typeof member.cargo === 'object'
              ? member.cargo.nome || member.cargo.nome_cargo || ''
              : String(member.cargo);
          const isVisible = Boolean(member.exibicaoInstitucional);

          return (
            <div key={member.funcionario_id} className={styles.teamItem}>
              <div className={styles.teamMemberLeft}>
                <div className={styles.teamAvatar}>{initials}</div>
                <div className={styles.teamInfo}>
                  <span className={styles.teamName}>{member.nome}</span>
                  {cargo && <span className={styles.teamRole}>{cargo}</span>}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isVisible}
                aria-label={`Exibir ${member.nome} no site`}
                className={`${styles.toggleSwitch} ${
                  isVisible ? styles.toggleSwitchActive : ''
                }`}
                onClick={() => onToggleLawyer(member.funcionario_id)}
              >
                <span
                  className={`${styles.toggleThumb} ${
                    isVisible ? styles.toggleThumbActive : ''
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.teamFooter}>
        <Check size={16} className={styles.teamFooterCheck} />
        <span>
          {visibleCount} de {totalCount} advogados visíveis no site
          institucional
        </span>
      </div>
    </div>
  );
}
