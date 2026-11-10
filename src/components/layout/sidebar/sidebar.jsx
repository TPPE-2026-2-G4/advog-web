'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Scale,
  Home,
  Briefcase,
  CheckSquare,
  DollarSign,
  Users,
  UsersRound,
  Calendar,
  Palette,
  Settings,
} from 'lucide-react';
import { useInstitucionalContext } from '@/contexts/InstitucionalContext';
import { getImageUrl } from '@/utils/institucional';
import styles from './sidebar.module.css';

const menuItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/processos', icon: Briefcase, label: 'Casos/Processos' },
  { path: '/atividades', icon: CheckSquare, label: 'Atividades' },
  { path: '/financas', icon: DollarSign, label: 'Finanças' },
  { path: '/calendario', icon: Calendar, label: 'Calendário' },
  { path: '/clientes', icon: Users, label: 'Clientes/CRM' },
  { path: '/equipe', icon: UsersRound, label: 'Equipe' },
  { path: '/site', icon: Palette, label: 'Site' },
  { path: '/ajustes', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { institucional } = useInstitucionalContext();

  const corPrimaria = institucional?.corPrimaria || '#172133';
  const corSecundaria = institucional?.corSecundaria || '#B79A63';
  const nomeEscritorio = institucional?.nomeEscritorio || 'Carreiro Advogados';
  const logotipo = institucional?.logotipo;

  return (
    <aside
      className={styles.sidebar}
      suppressHydrationWarning
      style={{
        backgroundColor: corPrimaria,
        '--cor-primaria': corPrimaria,
        '--cor-secundaria': corSecundaria,
      }}
      data-testid="sidebar"
    >
      <div className={styles.logoArea} suppressHydrationWarning>
        {logotipo ? (
          <div className={styles.logoImgWrapper} data-testid="sidebar-logo-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(logotipo)}
              alt={`Logotipo ${nomeEscritorio}`}
              className={styles.logoImg}
            />
          </div>
        ) : (
          <div
            className={styles.logoIcon}
            suppressHydrationWarning
            style={{
              backgroundColor: corSecundaria,
              color: corPrimaria,
            }}
            data-testid="sidebar-logo-icon"
          >
            <Scale size={20} color={corPrimaria} />
          </div>
        )}
        <span
          className={styles.logoText}
          style={{ color: corSecundaria }}
          suppressHydrationWarning
        >
          {nomeEscritorio}
        </span>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              style={isActive ? { color: corSecundaria } : undefined}
            >
              {isActive && (
                <div
                  className={styles.activeIndicator}
                  style={{ backgroundColor: corSecundaria }}
                />
              )}
              <Icon size={20} className={styles.icon} />
              <span className={styles.navText}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
