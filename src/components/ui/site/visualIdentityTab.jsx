/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef } from 'react';
import { Scale, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import styles from './site.module.css';

export default function VisualIdentityTab({
  logoPreview,
  bannerPreview,
  onUploadLogo,
  onUploadBanner,
  uploadError,
}) {
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadLogo(file);
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadBanner(file);
    }
  };

  return (
    <div className={styles.container}>
      {uploadError && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Card Logotipo */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Logotipo</h3>
        <p className={styles.cardDescription}>
          Logotipo atual (símbolo padrão)
        </p>

        <div className={styles.logoUploadRow}>
          <div className={styles.logoBox}>
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logotipo do escritório"
                className={styles.logoImage}
              />
            ) : (
              <Scale size={32} />
            )}
          </div>

          <div className={styles.uploadActions}>
            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoChange}
              accept="image/png,image/svg+xml"
              style={{ display: 'none' }}
              data-testid="logo-file-input"
            />
            <button
              type="button"
              className={styles.uploadOutlineBtn}
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload size={16} />
              Fazer upload
            </button>
            <span className={styles.uploadHelperText}>
              PNG ou SVG — máx. 2 MB, 200×200 px
            </span>
          </div>
        </div>
      </div>

      {/* Card Imagem do Banner (Hero) */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Imagem do Banner (Hero)</h3>

        <input
          type="file"
          ref={bannerInputRef}
          onChange={handleBannerChange}
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          data-testid="banner-file-input"
        />

        {bannerPreview ? (
          <div className={styles.bannerPreviewBox}>
            <img
              src={bannerPreview}
              alt="Banner Hero"
              className={styles.bannerImage}
            />
            <button
              type="button"
              className={styles.bannerReplaceBtn}
              onClick={() => bannerInputRef.current?.click()}
            >
              Substituir imagem
            </button>
          </div>
        ) : (
          <div
            className={styles.bannerUploadArea}
            onClick={() => bannerInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                bannerInputRef.current?.click();
              }
            }}
          >
            <ImageIcon size={40} className={styles.bannerUploadIcon} />
            <span
              style={{ fontSize: '15px', fontWeight: '500', color: '#172133' }}
            >
              Clique para fazer upload
            </span>
            <span className={styles.uploadHelperText}>
              JPG, PNG — mínimo 1920×600 px
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
