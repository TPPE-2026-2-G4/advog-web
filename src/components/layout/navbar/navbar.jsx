'use client';

import UserMenu from './userMenu';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell/NotificationBell';
import NotificationPopover from './NotificationPopover/NotificationPopover';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useRouter } from 'next/navigation';
import styles from './navbar.module.css';

export default function Navbar({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const router = useRouter();
  const notifications = useNotificacoes();

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
        <div className={styles.notificationContainer}>
          <NotificationBell
            count={notifications.naoLidasCount}
            isOpen={isNotificationsOpen}
            onClick={() => setIsNotificationsOpen((open) => !open)}
          />
          {isNotificationsOpen && (
            <NotificationPopover
              notifications={notifications.notificacoes}
              unreadCount={notifications.naoLidasCount}
              isLoading={notifications.isLoading}
              isLoadingMore={notifications.isLoadingMore}
              hasMore={notifications.hasMore}
              onlyUnread={notifications.apenasNaoLidas}
              error={notifications.error}
              onClose={() => setIsNotificationsOpen(false)}
              onToggleFilter={notifications.alternarFiltro}
              onLoadMore={notifications.carregarMais}
              onRetry={notifications.recarregar}
              onMarkRead={notifications.marcarComoLida}
              onMarkAllRead={notifications.marcarTodasComoLidas}
              onNavigate={(destination) => router.push(destination)}
            />
          )}
        </div>

        <div className={styles.divider}></div>

        <UserMenu />
      </div>
    </header>
  );
}
