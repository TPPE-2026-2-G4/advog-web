'use client';

import { Scale } from 'lucide-react';
import styles from './site.module.css';

export default function ColorsTab({ formData, onInputChange }) {
  const corPrimaria = formData.corPrimaria || '#1B2A4A';
  const corSecundaria = formData.corSecundaria || '#B79A63';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Paleta de cores</h3>

        {/* Cor Primária */}
        <div className={styles.formGroup}>
          <label htmlFor="corPrimariaHex" className={styles.formLabel}>
            Cor primária (fundo, navbar, rodapé)
          </label>
          <div className={styles.colorInputRow}>
            <div
              className={styles.colorSwatchWrapper}
              style={{ backgroundColor: corPrimaria }}
              data-testid="swatch-primaria"
            >
              <input
                type="color"
                className={styles.colorNativeInput}
                value={
                  corPrimaria.startsWith('#') && corPrimaria.length === 7
                    ? corPrimaria
                    : '#1B2A4A'
                }
                onChange={(e) =>
                  onInputChange('corPrimaria', e.target.value.toUpperCase())
                }
                aria-label="Selecionar cor primária"
              />
            </div>
            <input
              id="corPrimariaHex"
              type="text"
              className={`${styles.formInput} ${styles.colorHexInput}`}
              value={formData.corPrimaria || ''}
              onChange={(e) => onInputChange('corPrimaria', e.target.value)}
              placeholder="#1B2A4A"
              maxLength={7}
            />
          </div>
        </div>

        {/* Cor de Acento (Secundária) */}
        <div className={styles.formGroup}>
          <label htmlFor="corSecundariaHex" className={styles.formLabel}>
            Cor de acento (botões, ícones, destaques)
          </label>
          <div className={styles.colorInputRow}>
            <div
              className={styles.colorSwatchWrapper}
              style={{ backgroundColor: corSecundaria }}
              data-testid="swatch-secundaria"
            >
              <input
                type="color"
                className={styles.colorNativeInput}
                value={
                  corSecundaria.startsWith('#') && corSecundaria.length === 7
                    ? corSecundaria
                    : '#B79A63'
                }
                onChange={(e) =>
                  onInputChange('corSecundaria', e.target.value.toUpperCase())
                }
                aria-label="Selecionar cor de acento"
              />
            </div>
            <input
              id="corSecundariaHex"
              type="text"
              className={`${styles.formInput} ${styles.colorHexInput}`}
              value={formData.corSecundaria || ''}
              onChange={(e) => onInputChange('corSecundaria', e.target.value)}
              placeholder="#B79A63"
              maxLength={7}
            />
          </div>
        </div>

        {/* Mini Prévia da Navbar */}
        <div className={styles.navbarPreviewCard}>
          <span className={styles.navbarPreviewHeader}>Prévia da navbar</span>

          <div
            className={styles.navbarMockup}
            style={{ backgroundColor: corPrimaria }}
            data-testid="navbar-mockup"
          >
            <div className={styles.navbarMockupLogo}>
              <Scale size={20} color={corSecundaria} />
              <span>{formData.nomeEscritorio || 'Carreiro Advogados'}</span>
            </div>

            <button
              type="button"
              className={styles.navbarMockupBtn}
              style={{
                backgroundColor: corSecundaria,
                color: '#172133',
              }}
            >
              Acessar Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
