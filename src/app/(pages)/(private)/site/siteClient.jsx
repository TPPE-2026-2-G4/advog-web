'use client';

import {
  Eye,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useInstitucional } from '@/hooks/useInstitucional';
import VisualIdentityTab from '@/components/ui/site/visualIdentityTab';
import ContentTab from '@/components/ui/site/contentTab';
import ColorsTab from '@/components/ui/site/colorsTab';
import PreviewModal from '@/components/ui/site/previewModal';
import styles from '@/components/ui/site/site.module.css';

export default function SiteClient({ initialData, isAdmin = true }) {
  const {
    formData,
    activeTab,
    setActiveTab,
    isPreviewOpen,
    setIsPreviewOpen,
    isSaving,
    saveSuccess,
    saveError,
    uploadError,
    logoPreview,
    bannerPreview,
    handleInputChange,
    handleUploadLogo,
    handleUploadBanner,
    handleSave,
  } = useInstitucional(initialData, { isAdmin });

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div
          className={styles.card}
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <ShieldAlert
            size={48}
            color="#ef4444"
            style={{ margin: '0 auto 16px' }}
          />
          <h2 className={styles.cardTitle}>Acesso Restrito</h2>
          <p className={styles.cardDescription}>
            Apenas administradores possuem permissão para visualizar e editar as
            configurações do site institucional público.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Topo / Cabeçalho da Página */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Personalização do Site</h1>
          <p className={styles.subtitle}>
            Gerencie as configurações do site institucional público
          </p>
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.previewButton}
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye size={18} />
            Ver prévia
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={18} />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Alertas de Sucesso / Erro */}
      {saveSuccess && (
        <div className={styles.alertSuccess} role="status">
          <CheckCircle2 size={18} />
          <span>Configurações do site salvas com sucesso!</span>
        </div>
      )}

      {saveError && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Barra de Abas */}
      <div className={styles.tabsBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'visual'}
          className={`${styles.tabItem} ${
            activeTab === 'visual' ? styles.tabItemActive : ''
          }`}
          onClick={() => setActiveTab('visual')}
        >
          Identidade Visual
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'content'}
          className={`${styles.tabItem} ${
            activeTab === 'content' ? styles.tabItemActive : ''
          }`}
          onClick={() => setActiveTab('content')}
        >
          Conteúdo
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'colors'}
          className={`${styles.tabItem} ${
            activeTab === 'colors' ? styles.tabItemActive : ''
          }`}
          onClick={() => setActiveTab('colors')}
        >
          Cores
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'visual' && (
        <VisualIdentityTab
          logoPreview={logoPreview}
          bannerPreview={bannerPreview}
          onUploadLogo={handleUploadLogo}
          onUploadBanner={handleUploadBanner}
          uploadError={uploadError}
        />
      )}

      {activeTab === 'content' && (
        <ContentTab formData={formData} onInputChange={handleInputChange} />
      )}

      {activeTab === 'colors' && (
        <ColorsTab formData={formData} onInputChange={handleInputChange} />
      )}

      {/* Modal de Prévia em Tempo Real */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        formData={formData}
      />
    </div>
  );
}
