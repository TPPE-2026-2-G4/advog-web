/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect } from 'react';
import { Scale, X, Phone, Mail, MapPin } from 'lucide-react';
import { getLawyerInitials, formatOab } from '@/utils/funcionario';
import {
  getImageUrl,
  getContrastTextColor,
  formatParagraphs,
  getAreaIcon,
} from '@/utils/institucional';
import styles from './site.module.css';

export default function PreviewModal({
  isOpen,
  onClose,
  formData = {},
  team = [],
  areas = [],
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const corPrimaria = formData.corPrimaria || '#1B2A4A';
  const corSecundaria = formData.corSecundaria || '#B79A63';
  const corPrimariaTexto = getContrastTextColor(corPrimaria);
  const corSecundariaTexto = getContrastTextColor(corSecundaria);
  const nomeEscritorio = formData.nomeEscritorio || 'Carreiro Advogados';
  const slogan =
    formData.descricao || 'Tradição e excelência na defesa dos seus direitos';
  const sobre =
    formData.sobreEscritorio ||
    'Fundado em 2010 por Dr. Alexandre Carreiro, o escritório nasceu com a missão de oferecer atendimento jurídico de excelência, combinando tradição e inovação tecnológica.';
  const sobreTextos = formatParagraphs(sobre);

  const visibleTeam = team.filter((member) => member.exibicaoInstitucional);
  const visibleAreas = areas.filter((area) => area.exibicaoInstitucional);

  const areasSubtitle =
    formData.sobreAreas ||
    'Oferecemos assessoria jurídica especializada em diversas áreas do Direito.';

  const teamSubtitle =
    formData.textoEquipe ||
    formData.descricaoEquipe ||
    formData.sobreEquipe ||
    'Profissionais qualificados e comprometidos com a excelência jurídica.';

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      data-testid="preview-modal-overlay"
    >
      <div
        className={styles.modalWindow}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Prévia do Site Institucional"
      >
        {/* Barra superior de janela de navegador */}
        <div className={styles.modalTitlebar}>
          <div className={styles.modalDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>

          <span className={styles.modalAddressBar}>
            {nomeEscritorio.toLowerCase().replace(/\s+/g, '')}.adv.br — prévia
          </span>

          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Fechar prévia"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo da Landing Page simulada */}
        <div
          className={styles.modalViewport}
          style={{
            '--cor-primaria': corPrimaria,
            '--cor-primaria-texto': corPrimariaTexto,
            '--cor-secundaria': corSecundaria,
            '--cor-secundaria-texto': corSecundariaTexto,
          }}
        >
          {/* Navbar */}
          <header
            className={styles.previewNav}
            style={{ backgroundColor: corPrimaria }}
            data-testid="preview-navbar"
          >
            <div className={styles.previewNavBrand}>
              {formData.logotipo ? (
                <img
                  src={getImageUrl(formData.logotipo)}
                  alt={nomeEscritorio}
                  className={styles.previewLogoImg}
                />
              ) : (
                <div
                  className={styles.previewLogoBadge}
                  style={{ backgroundColor: corSecundaria }}
                >
                  <Scale size={18} color={corPrimaria} />
                </div>
              )}
              <span className={styles.previewBrandTitle}>{nomeEscritorio}</span>
            </div>

            <nav
              className={styles.previewNavLinks}
              aria-label="Navegação da prévia"
            >
              <span className={styles.previewNavLink}>Início</span>
              {visibleAreas.length > 0 && (
                <span className={styles.previewNavLink}>Áreas</span>
              )}
              <span className={styles.previewNavLink}>Sobre</span>
              {visibleTeam.length > 0 && (
                <span className={styles.previewNavLink}>Equipe</span>
              )}
              <span className={styles.previewNavLink}>Contato</span>
            </nav>

            <button
              type="button"
              className={styles.previewNavBtn}
              style={{
                backgroundColor: corSecundaria,
                color: corSecundariaTexto,
              }}
            >
              Acessar Painel
            </button>
          </header>

          {/* Hero Section */}
          <section
            className={styles.previewHero}
            style={{
              backgroundColor: corPrimaria,
              backgroundImage: formData.bannerHero
                ? `url(${getImageUrl(formData.bannerHero)})`
                : undefined,
            }}
          >
            <div className={styles.previewHeroOverlay} />
            <div className={styles.previewHeroContent}>
              <h1 className={styles.previewHeroTitle}>{nomeEscritorio}</h1>
              {slogan && <p className={styles.previewHeroSubtitle}>{slogan}</p>}
              <div className={styles.previewHeroActions}>
                <button
                  type="button"
                  className={styles.previewHeroBtn}
                  style={{
                    backgroundColor: corSecundaria,
                    color: corSecundariaTexto,
                  }}
                >
                  Solicitar Atendimento
                </button>
                {visibleAreas.length > 0 && (
                  <button
                    type="button"
                    className={styles.previewHeroSecondaryBtn}
                  >
                    Conhecer Áreas de Atuação
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Seção Áreas de Atuação */}
          {visibleAreas.length > 0 && (
            <section className={styles.previewAreasSection}>
              <div className={styles.previewSectionContainer}>
                <h2 className={styles.previewSectionTitleCentered}>
                  Áreas de Atuação
                </h2>
                <p className={styles.previewSectionSubtitleCentered}>
                  {areasSubtitle}
                </p>
                <div className={styles.previewAreasGrid}>
                  {visibleAreas.map((area, index) => {
                    const nomeArea = area.titulo || area.nome;
                    const IconComponent = getAreaIcon(nomeArea, index);
                    return (
                      <div
                        key={area.atuacao_id}
                        className={styles.previewAreaCard}
                        style={{ borderTopColor: corSecundaria }}
                      >
                        <div
                          className={styles.previewAreaIconBadge}
                          style={{
                            color: corSecundaria,
                            backgroundColor: 'rgba(183, 154, 99, 0.12)',
                          }}
                        >
                          <IconComponent size={24} color={corSecundaria} />
                        </div>
                        <span className={styles.previewAreaCardTitle}>
                          {nomeArea}
                        </span>
                        <span className={styles.previewAreaCardDesc}>
                          {area.descricao}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Sobre o Escritório */}
          <section className={styles.previewSobreSection}>
            <div className={styles.previewSectionContainer}>
              <div className={styles.previewSobreWrapper}>
                <div className={styles.previewSobreText}>
                  <h2 className={styles.previewSobreTitle}>
                    Sobre o Escritório
                  </h2>
                  <div className={styles.previewSobreParagraphs}>
                    {sobreTextos.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </div>
                <div className={styles.previewSobreImageContainer}>
                  <div className={styles.previewSobreImageBox}>
                    {formData.imagemSobre ? (
                      <img
                        src={getImageUrl(formData.imagemSobre)}
                        alt="Sobre o Escritório"
                        className={styles.previewAboutImage}
                      />
                    ) : (
                      <>
                        <Scale
                          size={48}
                          className={styles.previewPlaceholderIcon}
                          style={{ color: corSecundaria }}
                        />
                        <span className={styles.previewPlaceholderText}>
                          Imagem do escritório
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Seção Nossa Equipe */}
          {visibleTeam.length > 0 && (
            <section className={styles.previewEquipeSection}>
              <div className={styles.previewSectionContainer}>
                <h2 className={styles.previewSectionTitleCentered}>
                  Nossa Equipe
                </h2>
                <p className={styles.previewSectionSubtitleCentered}>
                  {teamSubtitle}
                </p>
                <div className={styles.previewTeamGrid}>
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
                        className={styles.previewTeamCard}
                      >
                        <div
                          className={styles.previewTeamAvatar}
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
                        <span className={styles.previewTeamName}>
                          {member.nome}
                        </span>
                        {cargoPrimary && (
                          <span
                            className={styles.previewTeamRolePrimary}
                            style={{ color: corSecundaria }}
                          >
                            {cargoPrimary}
                          </span>
                        )}
                        {cargoSecondary && (
                          <span className={styles.previewTeamRoleSecondary}>
                            {cargoSecondary}
                          </span>
                        )}
                        {oab && (
                          <span className={styles.previewTeamOab}>{oab}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Seção Solicitar Atendimento (Simulação do Formulário) */}
          <section className={styles.previewAtendimentoSection}>
            <div className={styles.previewSectionContainer}>
              <div className={styles.previewAtendimentoCard}>
                <h2 className={styles.previewAtendimentoTitle}>
                  Solicitar Atendimento
                </h2>
                <p className={styles.previewAtendimentoSubtitle}>
                  Preencha o formulário abaixo e nossa equipe entrará em
                  contato.
                </p>
                <div className={styles.previewFormFields}>
                  <div className={styles.previewFormField}>
                    <label className={styles.previewFormLabel}>
                      Nome completo
                    </label>
                    <input
                      type="text"
                      className={styles.previewFormInput}
                      placeholder="Seu nome"
                      disabled
                    />
                  </div>
                  <div className={styles.previewFormField}>
                    <label className={styles.previewFormLabel}>Email</label>
                    <input
                      type="email"
                      className={styles.previewFormInput}
                      placeholder="seu@email.com"
                      disabled
                    />
                  </div>
                  <div className={styles.previewFormField}>
                    <label className={styles.previewFormLabel}>Telefone</label>
                    <input
                      type="tel"
                      className={styles.previewFormInput}
                      placeholder="(61) 99999-9999"
                      disabled
                    />
                  </div>
                  <div className={styles.previewFormField}>
                    <label className={styles.previewFormLabel}>
                      Descreva sua demanda
                    </label>
                    <textarea
                      className={styles.previewFormTextarea}
                      rows={3}
                      placeholder="Conte-nos resumidamente sobre sua situação jurídica..."
                      disabled
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.previewFormSubmitBtn}
                    style={{
                      backgroundColor: corSecundaria,
                      color: corSecundariaTexto,
                    }}
                    disabled
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Rodapé */}
          <footer
            className={styles.previewFooter}
            style={{ backgroundColor: corPrimaria }}
          >
            <div className={styles.previewFooterContainer}>
              <div className={styles.previewFooterTop}>
                <div className={styles.previewFooterBrand}>
                  <div className={styles.previewFooterBrandHeader}>
                    {formData.logotipo ? (
                      <img
                        src={getImageUrl(formData.logotipo)}
                        alt=""
                        aria-hidden="true"
                        className={styles.previewFooterLogoImg}
                      />
                    ) : (
                      <div
                        className={styles.previewFooterLogoBadge}
                        style={{ backgroundColor: corSecundaria }}
                      >
                        <Scale size={18} color={corPrimaria} />
                      </div>
                    )}
                    <span className={styles.previewFooterBrandTitle}>
                      {nomeEscritorio}
                    </span>
                  </div>
                </div>

                {(formData.telefone || formData.email || formData.endereco) && (
                  <div className={styles.previewFooterContacts}>
                    {formData.telefone && (
                      <div className={styles.previewFooterContactItem}>
                        <Phone size={15} color={corSecundaria} />
                        <span>{formData.telefone}</span>
                      </div>
                    )}
                    {formData.email && (
                      <div className={styles.previewFooterContactItem}>
                        <Mail size={15} color={corSecundaria} />
                        <span>{formData.email}</span>
                      </div>
                    )}
                    {formData.endereco && (
                      <div className={styles.previewFooterContactItem}>
                        <MapPin size={15} color={corSecundaria} />
                        <span>{formData.endereco}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.previewFooterBottom}>
                <span>
                  © 2026 {nomeEscritorio}. Todos os direitos reservados.
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
