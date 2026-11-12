import UserMenu from './userMenu';
import { Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell/NotificationBell';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import styles from './navbar.module.css';

export default function Navbar({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) {
  const { naoLidasCount } = useNotificacoes();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.mobileMenuBtn}
        onClick={onToggleMobileMenu}
        aria-expanded={isMobileMenuOpen}
        aria-controls="private-sidebar"
        aria-label={
          isMobileMenuOpen
            ? 'Fechar menu de navegação'
            : 'Abrir menu de navegação'
        }
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={styles.actions}>
        <NotificationBell count={naoLidasCount} />

        <div className={styles.divider}></div>

        <UserMenu />
      </div>
    </header>
  );
}
