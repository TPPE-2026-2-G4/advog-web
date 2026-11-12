import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { salvarConfigAlertas } from '@/services/alertas';
import { mudarReceberEmails } from '@/services/funcionarios';
import {
  obterStatusDatajud,
  obterStatusInfraestrutura,
} from '@/services/processos';
import { ALERTAS_CONFIG_EVENT } from '@/constants/preferencias';
import { getCurrentUser } from '@/utils/authSession';
import {
  getSavedDashboardPrefs,
  getSavedInitialPage,
  SYSTEM_PREF_KEYS,
  useAjustes,
} from './useAjustes';

vi.mock('@/services/alertas', () => ({
  salvarConfigAlertas: vi.fn(),
}));

vi.mock('@/services/funcionarios', () => ({
  mudarReceberEmails: vi.fn(),
}));

vi.mock('@/services/processos', () => ({
  obterStatusDatajud: vi.fn(),
  obterStatusInfraestrutura: vi.fn(),
}));

vi.mock('@/utils/authSession', () => ({
  getCurrentUser: vi.fn(),
}));

describe('useAjustes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    getCurrentUser.mockReturnValue({
      funcionario_id: 10,
      nome: 'Alexandre Carreiro',
      email: 'alexandre@carreiro.adv.br',
      receber_emails: true,
    });
    obterStatusDatajud.mockResolvedValue({
      online: true,
      status: 'online',
      mensagem: 'Integração conectada · Sincronização automática ativa',
    });
    obterStatusInfraestrutura.mockResolvedValue({
      status: 'ready',
      database: 'ok',
      storage: 'ok',
    });
  });

  it.each([
    [
      'prioriza receber_emails do membro correspondente na equipe pelo ID',
      [
        {
          funcionario_id: 10,
          email: 'alexandre@carreiro.adv.br',
          receber_emails: false,
        },
      ],
      {
        funcionario_id: 10,
        email: 'alexandre@carreiro.adv.br',
        receber_emails: true,
      },
      false,
    ],
    [
      'localiza membro na equipe pelo e-mail quando IDs não coincidem',
      [
        {
          funcionario_id: 99,
          email: 'ALEXANDRE@carreiro.adv.br',
          receberEmails: false,
        },
      ],
      { email: 'alexandre@carreiro.adv.br' },
      false,
    ],
    [
      'usa receber_emails do usuário logado quando equipe está vazia',
      [],
      {
        funcionario_id: 10,
        email: 'alexandre@carreiro.adv.br',
        receber_emails: false,
      },
      false,
    ],
    [
      'assume true por padrão quando receber_emails não está definido',
      [],
      { funcionario_id: 10, email: 'alexandre@carreiro.adv.br' },
      true,
    ],
  ])(
    'inicializa estado corretamente: %s',
    async (_cenario, team, user, esperado) => {
      getCurrentUser.mockReturnValue(user);

      const { result } = renderHook(() => useAjustes(team));

      expect(result.current.receberEmails).toBe(esperado);
      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
        expect(result.current.infraStatus.isLoading).toBe(false);
      });
    }
  );

  it.each([
    [
      'online com mensagem da integração',
      () =>
        Promise.resolve({
          online: true,
          status: 'online',
          mensagem: 'Integração conectada · Sincronização automática ativa',
        }),
      true,
      'online',
      'Integração conectada · Sincronização automática ativa',
    ],
    [
      'online com mensagem padrão quando mensagem vem vazia',
      () => Promise.resolve({ online: true }),
      true,
      'online',
      'Integração conectada · Sincronização automática ativa',
    ],
    [
      'offline com mensagem padrão quando online é false sem mensagem',
      () => Promise.resolve({ online: false }),
      false,
      'offline',
      'Integração indisponível · Sincronização automática pausada',
    ],
    [
      'offline quando a requisição ao DataJud falha',
      () => Promise.reject(new Error('Falha de rede')),
      false,
      'offline',
      'Integração indisponível · Sincronização automática pausada',
    ],
  ])(
    'atualiza status do DataJud para %s',
    async (
      _cenario,
      mockResponse,
      esperadoOnline,
      esperadoStatus,
      esperadoMsg
    ) => {
      obterStatusDatajud.mockImplementationOnce(mockResponse);

      const { result } = renderHook(() => useAjustes([]));

      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
      });

      expect(result.current.datajudStatus).toEqual({
        isLoading: false,
        online: esperadoOnline,
        status: esperadoStatus,
        mensagem: esperadoMsg,
      });
    }
  );

  it.each([
    [
      'online quando status ready',
      () => Promise.resolve({ status: 'ready', database: 'ok', storage: 'ok' }),
      true,
      'online',
      'Serviço de anexos e banco de dados operacionais',
    ],
    [
      'offline quando storage falha',
      () =>
        Promise.resolve({
          status: 'unhealthy',
          database: 'ok',
          storage: 'erro',
        }),
      false,
      'offline',
      'Falha na comunicação com o armazenamento ou banco de dados',
    ],
    [
      'offline quando a requisição de infraestrutura falha',
      () => Promise.reject(new Error('Erro 503')),
      false,
      'offline',
      'Falha na comunicação com o armazenamento ou banco de dados',
    ],
  ])(
    'atualiza status da infraestrutura para %s e permite re-verificação manual',
    async (
      _cenario,
      mockResponse,
      esperadoOnline,
      esperadoStatus,
      esperadoMsg
    ) => {
      obterStatusInfraestrutura.mockImplementationOnce(mockResponse);

      const { result } = renderHook(() => useAjustes([]));

      await waitFor(() => {
        expect(result.current.infraStatus.isLoading).toBe(false);
      });

      expect(result.current.infraStatus).toEqual({
        isLoading: false,
        online: esperadoOnline,
        status: esperadoStatus,
        mensagem: esperadoMsg,
      });

      obterStatusDatajud.mockResolvedValueOnce({ online: false });
      obterStatusInfraestrutura.mockResolvedValueOnce({
        status: 'ready',
        database: 'ok',
        storage: 'ok',
      });

      await act(async () => {
        await result.current.handleRefreshDatajud();
        await result.current.handleRefreshInfra();
      });

      expect(result.current.datajudStatus.online).toBe(false);
      expect(result.current.infraStatus.online).toBe(true);
    }
  );

  it('só aplica as alterações de notificações e preferências quando handleSaveSettings é acionado', async () => {
    const initialUser = {
      funcionario_id: 10,
      email: 'alexandre@carreiro.adv.br',
      receber_emails: true,
    };
    sessionStorage.setItem('current_user', JSON.stringify(initialUser));
    localStorage.setItem('current_user', JSON.stringify(initialUser));
    getCurrentUser.mockReturnValue(initialUser);

    mudarReceberEmails.mockResolvedValueOnce({
      funcionario_id: 10,
      receber_emails: false,
    });

    const { result } = renderHook(() => useAjustes([]));

    await waitFor(() => {
      expect(result.current.datajudStatus.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleOpenConfirmModal();
    });
    expect(result.current.isConfirmModalOpen).toBe(true);

    act(() => {
      result.current.handleCloseConfirmModal();
    });
    expect(result.current.isConfirmModalOpen).toBe(false);

    // Confirma no modal (apenas altera rascunho local, ainda não chama API)
    act(() => {
      result.current.handleOpenConfirmModal();
    });
    act(() => {
      result.current.handleToggleReceberEmails();
    });
    expect(result.current.receberEmails).toBe(false);
    expect(result.current.isConfirmModalOpen).toBe(false);
    expect(mudarReceberEmails).not.toHaveBeenCalled();

    // Altera opções nos selects e no input de processos críticos (apenas rascunho)
    act(() => {
      result.current.handleChangePaginaInicial('/processos');
      result.current.handleChangeEscopoProcessos('meus_processos');
      result.current.handleChangeDiasPrazoProximo('30');
      result.current.setDiasProcessoCritico('45');
    });

    expect(localStorage.getItem(SYSTEM_PREF_KEYS.PAGINA_INICIAL)).toBeNull();
    expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)).toBeNull();

    // Clica no botão Salvar geral
    await act(async () => {
      await result.current.handleSaveSettings({ preventDefault: vi.fn() });
    });

    expect(mudarReceberEmails).toHaveBeenCalledWith(10, false);
    expect(getSavedInitialPage()).toBe('/processos');
    expect(getSavedDashboardPrefs()).toEqual({
      escopoProcessos: 'meus_processos',
      diasPrazo: 30,
      diasCritico: 45,
    });
    expect(result.current.emailSuccess).toBe('Ajustes salvos com sucesso.');
    expect(
      JSON.parse(sessionStorage.getItem('current_user')).receber_emails
    ).toBe(false);
    expect(
      JSON.parse(localStorage.getItem('current_user')).receber_emails
    ).toBe(false);
  });

  describe('configuração de alertas do escritório', () => {
    const preencher = (result) =>
      act(() => {
        result.current.handleChangeDiasPrazoProximo('30');
        result.current.setDiasProcessoCritico('45');
      });

    it('envia antecedência e dias de processo crítico ao servidor quando pode gerenciar o sistema', async () => {
      salvarConfigAlertas.mockResolvedValue({});
      const { result } = renderHook(() =>
        useAjustes([], { canManageSystem: true })
      );
      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
      });
      preencher(result);

      await act(async () => {
        await result.current.handleSaveSettings();
      });

      expect(salvarConfigAlertas).toHaveBeenCalledWith({
        diasPrazoProximo: 30,
        diasProcessoCritico: 45,
      });
      expect(result.current.emailSuccess).toBe('Ajustes salvos com sucesso.');
    });

    it('não chama o servidor quando o usuário não gerencia o sistema', async () => {
      const { result } = renderHook(() => useAjustes([]));
      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
      });
      preencher(result);

      await act(async () => {
        await result.current.handleSaveSettings();
      });

      expect(salvarConfigAlertas).not.toHaveBeenCalled();
    });

    it('mostra o erro e não grava no navegador quando o servidor recusa', async () => {
      salvarConfigAlertas.mockRejectedValue(new Error('Sem permissão'));
      const { result } = renderHook(() =>
        useAjustes([], { canManageSystem: true })
      );
      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
      });
      preencher(result);

      await act(async () => {
        await result.current.handleSaveSettings();
      });

      expect(result.current.emailError).toBe('Sem permissão');
      expect(localStorage.getItem(SYSTEM_PREF_KEYS.DIAS_CRITICO)).toBeNull();
    });

    it('relê os valores quando o servidor atualiza a configuração', async () => {
      const { result } = renderHook(() => useAjustes([]));
      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
      });
      expect(result.current.diasProcessoCritico).toBe('15');

      act(() => {
        localStorage.setItem(SYSTEM_PREF_KEYS.DIAS_CRITICO, '40');
        localStorage.setItem(SYSTEM_PREF_KEYS.DIAS_PRAZO, '60');
        window.dispatchEvent(new Event(ALERTAS_CONFIG_EVENT));
      });

      await waitFor(() => {
        expect(result.current.diasProcessoCritico).toBe('40');
      });
      expect(result.current.diasPrazoProximo).toBe(60);
    });
  });

  it('valida quantidade inválida de dias sem movimentação antes de salvar', async () => {
    const { result } = renderHook(() => useAjustes([]));

    await waitFor(() => {
      expect(result.current.datajudStatus.isLoading).toBe(false);
    });

    act(() => {
      result.current.setDiasProcessoCritico('0');
    });

    await act(async () => {
      await result.current.handleSaveSettings();
    });

    expect(result.current.emailError).toBe(
      'Informe uma quantidade válida entre 1 e 365 dias sem movimentação.'
    );
    expect(mudarReceberEmails).not.toHaveBeenCalled();
  });

  it('exibe erro quando não é possível identificar o usuário logado ao salvar alteração de e-mail', async () => {
    getCurrentUser.mockReturnValue(null);

    const { result } = renderHook(() => useAjustes([]));

    await waitFor(() => {
      expect(result.current.datajudStatus.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleToggleReceberEmails();
    });

    await act(async () => {
      await result.current.handleSaveSettings();
    });

    expect(mudarReceberEmails).not.toHaveBeenCalled();
    expect(result.current.emailError).toBe(
      'Não foi possível identificar o usuário logado.'
    );
  });

  it.each([
    [
      'erro com instância de Error',
      new Error('Falha ao salvar preferência'),
      'Falha ao salvar preferência',
    ],
    [
      'erro não estruturado',
      'erro desconhecido',
      'Não foi possível salvar os ajustes do sistema.',
    ],
  ])(
    'trata falha ao salvar alterações no backend (%s)',
    async (_cenario, erroLancado, mensagemEsperada) => {
      mudarReceberEmails.mockRejectedValueOnce(erroLancado);

      const { result } = renderHook(() => useAjustes([]));

      await waitFor(() => {
        expect(result.current.datajudStatus.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleToggleReceberEmails();
      });

      await act(async () => {
        await result.current.handleSaveSettings();
      });

      expect(result.current.emailError).toBe(mensagemEsperada);
    }
  );
});
