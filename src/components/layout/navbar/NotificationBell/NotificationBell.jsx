'use client';

import { Bell } from 'lucide-react';
import { formatarBadgeContagem } from '@/utils/notificacao';
import styles from './NotificationBell.module.css';

export default function NotificationBell({
  count = 0,
  isOpen = false,
  onClick,
}) {
  const badge = formatarBadgeContagem(count);

  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label="Notificações"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls="notifications-popover"
    >
      <Bell size={20} />
      {badge && (
        <span className={styles.badge} aria-live="polite">
          {badge}
        </span>
      )}
    </button>
  );
}
