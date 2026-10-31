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

export default function ProcessDetailsModal({
  process,
  onClose,
  error,
  onRetry,
}) {
  const [activeTab, setActiveTab] = useState('resumo');

  if (!process) return null;

  const titleId = 'process-details-title';

  const tabs = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'movimentacoes', label: 'Movimentações' },
    { id: 'documentos', label: 'Documentos' },
  ];
  const tabId = (id) => `process-${process.processo_id}-${id}`;
  const handleTabKeyDown = (event, index) => {
    const positions = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const nextIndex = positions[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    document.getElementById(tabId(tabs[nextIndex].id))?.focus();
  };

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
          <div
            className={styles.tabsList}
            role="tablist"
            aria-label="Detalhes do processo"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={tabId(tab.id)}
                type="button"
                role="tab"
                aria-controls={`${tabId(tab.id)}-panel`}
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {error && (
            <div role="alert" className={styles.refreshError}>
              <p>{error} Os dados exibidos podem estar desatualizados.</p>
              <button type="button" onClick={onRetry}>
                Tentar novamente
              </button>
            </div>
          )}
          <div
            className={styles.tabContent}
            role="tabpanel"
            id={`${tabId(activeTab)}-panel`}
            aria-labelledby={tabId(activeTab)}
            tabIndex={0}
          >
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
                  <dd>{formatProcessDate(process.data_realizado)}</dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Próximo Prazo</dt>
                  <dd>{formatProcessDate(process.data_prazo)}</dd>
                </div>
              </dl>
            )}

            {activeTab === 'movimentacoes' && (
              <div className={styles.emptyDocuments}>
                <FileText
                  className={styles.emptyDocumentsIcon}
                  aria-hidden="true"
                />
                <p className={styles.emptyDocumentsText}>
                  O histórico de movimentações ainda não está disponível.
                </p>
                <p className={styles.emptyHint}>
                  Consulte os dados atuais do processo na aba Resumo.
                </p>
              </div>
            )}

            {activeTab === 'documentos' && (
              <div className={styles.emptyDocuments}>
                <File
                  className={styles.emptyDocumentsIcon}
                  aria-hidden="true"
                />
                <p className={styles.emptyDocumentsText}>
                  A consulta de documentos ainda não está disponível nesta tela.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
