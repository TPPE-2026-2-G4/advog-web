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
  Search,
  UsersRound,
  Calendar,
  Palette,
  Settings,
} from 'lucide-react';
import styles from './sidebar.module.css';

const menuItems = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/processos', icon: Briefcase, label: 'Casos/Processos' },
  { path: '/atividades', icon: CheckSquare, label: 'Atividades' },
  { path: '/financas', icon: DollarSign, label: 'Finanças' },
  { path: '/clientes', icon: Users, label: 'Clientes/CRM' },
  { path: '/pesquisa', icon: Search, label: 'Pesquisa' },
  { path: '/equipe', icon: UsersRound, label: 'Equipe' },
  { path: '/calendario', icon: Calendar, label: 'Calendário' },
  { path: '/site', icon: Palette, label: 'Site' },
  { path: '/ajustes', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>
          <Scale size={20} />
        </div>
        <span className={styles.logoText}>Carreiro Advogados</span>
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
            >
              {isActive && <div className={styles.activeIndicator} />}
              <Icon size={20} className={styles.icon} />
              <span className={styles.navText}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
