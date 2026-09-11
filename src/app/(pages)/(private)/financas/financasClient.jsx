'use client';

import styles from './financasClient';
import { Plus, Users, UserCheck, Clock } from 'lucide-react';

export default function FinancasClient() {
  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Controle Financeiro</h1>
          <p className={styles.subtitle}>Gestão de receitas e despesas</p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
      </div>
    </div>
  );
}
