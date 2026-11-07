'use client';

import { AlertTriangle, Eye, File, FileText, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import { formatProcessDate } from '@/utils/processo';
import {
  excluirDocumento,
  listarDocumentos,
  listarMovimentacoes,
  obterUrlDocumento,
  uploadDocumento,
} from '@/services/processos';
import styles from './ProcessDetailsModal.module.css';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'];

const MOVEMENT_TYPE_LABELS = {
  CRIACAO_PROCESSO: 'Criação do Processo',
  ATUALIZACAO_PROCESSO: 'Atualização de Status',
  SINCRONIZACAO_TRIBUNAL: 'DataJud',
  UPLOAD_ARQUIVO: 'Documento Anexado',
  EXCLUSAO_ARQUIVO: 'Documento Removido',
  CRIACAO_ATIVIDADE: 'Nova Atividade',
  ATUALIZACAO_ETAPA_ATIVIDADE: 'Etapa de Atividade',
  EXCLUSAO_ATIVIDADE: 'Atividade Removida',
};

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
  canEdit = true,
}) {
  const [activeTab, setActiveTab] = useState('resumo');
  const [movements, setMovements] = useState([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [movementsError, setMovementsError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState('');
  const [docsError, setDocsError] = useState('');
  const fileInputRef = useRef(null);

  const processoId = process?.processo_id ?? process?.id;

  const reloadDocuments = useCallback(async () => {
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
    if (activeTab !== 'movimentacoes' || !processoId) return;

    let isSubscribed = true;

    listarMovimentacoes(processoId)
      .then((data) => {
        if (isSubscribed) {
          setMovements(Array.isArray(data) ? data : []);
          setMovementsError('');
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          setMovementsError(
            err instanceof Error
              ? err.message
              : 'Falha ao carregar movimentações.'
          );
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingMovements(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeTab, processoId, process?.status, process?.data_realizado]);

  useEffect(() => {
    if (activeTab !== 'documentos' || !processoId) return;

    let isSubscribed = true;

    listarDocumentos(processoId)
      .then((data) => {
        if (isSubscribed) {
          setDocuments(Array.isArray(data) ? data : []);
          setDocsError('');
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          setDocsError(
            err instanceof Error ? err.message : 'Falha ao carregar documentos.'
          );
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingDocs(false);
        }
      });

    return () => {
      isSubscribed = false;
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

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'movimentacoes') {
      setIsLoadingMovements(true);
    } else if (tabKey === 'documentos') {
      setIsLoadingDocs(true);
    }
  };

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
    handleSelectTab(tabs[nextIndex].id);
    document.getElementById(tabId(tabs[nextIndex].id))?.focus();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !processoId) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      setDocsError(
        'Formato inválido. Envie arquivos PDF, DOCX, DOC, PNG ou JPG.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setDocsError('O arquivo excede o limite máximo permitido de 25MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setDocsError('');
    try {
      await uploadDocumento(processoId, file);
      await reloadDocuments();
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

  const handleViewDoc = async (doc) => {
    const directUrl = typeof doc === 'object' ? doc?.url : null;
    if (directUrl) {
      window.open(directUrl, '_blank');
      return;
    }
    const docId = typeof doc === 'object' ? doc.documento_id : doc;
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

  const openDeleteConfirm = (doc) => {
    setDocToDelete(doc);
    setDeleteModalError('');
  };

  const closeDeleteConfirm = () => {
    if (!isDeletingDoc) {
      setDocToDelete(null);
      setDeleteModalError('');
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete || !processoId) return;
    setIsDeletingDoc(true);
    setDeleteModalError('');
    try {
      await excluirDocumento(processoId, docToDelete.documento_id);
      setDocToDelete(null);
      await reloadDocuments();
    } catch (err) {
      setDeleteModalError(
        err instanceof Error ? err.message : 'Falha ao excluir documento.'
      );
    } finally {
      setIsDeletingDoc(false);
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
          <div className={styles.tabsHeaderRow}>
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
                  onClick={() => handleSelectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'documentos' && canEdit && (
              <button
                type="button"
                className={styles.tabAddDocButton}
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? 'Enviando…' : 'Adicionar Documento'}
              </button>
            )}
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
                  <dd>{process.tribunal || 'Tribunal de Origem'}</dd>
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
                {movementsError && (
                  <div role="alert" className={styles.refreshError}>
                    {movementsError}
                  </div>
                )}

                {isLoadingMovements ? (
                  <div className={styles.emptyDocuments}>
                    <p className={styles.emptyDocumentsText}>
                      Carregando movimentações…
                    </p>
                  </div>
                ) : movements.length > 0 ? (
                  movements.map((mov) => {
                    const isDataJud =
                      mov.tipo_movimentacao === 'SINCRONIZACAO_TRIBUNAL';
                    const typeLabel =
                      MOVEMENT_TYPE_LABELS[mov.tipo_movimentacao] ||
                      mov.tipo_movimentacao;

                    return (
                      <div
                        key={mov.movimentacao_id}
                        className={styles.movementItem}
                      >
                        <div className={styles.movementIconWrapper}>
                          <FileText size={16} aria-hidden="true" />
                        </div>
                        <div className={styles.movementInfo}>
                          <p className={styles.movementTitle}>
                            {mov.descricao}
                          </p>
                          <p className={styles.movementMeta}>
                            <span>
                              {formatProcessDate(mov.data_movimentacao)}
                            </span>
                            <span>—</span>
                            {isDataJud ? (
                              <span className={styles.movementTag}>
                                {typeLabel}
                              </span>
                            ) : (
                              <span>{typeLabel}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
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
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
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
                  <div className={styles.documentsList}>
                    {documents.map((doc) => (
                      <div
                        key={doc.documento_id}
                        className={styles.documentItem}
                      >
                        <div className={styles.documentMain}>
                          <div className={styles.documentIconWrapper}>
                            <FileText size={16} aria-hidden="true" />
                          </div>
                          <div className={styles.documentInfo}>
                            <p className={styles.documentName}>
                              {doc.nome_original}
                            </p>
                            <p className={styles.documentMeta}>
                              <span>
                                {(doc.tamanho_bytes / 1024).toFixed(1)} KB
                              </span>
                              <span>—</span>
                              <span>{formatProcessDate(doc.data_upload)}</span>
                            </p>
                          </div>
                        </div>
                        <div className={styles.documentActions}>
                          <button
                            type="button"
                            className={styles.docIconButton}
                            onClick={() => handleViewDoc(doc)}
                            aria-label="Visualizar"
                            title="Visualizar documento"
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              className={`${styles.docIconButton} ${styles.docDeleteIconButton}`}
                              onClick={() => openDeleteConfirm(doc)}
                              aria-label={`Excluir documento ${doc.nome_original}`}
                              title="Excluir documento"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyDocuments}>
                    <File
                      className={styles.emptyDocumentsIcon}
                      aria-hidden="true"
                    />
                    <p className={styles.emptyDocumentsText}>
                      Nenhum documento anexado.
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={handleUploadClick}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Enviando…' : 'Fazer Upload'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {docToDelete && (
        <Modal
          isOpen={Boolean(docToDelete)}
          onClose={closeDeleteConfirm}
          preventClose={isDeletingDoc}
          className={styles.deleteConfirmModal}
          overlayClassName={styles.deleteConfirmOverlay}
          ariaLabelledBy="delete-doc-modal-title"
        >
          <div className={styles.deleteConfirmHeader}>
            <div className={styles.deleteConfirmIconWrapper}>
              <AlertTriangle size={22} aria-hidden="true" />
            </div>
            <ModalCloseButton
              onClose={closeDeleteConfirm}
              disabled={isDeletingDoc}
            />
          </div>

          <div className={styles.deleteConfirmBody}>
            <h3
              id="delete-doc-modal-title"
              className={styles.deleteConfirmTitle}
            >
              Excluir documento?
            </h3>
            <p className={styles.deleteConfirmMessage}>
              Tem certeza que deseja excluir o documento{' '}
              <strong>{docToDelete.nome_original}</strong>? Esta ação não poderá
              ser desfeita.
            </p>
            {deleteModalError && (
              <p className={styles.deleteConfirmError} role="alert">
                {deleteModalError}
              </p>
            )}
          </div>

          <div className={styles.deleteConfirmFooter}>
            <button
              type="button"
              className={styles.deleteConfirmCancelBtn}
              onClick={closeDeleteConfirm}
              disabled={isDeletingDoc}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.deleteConfirmDeleteBtn}
              onClick={handleConfirmDelete}
              disabled={isDeletingDoc}
            >
              {isDeletingDoc ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
