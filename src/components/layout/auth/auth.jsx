'use client';

import { Scale } from 'lucide-react';
import { useInstitucionalContext } from '@/contexts/InstitucionalContext';
import { getContrastTextColor, getImageUrl } from '@/utils/institucional';
import styles from './auth.module.css';

export default function Auth({
  title,
  subtitle,
  children,
  institucional: customInstitucional,
}) {
  const { institucional: contextInstitucional } = useInstitucionalContext();
  const institucional = customInstitucional || contextInstitucional;

  const nomeEscritorio = institucional?.nomeEscritorio || 'Alexandre Carreiro';
  const corPrimaria = institucional?.corPrimaria || '#172133';
  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const logotipo = institucional?.logotipo;

  const corPrimariaTexto = getContrastTextColor(corPrimaria);
  const corSecundariaTexto = getContrastTextColor(corSecundaria);

  return (
    <main
      className={styles.container}
      suppressHydrationWarning
      style={{
        '--cor-primaria': corPrimaria,
        '--cor-primaria-texto': corPrimariaTexto,
        '--cor-secundaria': corSecundaria,
        '--cor-secundaria-texto': corSecundariaTexto,
      }}
      data-testid="auth-container"
    >
      <section
        className={styles.brand}
        suppressHydrationWarning
        style={{
          backgroundColor: corPrimaria,
          color: corPrimariaTexto,
        }}
        data-testid="auth-brand"
      >
        {logotipo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getImageUrl(logotipo)}
            alt={`Logotipo ${nomeEscritorio}`}
            className={styles.brandLogo}
            data-testid="auth-logo-img"
          />
        ) : (
          <div
            className={styles.brandBadge}
            style={{
              backgroundColor: corSecundaria,
              color: corSecundariaTexto,
            }}
            data-testid="auth-logo-badge"
          >
            <Scale size={32} />
          </div>
        )}

        <h1 className={styles.titleBrand} style={{ color: corPrimariaTexto }}>
          {nomeEscritorio}
        </h1>
        <p className={styles.subtitleBrand} style={{ color: corPrimariaTexto }}>
          Gestão Jurídica de Alta Performance
        </p>
      </section>

      <section className={styles.auth}>
        <h1 className={styles.titleAuth} style={{ color: corPrimaria }}>
          {title}
        </h1>
        <p className={styles.subtitleAuth}>{subtitle}</p>

        {children}
      </section>
    </main>
  );
}
