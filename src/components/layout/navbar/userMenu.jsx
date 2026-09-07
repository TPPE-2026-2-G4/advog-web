'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import styles from './navbar.module.css';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.userMenuContainer} ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.triggerBtn}>
        <div className={styles.avatar}>AC</div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>Alexandre C.</p>
          <p className={styles.userRole}>Advogado(a)</p>
        </div>
        <ChevronDown size={16} className={styles.chevron} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownName}>Alexandre Carreiro</p>
            <p className={styles.dropdownEmail}>alexandre@carreiro.adv.br</p>
          </div>

          <div className={styles.menuGroup}>
            <button className={styles.menuItem}>
              <User size={16} className={styles.icon} />
              Meu perfil
            </button>
            <button className={styles.menuItem}>
              <Settings size={16} className={styles.icon} />
              Configurações
            </button>
          </div>

          <div className={styles.menuGroup} style={{ borderBottom: 'none' }}>
            <button className={`${styles.menuItem} ${styles.logoutItem}`}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
