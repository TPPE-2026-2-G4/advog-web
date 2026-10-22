'use client';

import { File, FileText } from 'lucide-react';
import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('resumo');

  if (!process) return null;

  const titleId = 'process-details-title';

  const hasSyncDate = Boolean(process.data_realizado);
  const syncDateFormatted = formatProcessDate(process.data_realizado);

  return (
    <Modal
      isOpen={Boolean(process)}
      onClose={onClose}
      className={styles.modal}
      ariaLabelledBy={titleId}
    >
      <div className={styles.header}>
        <div className={styles.badges}>
          <span className={styles.areaBadge}>{process.area || 'Geral'}</span>
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

        {process.descricao && (
          <p className={styles.description}>{process.descricao}</p>
        )}

        <div className={styles.tabsContainer}>
          <div className={styles.tabsList} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'resumo'}
              className={`${styles.tabButton} ${activeTab === 'resumo' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('resumo')}
            >
              Resumo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'movimentacoes'}
              className={`${styles.tabButton} ${activeTab === 'movimentacoes' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('movimentacoes')}
            >
              Movimentações
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'documentos'}
              className={`${styles.tabButton} ${activeTab === 'documentos' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('documentos')}
            >
              Documentos
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'resumo' && (
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
                  <dd>{syncDateFormatted}</dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Próximo Prazo</dt>
                  <dd>{formatProcessDate(process.data_prazo)}</dd>
                </div>
              </dl>
            )}

            {activeTab === 'movimentacoes' && (
              <div className={styles.movementsList}>
                <div className={styles.movementItem}>
                  <div className={styles.movementIconWrapper}>
                    <FileText size={16} aria-hidden="true" />
                  </div>
                  <div className={styles.movementInfo}>
                    <p className={styles.movementTitle}>
                      {hasSyncDate
                        ? 'Atualização de Movimentação Sincronizada'
                        : 'Decisão Publicada'}
                    </p>
                    <p className={styles.movementMeta}>
                      {hasSyncDate
                        ? `${syncDateFormatted}`
                        : 'Sincronizado recentemente'}{' '}
                      — <span className={styles.movementTag}>DataJud</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documentos' && (
              <div className={styles.emptyDocuments}>
                <File
                  className={styles.emptyDocumentsIcon}
                  aria-hidden="true"
                />
                <p className={styles.emptyDocumentsText}>
                  Nenhum documento anexado.
                </p>
                <button type="button" className={styles.uploadButton}>
                  Fazer Upload
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
