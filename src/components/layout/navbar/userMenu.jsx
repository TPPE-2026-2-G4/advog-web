'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import styles from './navbar.module.css';
import { getCurrentUser } from '@/utils/authSession';
import { getInitials } from '@/utils/funcionario';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());

    setMounted(true);

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted || !user) return null;

  const getShortName = (name) => {
    if (!name) return 'Usuário';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  const userName = user?.nome || user?.nome_func || 'Usuário Logado';
  const shortName = getShortName(userName);
  const userInitials = user ? getInitials(userName) : 'US';
  const userRole =
    typeof user?.cargo === 'string'
      ? user.cargo
      : user?.cargo?.nome_cargo || user?.cargo?.nome || 'Advogado(a)';
  const userEmail = user?.email || user?.email_func || 'usuario@adv.br';

  return (
    <div className={styles.userMenuContainer} ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.triggerBtn}>
        <div className={styles.avatar}>{userInitials}</div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{shortName}</p>
          <p className={styles.userRole}>{userRole}</p>
        </div>
        <ChevronDown size={16} className={styles.chevron} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownName}>{userName}</p>
            <p className={styles.dropdownEmail}>{userEmail}</p>
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
