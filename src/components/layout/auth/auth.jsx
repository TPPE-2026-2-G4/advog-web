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

  const renderLogo = ({
    imgClassName,
    badgeClassName,
    imgTestId,
    badgeTestId,
    iconSize,
    decorative = false,
  }) =>
    logotipo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getImageUrl(logotipo)}
        alt={decorative ? '' : `Logotipo ${nomeEscritorio}`}
        aria-hidden={decorative || undefined}
        className={imgClassName}
        data-testid={imgTestId}
      />
    ) : (
      <div
        className={badgeClassName}
        style={{
          backgroundColor: corSecundaria,
          color: corSecundariaTexto,
        }}
        aria-hidden={decorative || undefined}
        data-testid={badgeTestId}
      >
        <Scale size={iconSize} />
      </div>
    );

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
        {renderLogo({
          imgClassName: styles.brandLogo,
          badgeClassName: styles.brandBadge,
          imgTestId: 'auth-logo-img',
          badgeTestId: 'auth-logo-badge',
          iconSize: 32,
        })}

        <h1 className={styles.titleBrand} style={{ color: corPrimariaTexto }}>
          {nomeEscritorio}
        </h1>
        <p className={styles.subtitleBrand} style={{ color: corPrimariaTexto }}>
          Gestão Jurídica de Alta Performance
        </p>
      </section>

      <section className={styles.auth}>
        <div
          className={styles.mobileLogo}
          suppressHydrationWarning
          data-testid="auth-mobile-logo"
        >
          {renderLogo({
            imgClassName: styles.mobileLogoImg,
            badgeClassName: styles.mobileLogoBadge,
            imgTestId: 'auth-mobile-logo-img',
            badgeTestId: 'auth-mobile-logo-badge',
            iconSize: 28,
            decorative: true,
          })}
        </div>

        <h1 className={styles.titleAuth} style={{ color: corPrimaria }}>
          {title}
        </h1>
        <p className={styles.subtitleAuth}>{subtitle}</p>

        {children}
      </section>
    </main>
  );
}
