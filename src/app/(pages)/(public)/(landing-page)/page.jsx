import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarAtuacoes } from '@/services/atuacoes';
import { getLawyerInitials, formatOab } from '@/utils/funcionario';
import { getImageUrl, formatParagraphs } from '@/utils/institucional';
import { Scale } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [institucional, funcionarios, atuacoes] = await Promise.all([
    buscarDadosInstitucionais(),
    listarFuncionarios(),
    listarAtuacoes(),
  ]);

  const sobreTextos = formatParagraphs(institucional?.sobreEscritorio);
  const atuacoesVisiveis = (atuacoes || []).filter(
    (area) => area.exibicaoInstitucional
  );
  const visibleTeam = (funcionarios || []).filter(
    (f) => f.exibicaoInstitucional
  );

  const teamSubtitle =
    institucional?.textoEquipe ||
    institucional?.descricaoEquipe ||
    institucional?.sobreEquipe ||
    'Profissionais qualificados e comprometidos com a excelência jurídica.';

  return (
    <div className={styles.pageWrapper}>
      <main>
        <section className={styles.sobreSection}>
          <div className={styles.container}>
            <div className={styles.contentWrapper}>
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
            </div>
          </div>
        </section>

        {atuacoesVisiveis.length > 0 && (
          <section className={styles.areasSection}>
            <div className={styles.container}>
              <h2 className={styles.title}>Áreas de Atuação</h2>
              <div className={styles.areasGrid}>
                {atuacoesVisiveis.map((area) => (
                  <div key={area.atuacao_id} className={styles.areaCard}>
                    <h3 className={styles.areaCardTitle}>
                      {area.titulo || area.nome}
                    </h3>
                    <p className={styles.areaCardDesc}>{area.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {visibleTeam.length > 0 && (
          <section className={styles.equipeSection}>
            <div className={styles.container}>
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

                  if (
                    !cargoSecondary &&
                    typeof member.cargo === 'object' &&
                    member.cargo?.descricao
                  ) {
                    cargoSecondary = member.cargo.descricao.trim();
                  }
                  if (!cargoSecondary && member.descricao) {
                    cargoSecondary = member.descricao.trim();
                  }
                  if (!cargoSecondary && member.especialidade) {
                    cargoSecondary = member.especialidade.trim();
                  }
                  if (!cargoSecondary && member.area) {
                    cargoSecondary = member.area.trim();
                  }

                  const oab = formatOab(member);

                  return (
                    <div
                      key={member.funcionario_id}
                      className={styles.teamCard}
                    >
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

                      {oab && <p className={styles.teamOab}>{oab}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
