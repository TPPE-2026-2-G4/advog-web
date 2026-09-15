/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect } from 'react';
import { Scale, X, Phone, Mail, MapPin } from 'lucide-react';
import styles from './site.module.css';

export default function PreviewModal({ isOpen, onClose, formData }) {
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
  const nomeEscritorio = formData.nomeEscritorio || 'Carreiro Advogados';
  const slogan =
    formData.descricao || 'Tradição e excelência na defesa dos seus direitos';
  const sobre =
    formData.sobreEscritorio ||
    'Fundado em 2010 por Dr. Alexandre Carreiro, o escritório nasceu com a missão de oferecer atendimento jurídico de excelência, combinando tradição e inovação tecnológica.';

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
        <div className={styles.modalViewport}>
          {/* Navbar */}
          <header
            className={styles.previewNav}
            style={{ backgroundColor: corPrimaria }}
          >
            <div className={styles.previewNavBrand}>
              {formData.logotipo ? (
                <img
                  src={formData.logotipo}
                  alt={nomeEscritorio}
                  style={{ height: '32px', width: 'auto' }}
                />
              ) : (
                <Scale size={24} color={corSecundaria} />
              )}
              <span>{nomeEscritorio}</span>
            </div>

            <button
              type="button"
              className={styles.previewNavBtn}
              style={{
                backgroundColor: corSecundaria,
                color: '#172133',
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
                ? `url(${formData.bannerHero})`
                : undefined,
            }}
          >
            <div className={styles.previewHeroOverlay} />
            <div className={styles.previewHeroContent}>
              <h1 className={styles.previewHeroTitle}>{slogan}</h1>
              <p className={styles.previewHeroSubtitle}>
                Advocacia de excelência com atendimento personalizado
              </p>
              <button
                type="button"
                className={styles.previewHeroBtn}
                style={{
                  backgroundColor: corSecundaria,
                  color: '#172133',
                }}
              >
                Solicitar Atendimento
              </button>
            </div>
          </section>

          {/* Sobre o Escritório */}
          <section className={styles.previewSection}>
            <h2 className={styles.previewSectionTitle}>Sobre o Escritório</h2>
            <p className={styles.previewSectionText}>{sobre}</p>
          </section>

          {/* Contato */}
          <section
            className={styles.previewSection}
            style={{ borderTop: '1px solid #e5e7eb', paddingTop: '32px' }}
          >
            <h2 className={styles.previewSectionTitle}>Contato</h2>
            <div className={styles.previewContactGrid}>
              {formData.telefone && (
                <div className={styles.previewContactItem}>
                  <Phone size={18} color={corSecundaria} />
                  <span>{formData.telefone}</span>
                </div>
              )}
              {formData.email && (
                <div className={styles.previewContactItem}>
                  <Mail size={18} color={corSecundaria} />
                  <span>{formData.email}</span>
                </div>
              )}
              {formData.endereco && (
                <div className={styles.previewContactItem}>
                  <MapPin size={18} color={corSecundaria} />
                  <span>{formData.endereco}</span>
                </div>
              )}
            </div>
          </section>

          {/* Rodapé */}
          <footer
            className={styles.previewFooter}
            style={{ backgroundColor: corPrimaria }}
          >
            <span style={{ fontWeight: '600' }}>{nomeEscritorio}</span>
            <span style={{ opacity: 0.7 }}>
              © 2026 — Todos os direitos reservados.
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
