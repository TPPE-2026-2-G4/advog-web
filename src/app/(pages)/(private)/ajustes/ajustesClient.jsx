'use client';

import {
  AlertTriangle,
  CircleCheck,
  CircleSlash,
  Clock,
  Filter,
  HardDrive,
  LayoutDashboard,
  Mail,
  RefreshCw,
  Save,
  Wifi,
} from 'lucide-react';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import Modal, { ModalCloseButton } from '@/components/ui/Modal/Modal';
import { useAjustes } from '@/hooks/useAjustes';
import styles from './ajustes.module.css';

export default function AjustesClient({ initialTeam = [] }) {
  const {
    receberEmails,
    userEmail,
    isConfirmModalOpen,
    isUpdatingEmail,
    emailError,
    emailSuccess,
    datajudStatus = {
      isLoading: false,
      online: false,
      status: 'offline',
      mensagem: '',
    },
    infraStatus = {
      isLoading: false,
      online: true,
      status: 'online',
      mensagem: 'Serviço de anexos e banco de dados operacionais',
    },
    paginaInicial = '/dashboard',
    escopoProcessos = 'escritorio',
    diasPrazoProximo = 15,
    diasProcessoCritico = '15',
    setDiasProcessoCritico,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleToggleReceberEmails,
    handleRefreshDatajud,
    handleRefreshInfra,
    handleChangePaginaInicial,
    handleChangeEscopoProcessos,
    handleChangeDiasPrazoProximo,
    handleSaveSettings,
  } = useAjustes(initialTeam);

  const datajudBadgeClass = datajudStatus.isLoading
    ? styles.badgeNeutral
    : datajudStatus.online
      ? styles.badgeGreen
      : styles.badgeRed;

  const datajudBadgeLabel = datajudStatus.isLoading
    ? 'Verificando...'
    : datajudStatus.online
      ? 'Online'
      : 'Offline';

  const infraBadgeClass = infraStatus.isLoading
    ? styles.badgeNeutral
    : infraStatus.online
      ? styles.badgeGreen
      : styles.badgeRed;

  const infraBadgeLabel = infraStatus.isLoading
    ? 'Verificando...'
    : infraStatus.online
      ? 'Online'
      : 'Offline';

  const modalActionLabel = receberEmails
    ? 'Desabilitar notificações'
    : 'Habilitar notificações';

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.headerArea}>
          <h1 className={styles.title}>Ajustes</h1>
          <p className={styles.subtitle}>
            Gerencie as preferências do sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isUpdatingEmail}
          className={styles.saveButton}
        >
          {isUpdatingEmail ? (
            <LoadingDots />
          ) : (
            <>
              <Save size={16} aria-hidden="true" />
              Salvar
            </>
          )}
        </button>
      </div>

      {emailSuccess && (
        <p role="status" className={styles.alertSuccess}>
          {emailSuccess}
        </p>
      )}

      {emailError && !isConfirmModalOpen && (
        <p role="alert" className={styles.alertError}>
          {emailError}
        </p>
      )}

      <div className={styles.card}>
        <div className={styles.settingItem}>
          <div className={styles.settingLeft}>
            <div className={styles.iconBox}>
              <Mail size={20} aria-hidden="true" />
            </div>
            <div className={styles.settingInfo}>
              <h2 className={styles.settingTitle}>Notificações por e-mail</h2>
              <p className={styles.settingDescription}>
                Receba alertas de prazos e movimentações
                {userEmail ? ` (${userEmail})` : ''}
              </p>
            </div>
          </div>

          <div className={styles.settingRight}>
            <span
              className={`${styles.badge} ${
                receberEmails ? styles.badgeGreen : styles.badgeRed
              }`}
              data-testid="email-notification-status"
            >
              {receberEmails ? 'Ativo' : 'Bloqueado'}
            </span>

            <button
              type="button"
              onClick={handleOpenConfirmModal}
              disabled={isUpdatingEmail}
              aria-pressed={receberEmails}
              aria-label={
                receberEmails
                  ? 'Bloquear notificações por e-mail'
                  : 'Ativar notificações por e-mail'
              }
              title={
                receberEmails
                  ? 'Bloquear notificações por e-mail'
                  : 'Ativar notificações por e-mail'
              }
              className={`${styles.toggleBtn} ${
                receberEmails ? styles.toggleBtnActive : styles.toggleBtnBlocked
              }`}
            >
              {receberEmails ? (
                <CircleCheck size={18} aria-hidden="true" />
              ) : (
                <CircleSlash size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingLeft}>
            <div className={styles.iconBox}>
              <Wifi size={20} aria-hidden="true" />
            </div>
            <div className={styles.settingInfo}>
              <h2 className={styles.settingTitle}>Integração DataJud</h2>
              <p className={styles.settingDescription}>
                {datajudStatus.mensagem}
              </p>
            </div>
          </div>

          <div className={styles.settingRight}>
            <span
              className={`${styles.badge} ${datajudBadgeClass}`}
              data-testid="datajud-status-badge"
            >
              {datajudBadgeLabel}
            </span>

            <button
              type="button"
              onClick={handleRefreshDatajud}
              disabled={datajudStatus.isLoading}
              aria-label="Testar conexão com o DataJud"
              title="Testar conexão com o DataJud"
              className={styles.refreshBtn}
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={datajudStatus.isLoading ? styles.spinning : ''}
              />
            </button>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingLeft}>
            <div className={styles.iconBox}>
              <HardDrive size={20} aria-hidden="true" />
            </div>
            <div className={styles.settingInfo}>
              <h2 className={styles.settingTitle}>
                Armazenamento e Banco de Dados
              </h2>
              <p className={styles.settingDescription}>
                {infraStatus.mensagem}
              </p>
            </div>
          </div>

          <div className={styles.settingRight}>
            <span
              className={`${styles.badge} ${infraBadgeClass}`}
              data-testid="infra-status-badge"
            >
              {infraBadgeLabel}
            </span>

            <button
              type="button"
              onClick={handleRefreshInfra}
              disabled={infraStatus.isLoading}
              aria-label="Testar conexão com o armazenamento"
              title="Testar conexão com o armazenamento"
              className={styles.refreshBtn}
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={infraStatus.isLoading ? styles.spinning : ''}
              />
            </button>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingLeft}>
            <div className={styles.iconBox}>
              <LayoutDashboard size={20} aria-hidden="true" />
            </div>
            <div className={styles.settingInfo}>
              <h2 className={styles.settingTitle}>Página inicial padrão</h2>
              <p className={styles.settingDescription}>
                Escolha qual tela abrir automaticamente após fazer login
              </p>
            </div>
          </div>

          <div className={styles.settingRight}>
            <select
              aria-label="Selecionar página inicial padrão"
              value={paginaInicial}
              onChange={(e) => handleChangePaginaInicial?.(e.target.value)}
              className={styles.selectControl}
            >
              <option value="/dashboard">Visão Geral</option>
              <option value="/processos">Processos</option>
              <option value="/atividades">Atividades</option>
              <option value="/financas">Finanças</option>
              <option value="/equipe">Equipe</option>
            </select>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingLeft}>
            <div className={styles.iconBox}>
              <Filter size={20} aria-hidden="true" />
            </div>
            <div className={styles.settingInfo}>
              <h2 className={styles.settingTitle}>
                Filtro padrão de processos no painel
              </h2>
              <p className={styles.settingDescription}>
                Defina se o painel exibe todos os processos do escritório ou
                apenas os seus
              </p>
            </div>
          </div>

          <div className={styles.settingRight}>
            <select
              aria-label="Selecionar filtro padrão de processos"
              value={escopoProcessos}
              onChange={(e) => handleChangeEscopoProcessos?.(e.target.value)}
              className={styles.selectControl}
            >
              <option value="escritorio">Todo o escritório</option>
              <option value="meus_processos">Apenas meus processos</option>
            </select>
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingLeft}>
            <div className={styles.iconBox}>
              <Clock size={20} aria-hidden="true" />
            </div>
            <div className={styles.settingInfo}>
              <h2 className={styles.settingTitle}>Alerta de prazos próximos</h2>
              <p className={styles.settingDescription}>
                Antecedência para destacar prazos próximos no painel principal
              </p>
            </div>
          </div>

          <div className={styles.settingRight}>
            <select
              aria-label="Selecionar antecedência de prazos próximos"
              value={String(diasPrazoProximo)}
              onChange={(e) => handleChangeDiasPrazoProximo?.(e.target.value)}
              className={styles.selectControl}
            >
              <option value="7">Próximos 7 dias</option>
              <option value="15">Próximos 15 dias</option>
              <option value="30">Próximos 30 dias</option>
              <option value="60">Próximos 60 dias</option>
            </select>
          </div>
        </div>
      </div>

      <section
        className={styles.criticalCard}
        aria-labelledby="critical-processes-settings-title"
      >
        <div className={styles.criticalHeader}>
          <AlertTriangle
            size={20}
            className={styles.criticalIcon}
            aria-hidden="true"
          />
          <h2
            id="critical-processes-settings-title"
            className={styles.criticalTitle}
          >
            Processos Críticos
          </h2>
        </div>

        <p className={styles.criticalDescription}>
          Defina após quantos dias sem movimentação um processo passa a ser
          considerado <strong>crítico</strong> e destacado no painel.
        </p>

        <div className={styles.criticalForm}>
          <label htmlFor="critical-days-input" className={styles.criticalLabel}>
            Considerar crítico após
          </label>
          <div className={styles.criticalInputRow}>
            <input
              id="critical-days-input"
              type="number"
              min="1"
              max="365"
              aria-label="Dias sem movimentação para processo crítico"
              value={diasProcessoCritico}
              onChange={(e) => setDiasProcessoCritico?.(e.target.value)}
              className={styles.criticalInput}
            />
            <span className={styles.criticalUnit}>dias sem movimentação</span>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        preventClose={isUpdatingEmail}
        className={styles.modal}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalIconWrapper}>
            {receberEmails ? (
              <CircleSlash size={22} aria-hidden="true" />
            ) : (
              <CircleCheck size={22} aria-hidden="true" />
            )}
          </div>
          <ModalCloseButton
            onClose={handleCloseConfirmModal}
            disabled={isUpdatingEmail}
            title="Fechar"
          />
        </div>

        <div className={styles.modalBody}>
          <h2 className={styles.modalTitle}>{modalActionLabel}?</h2>
          <p className={styles.modalMessage}>
            Tem certeza que deseja {receberEmails ? 'desabilitar' : 'habilitar'}{' '}
            o recebimento de alertas de prazos e movimentações por e-mail
            {userEmail ? (
              <>
                {' '}
                em <strong>{userEmail}</strong>
              </>
            ) : (
              ''
            )}
            ?
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={handleCloseConfirmModal}
            className={styles.cancelButton}
            disabled={isUpdatingEmail}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleToggleReceberEmails}
            className={styles.confirmButton}
            disabled={isUpdatingEmail}
          >
            {modalActionLabel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
