import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';
import { getLawyerInitials } from '@/utils/funcionario';
import styles from './page.module.css';

export default async function Home() {
  const [institucional, funcionarios] = await Promise.all([
    buscarDadosInstitucionais(),
    listarFuncionarios(),
  ]);

  const visibleTeam = funcionarios.filter((f) => f.exibicaoInstitucional);

  const teamSubtitle =
    institucional.textoEquipe ||
    institucional.descricaoEquipe ||
    institucional.sobreEquipe ||
    'Profissionais qualificados e comprometidos com a excelência jurídica.';

  return (
    <main className={styles.container}>
      {visibleTeam.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Nossa Equipe</h2>
          {teamSubtitle && (
            <p className={styles.sectionSubtitle}>{teamSubtitle}</p>
          )}

          <div className={styles.teamGrid}>
            {visibleTeam.map((member) => {
              const initials = getLawyerInitials(member.nome);

              let cargoRaw = !member.cargo
                ? ''
                : typeof member.cargo === 'object'
                  ? member.cargo.nome || member.cargo.nome_cargo || ''
                  : String(member.cargo);

              let cargoPrimary = cargoRaw;
              let cargoSecondary = '';

              if (cargoRaw.includes('·')) {
                const parts = cargoRaw.split('·');
                cargoPrimary = parts[0].trim();
                cargoSecondary = parts.slice(1).join('·').trim();
              } else if (cargoRaw.includes('-')) {
                const parts = cargoRaw.split('-');
                cargoPrimary = parts[0].trim();
                cargoSecondary = parts.slice(1).join('-').trim();
              }

              return (
                <div key={member.funcionario_id} className={styles.teamCard}>
                  <div className={styles.teamAvatar}>{initials}</div>
                  <h3 className={styles.teamName}>{member.nome}</h3>

                  {cargoPrimary && (
                    <p className={styles.teamRolePrimary}>{cargoPrimary}</p>
                  )}

                  {cargoSecondary && (
                    <p className={styles.teamRoleSecondary}>{cargoSecondary}</p>
                  )}

                  {member.numero_oab && member.uf_oab && (
                    <p className={styles.teamOab}>
                      OAB/{member.uf_oab} {member.numero_oab}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
