'use client';

import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import { formatProcessDate } from '@/utils/processo';
import styles from './ProcessDetailsModal.module.css';

const getStatusStyle = (status) => {
  if (status === 'Ativo') return styles.statusActive;
  if (status === 'Concluído') return styles.statusCompleted;
  if (status === 'Arquivado') return styles.statusArchived;
  return styles.statusPending;
};

export default function ProcessDetailsModal({ process, onClose }) {
  if (!process) return null;

  const titleId = 'process-details-title';

  return (
    <Modal
      isOpen={Boolean(process)}
      onClose={onClose}
      className={styles.modal}
      ariaLabelledBy={titleId}
    >
      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={styles.areaBadge}>{process.area}</span>
          <span
            className={`${styles.statusBadge} ${getStatusStyle(process.status)}`}
          >
            {process.status}
          </span>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          {process.titulo}
        </h2>
        <p className={styles.processNumber}>{process.cnj}</p>

        {process.descricao && <p>{process.descricao}</p>}

        <dl className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <dt>Cliente</dt>
            <dd>{process.cliente}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>Tribunal</dt>
            <dd>{process.tribunal}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>Responsável</dt>
            <dd>{process.responsavel || 'Sem responsável'}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>Data de Início</dt>
            <dd>{formatProcessDate(process.data_inicio)}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>Data de Realização</dt>
            <dd>{formatProcessDate(process.data_realizado)}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>Próximo Prazo</dt>
            <dd>{formatProcessDate(process.data_prazo)}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
