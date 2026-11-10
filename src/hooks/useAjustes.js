import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { mudarReceberEmails } from '@/services/funcionarios';
import {
  obterStatusDatajud,
  obterStatusInfraestrutura,
} from '@/services/processos';
import { getCurrentUser } from '@/utils/authSession';

const emptySubscribe = () => () => {};

export const SYSTEM_PREF_KEYS = {
  PAGINA_INICIAL: 'sistema_pagina_inicial',
  ESCOPO_PROCESSOS: 'sistema_escopo_processos',
  DIAS_PRAZO: 'sistema_dias_prazo_proximo',
  DIAS_CRITICO: 'sistema_dias_processo_critico',
};

export const VALID_INITIAL_PAGES = [
  '/dashboard',
  '/processos',
  '/atividades',
  '/financas',
  '/equipe',
];

export const VALID_PROCESS_SCOPES = ['escritorio', 'meus_processos'];
export const VALID_DEADLINE_DAYS = [7, 15, 30, 60];

const DEFAULT_ONLINE_MESSAGE =
  'Integração conectada · Sincronização automática ativa';
const DEFAULT_OFFLINE_MESSAGE =
  'Integração indisponível · Sincronização automática pausada';

function formatDatajudMensagem(mensagem, online) {
  if (!mensagem) {
    return online ? DEFAULT_ONLINE_MESSAGE : DEFAULT_OFFLINE_MESSAGE;
  }
  return mensagem.replace(/\bAPI\b/gi, 'Integração');
}

const DEFAULT_INFRA_ONLINE_MESSAGE =
  'Serviço de anexos e banco de dados operacionais';
const DEFAULT_INFRA_OFFLINE_MESSAGE =
  'Falha na comunicação com o armazenamento ou banco de dados';

export function getSavedInitialPage() {
  if (typeof window === 'undefined') return '/dashboard';
  try {
    const saved = localStorage.getItem(SYSTEM_PREF_KEYS.PAGINA_INICIAL);
    return VALID_INITIAL_PAGES.includes(saved) ? saved : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

export function getSavedDashboardPrefs() {
  const defaults = {
    escopoProcessos: 'escritorio',
    diasPrazo: 15,
    diasCritico: 15,
  };
  if (typeof window === 'undefined') return defaults;

  try {
    const savedScope = localStorage.getItem(SYSTEM_PREF_KEYS.ESCOPO_PROCESSOS);
    const savedPrazo = Number(
      localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_PRAZO)
    );
    const savedCritico = Number(
      localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)
    );

    return {
      escopoProcessos: VALID_PROCESS_SCOPES.includes(savedScope)
        ? savedScope
        : defaults.escopoProcessos,
      diasPrazo: VALID_DEADLINE_DAYS.includes(savedPrazo)
        ? savedPrazo
        : defaults.diasPrazo,
      diasCritico:
        Number.isInteger(savedCritico) &&
        savedCritico >= 1 &&
        savedCritico <= 365
          ? savedCritico
          : defaults.diasCritico,
    };
  } catch {
    return defaults;
  }
}

function findMatchedMember(team = [], user = null) {
  if (!user || !Array.isArray(team) || team.length === 0) return null;

  const userId = user.funcionario_id ?? user.id;
  const userEmail = (user.email ?? user.email_func ?? '').trim().toLowerCase();

  return (
    team.find((member) => {
      if (
        userId !== undefined &&
        userId !== null &&
        String(member.funcionario_id) === String(userId)
      ) {
        return true;
      }
      const memberEmail = (member.email ?? member.email_func ?? '')
        .trim()
        .toLowerCase();
      return Boolean(userEmail && memberEmail === userEmail);
    }) || null
  );
}

function resolveInitialReceberEmails(matchedMember, user) {
  const raw =
    matchedMember?.receber_emails ??
    matchedMember?.receberEmails ??
    user?.receber_emails ??
    user?.receberEmails;

  return raw === undefined ? true : Boolean(raw);
}

