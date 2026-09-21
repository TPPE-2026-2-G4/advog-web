/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import styles from './site.module.css';

export default function ContentTab({
  formData,
  onInputChange,
  onUploadImagemSobre,
  sobreImagePreview,
}) {
  const sobreInputRef = useRef(null);

  const handleSobreChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadImagemSobre) {
      onUploadImagemSobre(file);
    }
  };

  const preview = sobreImagePreview || formData.imagemSobre;

  return (
    <div className={styles.card}>
      {/* Seção Textos Institucionais */}
      <h3 className={styles.cardTitle}>Textos Institucionais</h3>

      <div className={styles.formGroup}>
        <label htmlFor="nomeEscritorio" className={styles.formLabel}>
          Nome do escritório
        </label>
        <input
          id="nomeEscritorio"
          type="text"
          className={styles.formInput}
          value={formData.nomeEscritorio || ''}
          onChange={(e) => onInputChange('nomeEscritorio', e.target.value)}
          placeholder="Ex: Carreiro Advogados"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="descricao" className={styles.formLabel}>
          Slogan / subtítulo do hero
        </label>
        <input
          id="descricao"
          type="text"
          className={styles.formInput}
          value={formData.descricao || ''}
          onChange={(e) => onInputChange('descricao', e.target.value)}
          placeholder="Ex: Tradição e excelência na defesa dos seus direitos"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="sobreEscritorio" className={styles.formLabel}>
          Sobre o escritório
        </label>
        <textarea
          id="sobreEscritorio"
          className={styles.formTextarea}
          rows={4}
          value={formData.sobreEscritorio || ''}
          onChange={(e) => onInputChange('sobreEscritorio', e.target.value)}
          placeholder="Fundado em 2010 por Dr. Alexandre Carreiro..."
        />
      </div>

      {/* Imagem da seção "Sobre" */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Imagem da seção &quot;Sobre&quot;
        </label>
        <input
          type="file"
          ref={sobreInputRef}
          onChange={handleSobreChange}
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          data-testid="sobre-file-input"
        />

        {preview ? (
          <div className={styles.aboutPreviewBox}>
            <img
              src={preview}
              alt="Imagem da seção Sobre"
              className={styles.aboutImage}
            />
            <button
              type="button"
              className={styles.aboutReplaceBtn}
              onClick={() => sobreInputRef.current?.click()}
            >
              Substituir imagem
            </button>
          </div>
        ) : (
          <div
            className={styles.aboutUploadArea}
            onClick={() => sobreInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                sobreInputRef.current?.click();
              }
            }}
          >
            <ImageIcon size={36} className={styles.aboutUploadIcon} />
            <span
              style={{ fontSize: '15px', fontWeight: '500', color: '#172133' }}
            >
              Clique para fazer upload
            </span>
            <span className={styles.uploadHelperText}>
              JPG, PNG — recomendado 800×600 px
            </span>
          </div>
        )}
      </div>

      {/* Informações adicionais (exibidas abaixo da descrição) */}
      <div className={styles.formGroup}>
        <label htmlFor="textoAdicionalSobre" className={styles.formLabel}>
          Informações adicionais (exibidas abaixo da descrição)
        </label>
        <textarea
          id="textoAdicionalSobre"
          className={styles.formTextarea}
          rows={3}
          value={formData.textoAdicionalSobre || ''}
          onChange={(e) => onInputChange('textoAdicionalSobre', e.target.value)}
          placeholder="Mais de 500 casos atendidos · 15 anos de atuação · Atendimento personalizado"
        />
      </div>

      <div style={{ height: '24px' }} />

      {/* Seção Dados de contato público */}
      <h3 className={styles.cardTitle}>Dados de contato público</h3>

      <div className={styles.formGroup}>
        <label htmlFor="telefone" className={styles.formLabel}>
          Telefone
        </label>
        <input
          id="telefone"
          type="text"
          className={styles.formInput}
          value={formData.telefone || ''}
          onChange={(e) => onInputChange('telefone', e.target.value)}
          placeholder="Ex: (61) 98765-4321"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.formLabel}>
          Email
        </label>
        <input
          id="email"
          type="email"
          className={styles.formInput}
          value={formData.email || ''}
          onChange={(e) => onInputChange('email', e.target.value)}
          placeholder="Ex: contato@carreiro.adv.br"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="endereco" className={styles.formLabel}>
          Endereço
        </label>
        <input
          id="endereco"
          type="text"
          className={styles.formInput}
          value={formData.endereco || ''}
          onChange={(e) => onInputChange('endereco', e.target.value)}
          placeholder="Ex: SCLN 203, Bloco B — Brasília, DF"
        />
      </div>
    </div>
  );
}
