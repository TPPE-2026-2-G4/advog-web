'use client';

import {
  Briefcase,
  FileText,
  History,
  Mail,
  Pencil,
  Phone,
  User,
} from 'lucide-react';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import {
  formatarCpfCnpj,
  formatarDataInteracao,
  formatarTelefone,
  obterEtapaPorId,
  obterIniciais,
} from '@/utils/cliente';
import styles from './ClientDetailsModal.module.css';

export default function ClientDetailsModal({
  isOpen,
  onClose,
  onEdit,
  cliente = null,
  funcionarios = [],
}) {
  if (!cliente) return null;

  const etapa = obterEtapaPorId(cliente.etapa_id || cliente.status_id);
  const badgeClass = styles[etapa.variant] || styles.novoContato;

  const getResponsavelNome = () => {
    if (cliente.responsavel_nome) return cliente.responsavel_nome;
    if (cliente.responsavel) {
      if (typeof cliente.responsavel === 'string') return cliente.responsavel;
      if (cliente.responsavel.nome) return cliente.responsavel.nome;
    }
    if (cliente.responsavel_id) {
      const func = funcionarios.find(
        (f) =>
          Number(f.funcionario_id || f.id) === Number(cliente.responsavel_id)
      );
      if (func) return func.nome;
    }
    return 'Não atribuído';
  };

  const documento =
    cliente.cpf || cliente.cnpj || cliente.cpf_cnpj || cliente.documento;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.header}>
        <h2 className={styles.title}>Detalhes do Cliente</h2>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className={styles.body}>
        <div className={styles.clientHero}>
          <div className={styles.clientHeroLeft}>
            <div className={styles.avatar}>{obterIniciais(cliente.nome)}</div>
            <div className={styles.clientTitleArea}>
              <span className={styles.clientName}>{cliente.nome}</span>
              {documento && (
                <span className={styles.clientDoc}>
                  {formatarCpfCnpj(documento)}
                </span>
              )}
            </div>
          </div>

          <span className={`${styles.badge} ${badgeClass}`}>{etapa.label}</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <FileText size={18} className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>CPF / CNPJ</span>
              <span className={styles.infoValue}>
                {documento ? formatarCpfCnpj(documento) : '-'}
              </span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <Phone size={18} className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Telefone</span>
              <span className={styles.infoValue}>
                {cliente.telefone ? formatarTelefone(cliente.telefone) : '-'}
              </span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <Mail size={18} className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{cliente.email || '-'}</span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <User size={18} className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Responsável</span>
              <span className={styles.infoValue}>{getResponsavelNome()}</span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <Briefcase size={18} className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Área de interesse</span>
              <span className={styles.infoValue}>
                {cliente.area_interesse || '-'}
              </span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <History size={18} className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Última interação</span>
              <span className={styles.infoValue}>
                {formatarDataInteracao(cliente.ultima_interacao)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.descriptionSection}>
          <div className={styles.descriptionHeader}>
            <FileText size={16} className={styles.descriptionIcon} />
            <span className={styles.descriptionTitle}>
              Descrição da necessidade
            </span>
          </div>
          <p className={styles.descriptionText}>
            {cliente.descricao || 'Nenhuma descrição detalhada informada.'}
          </p>
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Fechar
        </button>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => {
            onClose?.();
            onEdit?.(cliente);
          }}
        >
          <Pencil size={16} />
          Editar
        </button>
      </div>
    </Modal>
  );
}
