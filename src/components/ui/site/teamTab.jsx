'use client';

import { Users, Check } from 'lucide-react';
import { getImageUrl } from '@/utils/institucional';
import { getLawyerInitials, isAdministratorAccount } from '@/utils/funcionario';
import styles from './site.module.css';

export default function TeamTab({ team = [], onToggleLawyer }) {
  const cleanTeam = team.filter((member) => !isAdministratorAccount(member));
  const visibleCount = cleanTeam.filter(
    (member) => member.exibicaoInstitucional
  ).length;
  const totalCount = cleanTeam.length;

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
        {cleanTeam.map((member) => {
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
                <div className={styles.teamAvatar}>
                  {member.foto_perfil_url ? (
                    <img
                      src={getImageUrl(member.foto_perfil_url)}
                      alt={`Foto de ${member.nome}`}
                    />
                  ) : (
                    initials
                  )}
                </div>
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