export function useAjustes(initialTeam = []) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const currentUser = useMemo(
    () => (mounted ? getCurrentUser() : null),
    [mounted]
  );
  const matchedMember = useMemo(
    () => findMatchedMember(initialTeam, currentUser),
    [initialTeam, currentUser]
  );

  const initialReceberEmails = useMemo(
    () => resolveInitialReceberEmails(matchedMember, currentUser),
    [matchedMember, currentUser]
  );

  const [savedReceberEmailsOverride, setSavedReceberEmailsOverride] =
    useState(undefined);
  const savedReceberEmails =
    savedReceberEmailsOverride !== undefined
      ? savedReceberEmailsOverride
      : initialReceberEmails;

  const [receberEmailsOverride, setReceberEmailsOverride] = useState(undefined);
  const receberEmails =
    receberEmailsOverride !== undefined
      ? receberEmailsOverride
      : savedReceberEmails;

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const [paginaInicialOverride, setPaginaInicialOverride] = useState(undefined);
  const paginaInicial =
    paginaInicialOverride !== undefined
      ? paginaInicialOverride
      : mounted
        ? getSavedInitialPage()
        : '/dashboard';

  const savedDashboardPrefs = useMemo(
    () =>
      mounted
        ? getSavedDashboardPrefs()
        : { escopoProcessos: 'escritorio', diasPrazo: 15, diasCritico: 15 },
    [mounted]
  );

  const [escopoOverride, setEscopoOverride] = useState(undefined);
  const escopoProcessos =
    escopoOverride !== undefined
      ? escopoOverride
      : savedDashboardPrefs.escopoProcessos;

  const [diasPrazoOverride, setDiasPrazoOverride] = useState(undefined);
  const diasPrazoProximo =
    diasPrazoOverride !== undefined
      ? diasPrazoOverride
      : savedDashboardPrefs.diasPrazo;

  const [diasCriticoInput, setDiasCriticoInput] = useState(undefined);
  const diasProcessoCritico =
    diasCriticoInput !== undefined
      ? diasCriticoInput
      : String(savedDashboardPrefs.diasCritico);

  const [datajudStatus, setDatajudStatus] = useState({
    isLoading: true,
    online: false,
    status: 'verificando',
    mensagem: 'Verificando conexão com o DataJud…',
  });

  const [infraStatus, setInfraStatus] = useState({
    isLoading: true,
    online: false,
    status: 'verificando',
    mensagem: 'Verificando conexão com o armazenamento e banco de dados…',
  });

  const handleRefreshDatajud = useCallback(async () => {
    setDatajudStatus((prev) => ({
      ...prev,
      isLoading: true,
      status: 'verificando',
      mensagem: 'Verificando conexão com o DataJud…',
    }));

    try {
      const res = await obterStatusDatajud();
      const online = Boolean(res?.online);
      setDatajudStatus({
        isLoading: false,
        online,
        status: res?.status || (online ? 'online' : 'offline'),
        mensagem: formatDatajudMensagem(res?.mensagem, online),
      });
    } catch {
      setDatajudStatus({
        isLoading: false,
        online: false,
        status: 'offline',
        mensagem: DEFAULT_OFFLINE_MESSAGE,
      });
    }
  }, []);

  const handleRefreshInfra = useCallback(async () => {
    setInfraStatus((prev) => ({
      ...prev,
      isLoading: true,
      status: 'verificando',
      mensagem: 'Verificando conexão com o armazenamento e banco de dados…',
    }));

    try {
      const res = await obterStatusInfraestrutura();
      const online =
        res?.status === 'ready' ||
        (res?.database === 'ok' && res?.storage === 'ok');
      setInfraStatus({
        isLoading: false,
        online,
        status: online ? 'online' : 'offline',
        mensagem: online
          ? DEFAULT_INFRA_ONLINE_MESSAGE
          : DEFAULT_INFRA_OFFLINE_MESSAGE,
      });
    } catch {
      setInfraStatus({
        isLoading: false,
        online: false,
        status: 'offline',
        mensagem: DEFAULT_INFRA_OFFLINE_MESSAGE,
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    obterStatusDatajud()
      .then((res) => {
        if (!isMounted) return;
        const online = Boolean(res?.online);
        setDatajudStatus({
          isLoading: false,
          online,
          status: res?.status || (online ? 'online' : 'offline'),
          mensagem: formatDatajudMensagem(res?.mensagem, online),
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setDatajudStatus({
          isLoading: false,
          online: false,
          status: 'offline',
          mensagem: DEFAULT_OFFLINE_MESSAGE,
        });
      });

    if (typeof obterStatusInfraestrutura === 'function') {
      Promise.resolve(obterStatusInfraestrutura())
        .then((res) => {
          if (!isMounted) return;
          const online =
            res?.status === 'ready' ||
            (res?.database === 'ok' && res?.storage === 'ok');
          setInfraStatus({
            isLoading: false,
            online,
            status: online ? 'online' : 'offline',
            mensagem: online
              ? DEFAULT_INFRA_ONLINE_MESSAGE
              : DEFAULT_INFRA_OFFLINE_MESSAGE,
          });
        })
        .catch(() => {
          if (!isMounted) return;
          setInfraStatus({
            isLoading: false,
            online: false,
            status: 'offline',
            mensagem: DEFAULT_INFRA_OFFLINE_MESSAGE,
          });
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const funcionarioId =
    matchedMember?.funcionario_id ??
    currentUser?.funcionario_id ??
    currentUser?.id ??
    null;

  const userEmail =
    matchedMember?.email ??
    matchedMember?.email_func ??
    currentUser?.email ??
    currentUser?.email_func ??
    '';

  const handleOpenConfirmModal = () => {
    setEmailError('');
    setEmailSuccess('');
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    if (isUpdatingEmail) return;
    setEmailError('');
    setIsConfirmModalOpen(false);
  };

  const handleToggleReceberEmails = () => {
    setEmailError('');
    setEmailSuccess('');
    setReceberEmailsOverride(!receberEmails);
    setIsConfirmModalOpen(false);
  };

  const handleChangePaginaInicial = (novaPagina) => {
    if (!VALID_INITIAL_PAGES.includes(novaPagina)) return;
    setEmailError('');
    setEmailSuccess('');
    setPaginaInicialOverride(novaPagina);
  };

  const handleChangeEscopoProcessos = (novoEscopo) => {
    if (!VALID_PROCESS_SCOPES.includes(novoEscopo)) return;
    setEmailError('');
    setEmailSuccess('');
    setEscopoOverride(novoEscopo);
  };

  const handleChangeDiasPrazoProximo = (novosDias) => {
    const parsed = Number(novosDias);
    if (!VALID_DEADLINE_DAYS.includes(parsed)) return;
    setEmailError('');
    setEmailSuccess('');
    setDiasPrazoOverride(parsed);
  };

  const handleSaveSettings = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    setEmailError('');
    setEmailSuccess('');

    const parsedCritico = Number(String(diasProcessoCritico).trim());
    if (
      !Number.isInteger(parsedCritico) ||
      parsedCritico < 1 ||
      parsedCritico > 365
    ) {
      setEmailError(
        'Informe uma quantidade válida entre 1 e 365 dias sem movimentação.'
      );
      return;
    }

    setIsUpdatingEmail(true);

    try {
      if (receberEmails !== savedReceberEmails) {
        if (!funcionarioId) {
          setEmailError('Não foi possível identificar o usuário logado.');
          return;
        }

        const updated = await mudarReceberEmails(funcionarioId, receberEmails);
        const confirmedValue = Boolean(
          updated?.receber_emails ?? updated?.receberEmails ?? receberEmails
        );

        setSavedReceberEmailsOverride(confirmedValue);
        setReceberEmailsOverride(confirmedValue);

        if (typeof window !== 'undefined' && currentUser) {
          const updatedUser = {
            ...currentUser,
            receber_emails: confirmedValue,
          };
          const serialized = JSON.stringify(updatedUser);
          if (sessionStorage.getItem('current_user')) {
            sessionStorage.setItem('current_user', serialized);
          }
          if (localStorage.getItem('current_user')) {
            localStorage.setItem('current_user', serialized);
          }
        }
      }

      setDiasCriticoInput(String(parsedCritico));
      if (typeof window !== 'undefined') {
        localStorage.setItem(SYSTEM_PREF_KEYS.PAGINA_INICIAL, paginaInicial);
        localStorage.setItem(
          SYSTEM_PREF_KEYS.ESCOPO_PROCESSOS,
          escopoProcessos
        );
        localStorage.setItem(
          SYSTEM_PREF_KEYS.DIAS_PRAZO,
          String(diasPrazoProximo)
        );
        localStorage.setItem(
          SYSTEM_PREF_KEYS.DIAS_CRITICO,
          String(parsedCritico)
        );
      }

      setEmailSuccess('Ajustes salvos com sucesso.');
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar os ajustes do sistema.'
      );
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return {
    receberEmails,
    userEmail,
    isConfirmModalOpen,
    isUpdatingEmail,
    emailError,
    emailSuccess,
    datajudStatus,
    infraStatus,
    paginaInicial,
    escopoProcessos,
    diasPrazoProximo,
    diasProcessoCritico,
    setDiasProcessoCritico: setDiasCriticoInput,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleToggleReceberEmails,
    handleRefreshDatajud,
    handleRefreshInfra,
    handleChangePaginaInicial,
    handleChangeEscopoProcessos,
    handleChangeDiasPrazoProximo,
    handleSaveSettings,
  };
}
