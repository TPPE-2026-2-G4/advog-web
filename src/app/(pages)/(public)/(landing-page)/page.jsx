import {
  buscarDadosInstitucionais,
  listarEquipeInstitucional,
} from '@/services/institucional';
import { listarAtuacoes } from '@/services/atuacoes';
import {
  getLawyerInitials,
  formatOab,
  isAdministratorAccount,
} from '@/utils/funcionario';
import {
  getImageUrl,
  formatParagraphs,
  getContrastTextColor,
  getAreaIcon,
} from '@/utils/institucional';
import {
  Scale,
  Briefcase,
  Shield,
  Landmark,
  FileText,
  Users,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import SolicitarAtendimento from '@/components/features/atendimento/SolicitarAtendimento/SolicitarAtendimento';
import PublicNavbar from '@/components/layout/PublicNavbar/PublicNavbar';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [institucional, funcionarios, atuacoes] = await Promise.all([
    buscarDadosInstitucionais(),
    listarEquipeInstitucional(),
    listarAtuacoes(),
  ]);

  const corPrimaria = institucional?.corPrimaria || '#1B2A4A';
  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const corPrimariaTexto = getContrastTextColor(corPrimaria);
  const corSecundariaTexto = getContrastTextColor(corSecundaria);
  const nomeEscritorio = institucional?.nomeEscritorio || 'Carreiro Advogados';
  const slogan =
    institucional?.descricao ||
    'Tradição e excelência na defesa dos seus direitos';

  const sobreTextos = formatParagraphs(institucional?.sobreEscritorio);
  const atuacoesVisiveis = (atuacoes || []).filter(
    (area) => area.exibicaoInstitucional
  );
  const visibleTeam = (funcionarios || []).filter(
    (f) => !isAdministratorAccount(f)
  );

  const areasSubtitle =
    institucional?.sobreAreas ||
    'Oferecemos assessoria jurídica especializada em diversas áreas do Direito.';

  const teamSubtitle =
    institucional?.textoEquipe ||
    institucional?.descricaoEquipe ||
    institucional?.sobreEquipe ||
    'Profissionais qualificados e comprometidos com a excelência jurídica.';

  const atuacoesMap = new Map(
    (atuacoes || []).map((area) => [
      String(area.atuacao_id || area.id),
      area.nome,
    ])
  );

  return (
    <div
      className={styles.pageWrapper}
      style={{
        '--cor-primaria': corPrimaria,
        '--cor-primaria-texto': corPrimariaTexto,
        '--cor-secundaria': corSecundaria,
        '--cor-secundaria-texto': corSecundariaTexto,
      }}
    >
      <PublicNavbar
        institucional={institucional}
        hasTeam={visibleTeam.length > 0}
        hasAreas={atuacoesVisiveis.length > 0}
      />

      <main>
        {/* Seção Hero (Início) */}
        <section
          id="inicio"
          className={styles.heroSection}
          style={{
            backgroundColor: corPrimaria,
            backgroundImage: institucional?.bannerHero
              ? `url(${getImageUrl(institucional.bannerHero)})`
              : undefined,
          }}
          data-testid="hero-section"
        >
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{nomeEscritorio}</h1>
            {slogan && <p className={styles.heroSubtitle}>{slogan}</p>}
            <div className={styles.heroActions}>
              <a
                href="#contato"
                className={styles.heroPrimaryBtn}
                style={{
                  backgroundColor: corSecundaria,
                  color: corSecundariaTexto,
                }}
              >
                Solicitar Atendimento
              </a>
              {atuacoesVisiveis.length > 0 && (
                <a href="#areas" className={styles.heroSecondaryBtn}>
                  Conhecer Áreas de Atuação
                </a>
              )}
            </div>
          </div>
        </section>

        {atuacoesVisiveis.length > 0 && (
          <section id="areas" className={styles.areasSection}>
            <div className={styles.container}>
              <h2 className={styles.areasTitle}>Áreas de Atuação</h2>
              <p className={styles.areasSubtitle}>{areasSubtitle}</p>
              <div className={styles.areasGrid}>
                {atuacoesVisiveis.map((area, index) => {
                  const IconComponent = getAreaIcon(
                    area.titulo || area.nome,
                    index
                  );
                  return (
                    <article
                      key={area.atuacao_id}
                      className={styles.areaCard}
                      style={{ borderTopColor: corSecundaria }}
                    >
                      <div
                        className={styles.areaIconBadge}
                        style={{ color: corSecundaria }}
                      >
                        <IconComponent size={24} color={corSecundaria} />
                      </div>
                      <h3 className={styles.areaCardTitle}>
                        {area.titulo || area.nome}
                      </h3>
                      <p className={styles.areaCardDesc}>{area.descricao}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section id="sobre" className={styles.sobreSection}>
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
                      <Scale
                        className={styles.placeholderIcon}
                        style={{ color: corSecundaria }}
                      />
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

        {visibleTeam.length > 0 && (
          <section
            id="equipe"
            className={styles.equipeSection}
            data-testid="team-section"
          >
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

                  const areaAtuacao =
                    (member.atuacao_id &&
                      atuacoesMap.get(String(member.atuacao_id))) ||
                    member.atuacao?.nome ||
                    (typeof member.atuacao === 'string'
                      ? member.atuacao
                      : '') ||
                    member.area_atuacao ||
                    member.area ||
                    cargoSecondary;

                  const oab = formatOab(member);

                  return (
                    <div
                      key={member.funcionario_id}
                      className={styles.teamCard}
                    >
                      <div
                        className={styles.teamAvatar}
                        style={{ color: corPrimaria }}
                      >
                        {member.foto_perfil_url ? (
                          <img
                            src={getImageUrl(member.foto_perfil_url)}
                            alt={`Foto de ${member.nome}`}
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <h3 className={styles.teamName}>{member.nome}</h3>

                      {cargoPrimary && (
                        <p
                          className={styles.teamRolePrimary}
                          style={{ color: corSecundaria }}
                        >
                          {cargoPrimary}
                        </p>
                      )}

                      {areaAtuacao && (
                        <p className={styles.teamRoleSecondary}>
                          {areaAtuacao}
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

        <SolicitarAtendimento />
      </main>

      <footer
        className={styles.footer}
        style={{ backgroundColor: corPrimaria }}
      >
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.footerBrandHeader}>
                {institucional?.logotipo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(institucional.logotipo)}
                    alt={nomeEscritorio}
                    className={styles.footerLogoImg}
                  />
                ) : (
                  <div
                    className={styles.footerLogoBadge}
                    style={{ backgroundColor: corSecundaria }}
                  >
                    <Scale size={20} color={corPrimaria} />
                  </div>
                )}
                <span className={styles.footerBrandTitle}>
                  {nomeEscritorio}
                </span>
              </div>
              {institucional?.descricao && (
                <p className={styles.footerDesc}>{institucional.descricao}</p>
              )}
            </div>

            {(institucional?.telefone ||
              institucional?.email ||
              institucional?.endereco) && (
              <div className={styles.footerContacts}>
                {institucional.telefone && (
                  <div className={styles.footerContactItem}>
                    <Phone
                      size={16}
                      className={styles.footerContactIcon}
                      style={{ color: corSecundaria }}
                    />
                    <span>{institucional.telefone}</span>
                  </div>
                )}
                {institucional.email && (
                  <div className={styles.footerContactItem}>
                    <Mail
                      size={16}
                      className={styles.footerContactIcon}
                      style={{ color: corSecundaria }}
                    />
                    <span>{institucional.email}</span>
                  </div>
                )}
                {institucional.endereco && (
                  <div className={styles.footerContactItem}>
                    <MapPin
                      size={16}
                      className={styles.footerContactIcon}
                      style={{ color: corSecundaria }}
                    />
                    <span>{institucional.endereco}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.footerBottom}>
            <p>
              © {new Date().getFullYear()} {nomeEscritorio}. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
