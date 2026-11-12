import UserMenu from './userMenu';
import { Bell, Menu, X } from 'lucide-react';
import styles from './navbar.module.css';

export default function Navbar({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) {
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
        <button
          className={styles.notificationBtn}
          aria-label="Notificações"
          type="button"
        >
          <Bell size={20} />
          <span className={styles.badge}>2</span>
        </button>

        <div className={styles.divider}></div>

        <UserMenu />
      </div>
    </header>
  );
}
