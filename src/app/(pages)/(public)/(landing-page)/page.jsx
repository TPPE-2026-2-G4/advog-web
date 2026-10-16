import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';
import { getLawyerInitials } from '@/utils/funcionario';
import { getImageUrl, formatParagraphs } from '@/utils/institucional';
import { Scale } from 'lucide-react';
import styles from './page.module.css';

export default async function Home() {
  const [institucional, funcionarios] = await Promise.all([
    buscarDadosInstitucionais(),
    listarFuncionarios(),
  ]);

  const sobreTextos = formatParagraphs(institucional?.sobreEscritorio);
  const visibleTeam = (funcionarios || []).filter(
    (f) => f.exibicaoInstitucional
  );

  const teamSubtitle =
    institucional?.textoEquipe ||
    institucional?.descricaoEquipe ||
    institucional?.sobreEquipe ||
    'Profissionais qualificados e comprometidos com a excelência jurídica.';

  return (
    <div style={{ backgroundColor: '#FAF9F6', minHeight: '100vh' }}>
      <main className={styles.container}>
        <section className={styles.contentWrapper}>
          <div className={styles.textContent}>
            <h2 className={styles.title}>Sobre o Escritório</h2>
            <div className={styles.paragraphs}>
              {sobreTextos.map((paragrafo, index) => (
                <p key={index}>{paragrafo}</p>
              ))}
            </div>
          </div>

          <div className={styles.imageContainer}>
            <div className={styles.imageBox}>
              {institucional?.imagemSobre ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(institucional.imagemSobre)}
                  alt="Imagem do escritório"
                  className={styles.image}
                />
              ) : (
                <>
                  <Scale className={styles.placeholderIcon} />
                  <span className={styles.placeholderText}>
                    Imagem do escritório
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

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
                      <p className={styles.teamRoleSecondary}>
                        {cargoSecondary}
                      </p>
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
    </div>
  );
}
