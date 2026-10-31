'use client';

import { File, FileText } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import { formatProcessDate } from '@/utils/processo';
import {
  listarDocumentos,
  obterUrlDocumento,
  uploadDocumento,
} from '@/services/processos';
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
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const fileInputRef = useRef(null);

  const processoId = process?.processo_id;

  const loadDocuments = useCallback(async () => {
    if (!processoId) return;
    setIsLoadingDocs(true);
    setDocsError('');
    try {
      const data = await listarDocumentos(processoId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setDocsError(
        err instanceof Error ? err.message : 'Falha ao carregar documentos.'
      );
    } finally {
      setIsLoadingDocs(false);
    }
  }, [processoId]);

  useEffect(() => {
    let ignore = false;
    if (activeTab === 'documentos' && processoId) {
      listarDocumentos(processoId)
        .then((data) => {
          if (!ignore) {
            setDocuments(Array.isArray(data) ? data : []);
            setDocsError('');
          }
        })
        .catch((err) => {
          if (!ignore) {
            setDocsError(
              err instanceof Error
                ? err.message
                : 'Falha ao carregar documentos.'
            );
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeTab, processoId]);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !processoId) return;
    setIsUploading(true);
    setDocsError('');
    try {
      await uploadDocumento(processoId, file);
      await loadDocuments();
    } catch (err) {
      setDocsError(
        err instanceof Error ? err.message : 'Falha ao enviar documento.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewDoc = async (docId) => {
    try {
      const res = await obterUrlDocumento(processoId, docId);
      if (res?.url) {
        window.open(res.url, '_blank');
      }
    } catch (err) {
      setDocsError(
        err instanceof Error ? err.message : 'Falha ao abrir documento.'
      );
    }
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
              <div className={styles.movementsList}>
                {process.data_realizado ? (
                  <div className={styles.movementItem}>
                    <div className={styles.movementIconWrapper}>
                      <FileText size={16} aria-hidden="true" />
                    </div>
                    <div className={styles.movementInfo}>
                      <p className={styles.movementTitle}>
                        Atualização de Movimentação Sincronizada
                      </p>
                      <p className={styles.movementMeta}>
                        <span>{formatProcessDate(process.data_realizado)}</span>
                        <span>—</span>
                        <span className={styles.movementTag}>DataJud</span>
                      </p>
                    </div>
                  </div>
                ) : null}

                {process.data_inicio ? (
                  <div className={styles.movementItem}>
                    <div className={styles.movementIconWrapper}>
                      <FileText size={16} aria-hidden="true" />
                    </div>
                    <div className={styles.movementInfo}>
                      <p className={styles.movementTitle}>
                        Distribuição Inicial do Processo
                      </p>
                      <p className={styles.movementMeta}>
                        <span>{formatProcessDate(process.data_inicio)}</span>
                        <span>—</span>
                        <span>{process.tribunal || 'Tribunal de Origem'}</span>
                      </p>
                    </div>
                  </div>
                ) : null}

                {!process.data_realizado && !process.data_inicio && (
                  <div className={styles.emptyDocuments}>
                    <FileText
                      className={styles.emptyDocumentsIcon}
                      aria-hidden="true"
                    />
                    <p className={styles.emptyDocumentsText}>
                      Nenhuma movimentação registrada para este processo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documentos' && (
              <div className={styles.documentsContainer}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  data-testid="file-upload-input"
                />

                {docsError && (
                  <div role="alert" className={styles.refreshError}>
                    {docsError}
                  </div>
                )}

                {isLoadingDocs ? (
                  <div className={styles.emptyDocuments}>
                    <p className={styles.emptyDocumentsText}>
                      Carregando documentos…
                    </p>
                  </div>
                ) : documents.length > 0 ? (
                  <>
                    <div className={styles.documentsHeader}>
                      <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={handleUploadClick}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Enviando…' : '+ Adicionar Documento'}
                      </button>
                    </div>
                    <div className={styles.documentsList}>
                      {documents.map((doc) => (
                        <div
                          key={doc.documento_id}
                          className={styles.documentItem}
                        >
                          <div className={styles.documentMain}>
                            <File
                              size={20}
                              className={styles.documentIcon}
                              aria-hidden="true"
                            />
                            <div>
                              <p className={styles.documentName}>
                                {doc.nome_original}
                              </p>
                              <p className={styles.documentMeta}>
                                {(doc.tamanho_bytes / 1024).toFixed(1)} KB •{' '}
                                {formatProcessDate(doc.data_upload)}
                              </p>
                            </div>
                          </div>
                          <div className={styles.documentActions}>
                            <button
                              type="button"
                              className={styles.docActionBtn}
                              onClick={() => handleViewDoc(doc.documento_id)}
                            >
                              Visualizar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyDocuments}>
                    <File
                      className={styles.emptyDocumentsIcon}
                      aria-hidden="true"
                    />
                    <p className={styles.emptyDocumentsText}>
                      Nenhum documento anexado.
                    </p>
                    <button
                      type="button"
                      className={styles.uploadButton}
                      onClick={handleUploadClick}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Enviando…' : 'Fazer Upload'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
