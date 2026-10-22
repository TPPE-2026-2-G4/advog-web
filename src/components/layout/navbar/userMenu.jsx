'use client';

import {
  useState,
  useRef,
  useEffect,
  useContext,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import styles from './navbar.module.css';
import LogoutConfirmModal from './LogoutConfirmModal/LogoutConfirmModal';
import { AuthContext } from '@/contexts/AuthContext';
import { clearAuthSession, getCurrentUser } from '@/utils/authSession';
import { getInitials } from '@/utils/funcionario';

const emptySubscribe = () => () => {};

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const auth = useContext(AuthContext);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenLogoutModal = () => {
    setIsOpen(false);
    setIsLogoutModalOpen(true);
  };

  const handleCloseLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    setIsLoggedOut(true);
    if (auth?.logout) {
      auth.logout();
    } else if (typeof clearAuthSession === 'function') {
      clearAuthSession();
    }
    router.push('/login');
  };

  const activeUser = isLoggedOut
    ? null
    : auth?.user || (mounted ? getCurrentUser() : null);

  if (!mounted || !activeUser) return null;

  const getShortName = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  const userName = activeUser.nome || activeUser.nome_func || '';
  const shortName = getShortName(userName);
  const userInitials = getInitials(userName);
  const userRole =
    typeof activeUser.cargo === 'string'
      ? activeUser.cargo
      : activeUser.cargo?.nome_cargo ||
        activeUser.cargo?.nome ||
        activeUser.nome_cargo ||
        '';
  const userEmail = activeUser.email || activeUser.email_func || '';

  return (
    <>
      <div className={styles.userMenuContainer} ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={styles.triggerBtn}
        >
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
              <button
                type="button"
                onClick={handleOpenLogoutModal}
                className={`${styles.menuItem} ${styles.logoutItem}`}
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={handleCloseLogoutModal}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
