'use client';

import { useState } from 'react';
import {
  Briefcase,
  Scale,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import styles from './site.module.css';

export default function AreasTab({
  areas = [],
  onToggleArea,
  onCreateArea,
  onUpdateArea,
  onDeleteArea,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formError, setFormError] = useState('');
  const [areaToDelete, setAreaToDelete] = useState(null);

  const visibleCount = areas.filter(
    (area) => area.exibicaoInstitucional
  ).length;
  const totalCount = areas.length;

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitulo('');
    setDescricao('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (area) => {
    setEditingId(area.atuacao_id);
    setTitulo(area.titulo || area.nome || '');
    setDescricao(area.descricao || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTitulo('');
    setDescricao('');
    setFormError('');
  };

  const handleConfirmDelete = async () => {
    const idToDelete = areaToDelete.atuacao_id;
    setAreaToDelete(null);
    await onDeleteArea?.(idToDelete);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const tituloLimpo = titulo.trim();
    const descricaoLimpa = descricao.trim();

    if (tituloLimpo.length < 2 || descricaoLimpa.length < 2) {
      setFormError(
        'Informe o título e a descrição com pelo menos 2 caracteres.'
      );
      return;
    }

    setFormError('');
    try {
      if (editingId !== null) {
        await onUpdateArea?.(editingId, {
          nome: tituloLimpo,
          descricao: descricaoLimpa,
        });
      } else {
        await onCreateArea?.({
          nome: tituloLimpo,
          descricao: descricaoLimpa,
          exibicaoInstitucional: true,
        });
      }
      handleCloseForm();
    } catch (err) {
      setFormError(err.message || 'Não foi possível salvar a área de atuação.');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.areaHeaderRow}>
        <div>
          <div className={styles.teamCardHeader}>
            <Briefcase size={20} color="#b79a63" />
            <h3>Áreas de Atuação exibidas no site</h3>
          </div>
          <p className={styles.cardDescription}>
            Cadastre, edite e selecione quais áreas de atuação jurídica aparecem
            na página institucional.
          </p>
        </div>

        <button
          type="button"
          className={styles.areaAddBtn}
          onClick={handleOpenCreate}
        >
          <Plus size={16} />
          Nova Área
        </button>
      </div>

      {isFormOpen && (
        <form className={styles.areaFormCard} onSubmit={handleSubmitForm}>
          <h4 className={styles.areaFormTitle}>
            {editingId !== null
              ? 'Editar área de atuação'
              : 'Nova área de atuação'}
          </h4>

          {formError && (
            <div
              className={styles.alertError}
              role="alert"
              style={{ marginBottom: '12px' }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="area-titulo" className={styles.formLabel}>
              Título da área
              <span className={styles.requiredAsterisk}>*</span>
            </label>
            <input
              id="area-titulo"
              type="text"
              className={styles.formInput}
              placeholder="Ex: Direito Civil"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="area-descricao" className={styles.formLabel}>
              Descrição da área
              <span className={styles.requiredAsterisk}>*</span>
            </label>
            <textarea
              id="area-descricao"
              className={styles.formTextarea}
              style={{ minHeight: '72px' }}
              placeholder="Ex: Contratos, responsabilidade civil, família e sucessões."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className={styles.areaFormActions}>
            <button
              type="button"
              className={styles.areaCancelBtn}
              onClick={handleCloseForm}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.areaSaveBtn}>
              {editingId !== null ? 'Salvar área' : 'Adicionar área'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.teamList}>
        {areas.map((area) => {
          const nomeArea = area.titulo || area.nome;
          const isVisible = Boolean(area.exibicaoInstitucional);

          return (
            <div key={area.atuacao_id} className={styles.teamItem}>
              <div className={styles.teamMemberLeft}>
                <div className={styles.areaAvatar}>
                  <Scale size={20} />
                </div>
                <div className={styles.teamInfo}>
                  <span className={styles.teamName}>{nomeArea}</span>
                  <span className={styles.teamRole}>{area.descricao}</span>
                </div>
              </div>

              <div className={styles.areaActions}>
                <button
                  type="button"
                  className={styles.areaIconBtn}
                  aria-label={`Editar ${nomeArea}`}
                  onClick={() => handleOpenEdit(area)}
                >
                  <Pencil size={15} />
                </button>

                <button
                  type="button"
                  className={`${styles.areaIconBtn} ${styles.areaIconBtnDanger}`}
                  aria-label={`Excluir ${nomeArea}`}
                  onClick={() => setAreaToDelete(area)}
                >
                  <Trash2 size={15} />
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isVisible}
                  aria-label={`Exibir ${nomeArea} no site`}
                  className={`${styles.toggleSwitch} ${
                    isVisible ? styles.toggleSwitchActive : ''
                  }`}
                  onClick={() => onToggleArea?.(area.atuacao_id)}
                >
                  <span
                    className={`${styles.toggleThumb} ${
                      isVisible ? styles.toggleThumbActive : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.teamFooter}>
        <Check size={16} className={styles.teamFooterCheck} />
        <span>
          {visibleCount} de {totalCount} áreas de atuação visíveis no site
          institucional
        </span>
      </div>

      {areaToDelete && (
        <div
          className={styles.deleteModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAreaToDelete(null);
          }}
        >
          <div
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-area-modal-title"
          >
            <div className={styles.deleteModalHeader}>
              <div className={styles.deleteModalIcon}>
                <AlertTriangle size={22} />
              </div>
              <button
                type="button"
                className={styles.deleteModalClose}
                aria-label="Fechar"
                onClick={() => setAreaToDelete(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.deleteModalBody}>
              <h2
                id="delete-area-modal-title"
                className={styles.deleteModalTitle}
              >
                Excluir área de atuação?
              </h2>
              <p className={styles.deleteModalMessage}>
                Tem certeza que deseja excluir a área{' '}
                <strong>{areaToDelete.titulo || areaToDelete.nome}</strong>?
                Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className={styles.deleteModalFooter}>
              <button
                type="button"
                className={styles.deleteModalCancelBtn}
                onClick={() => setAreaToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.deleteModalConfirmBtn}
                onClick={handleConfirmDelete}
              >
                Excluir área
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
