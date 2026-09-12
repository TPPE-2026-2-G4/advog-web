'use client';

import styles from './site.module.css';

export default function ContentTab({ formData, onInputChange }) {
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
          placeholder="Conte a história, missão e valores do escritório..."
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
