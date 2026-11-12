'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/navbar/navbar';
import Sidebar from '@/components/layout/sidebar/sidebar';
import { useInstitucionalContext } from '@/contexts/InstitucionalContext';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { getContrastTextColor } from '@/utils/institucional';
import styles from './privateLayout.module.css';

export default function PrivateLayout({ children }) {
  const { institucional } = useInstitucionalContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useSessionGuard();

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const corPrimaria = institucional?.corPrimaria || '#172133';
  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const corPrimariaTexto = getContrastTextColor(corPrimaria);
  const corSecundariaTexto = getContrastTextColor(corSecundaria);

  return (
    <div
      className={styles.layout}
      suppressHydrationWarning
      style={{
        '--cor-primaria': corPrimaria,
        '--cor-primaria-texto': corPrimariaTexto,
        '--cor-secundaria': corSecundaria,
        '--cor-secundaria-texto': corSecundariaTexto,
      }}
    >
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className={styles.contentContainer}>
        <Navbar
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
}
