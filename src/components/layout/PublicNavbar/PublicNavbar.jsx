'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Scale, Menu, X } from 'lucide-react';
import { getImageUrl, getContrastTextColor } from '@/utils/institucional';
import styles from './PublicNavbar.module.css';

export default function PublicNavbar({
  institucional = {},
  hasTeam = true,
  hasAreas = true,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const corPrimaria = institucional?.corPrimaria || '#1B2A4A';
  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const corSecundariaTexto = getContrastTextColor(corSecundaria);
  const nomeEscritorio = institucional?.nomeEscritorio || 'Carreiro Advogados';
  const logotipo = institucional?.logotipo;

  const navLinks = [
    { label: 'Início', href: '#inicio' },
    ...(hasAreas ? [{ label: 'Áreas de Atuação', href: '#areas' }] : []),
    { label: 'Sobre', href: '#sobre' },
    ...(hasTeam ? [{ label: 'Equipe', href: '#equipe' }] : []),
    { label: 'Contato', href: '#contato' },
  ];

  const handleScrollTo = (e, href) => {
    setIsMenuOpen(false);
    if (!href.startsWith('#')) return;

    if (href === '#inicio') {
      if (typeof window !== 'undefined') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      e.preventDefault();
      const navbarHeight = 76;
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = Math.max(0, elementPosition - navbarHeight);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header
      className={styles.header}
      style={{ backgroundColor: corPrimaria }}
      data-testid="public-navbar"
    >
      <div className={styles.container}>
        {/* Identidade Visual / Logotipo */}
        <Link
          href="#inicio"
          className={styles.brand}
          onClick={(e) => handleScrollTo(e, '#inicio')}
          aria-label={nomeEscritorio}
        >
          {logotipo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getImageUrl(logotipo)}
              alt={`Logotipo ${nomeEscritorio}`}
              className={styles.logoImage}
            />
          ) : (
            <div
              className={styles.logoBadge}
              style={{ backgroundColor: corSecundaria }}
              data-testid="navbar-logo-badge"
            >
              <Scale size={20} color={corPrimaria} />
            </div>
          )}
          <span className={styles.brandName}>{nomeEscritorio}</span>
        </Link>

        {/* Links de navegação Desktop */}
        <nav className={styles.desktopNav} aria-label="Navegação Principal">
          <ul className={styles.navList}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.navLink}
                  onClick={(e) => handleScrollTo(e, link.href)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Botão de Ação (Acessar Painel) Desktop */}
        <div className={styles.desktopActions}>
          <Link
            href="/login"
            className={styles.actionBtn}
            style={{
              backgroundColor: corSecundaria,
              color: corSecundariaTexto,
            }}
          >
            Acessar Painel
          </Link>
        </div>

        {/* Botão Hamburguer Mobile */}
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-label={
            isMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'
          }
          style={{ color: '#ffffff' }}
        >
          {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Menu Dropdown Mobile */}
      {isMenuOpen && (
        <div
          className={styles.mobileMenu}
          style={{ backgroundColor: corPrimaria }}
          data-testid="mobile-menu"
        >
          <nav aria-label="Navegação Mobile">
            <ul className={styles.mobileNavList}>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={styles.mobileNavLink}
                    onClick={(e) => handleScrollTo(e, link.href)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className={styles.mobileActions}>
              <Link
                href="/login"
                className={styles.mobileActionBtn}
                style={{
                  backgroundColor: corSecundaria,
                  color: corSecundariaTexto,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                Acessar Painel
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
