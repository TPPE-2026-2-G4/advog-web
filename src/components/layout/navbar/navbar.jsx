import UserMenu from './userMenu';
import { Bell } from 'lucide-react';
import styles from './navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.actions}>
        <button className={styles.notificationBtn}>
          <Bell size={20} />
          <span className={styles.badge}>2</span>
        </button>

        <div className={styles.divider}></div>

        <UserMenu />
      </div>
    </header>
  );
}
