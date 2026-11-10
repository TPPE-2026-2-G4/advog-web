import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAjustes } from '@/hooks/useAjustes';
import AjustesClient from './ajustesClient';

vi.mock('@/hooks/useAjustes', () => ({
  useAjustes: vi.fn(),
}));

describe('AjustesClient', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockToggle = vi.fn();
  const mockRefreshDatajud = vi.fn();
  const mockRefreshInfra = vi.fn();
  const mockChangePaginaInicial = vi.fn();
  const mockChangeEscopoProcessos = vi.fn();
  const mockChangeDiasPrazo = vi.fn();
  const mockSetDiasCritico = vi.fn();
  const mockSaveSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [
      'e-mail ativo, DataJud online e Infraestrutura online',
      {
        receberEmails: true,
        userEmail: 'alexandre@carreiro.adv.br',
        isConfirmModalOpen: false,
        isUpdatingEmail: false,
        emailError: '',
        emailSuccess: '',
        datajudStatus: {
          isLoading: false,
          online: true,
          status: 'online',
          mensagem: 'Integração conectada · Sincronização automática ativa',
        },
        infraStatus: {
          isLoading: false,
          online: true,
          status: 'online',
          mensagem: 'Serviço de anexos e banco de dados operacionais',
        },
      },
      'Ativo',
      'Bloquear notificações por e-mail',
      'Online',
      'Integração conectada · Sincronização automática ativa',
      'Online',
    ],
    [
      'e-mail bloqueado, DataJud offline e Infraestrutura offline',
      {
        receberEmails: false,
        userEmail: '',
        isConfirmModalOpen: false,
        isUpdatingEmail: false,
        emailError: '',
        emailSuccess: '',
        datajudStatus: {
          isLoading: false,
          online: false,
          status: 'offline',
          mensagem:
            'Integração indisponível · Sincronização automática pausada',
        },
        infraStatus: {
          isLoading: false,
          online: false,
          status: 'offline',
          mensagem:
            'Falha na comunicação com o armazenamento ou banco de dados',
        },
      },
      'Bloqueado',
      'Ativar notificações por e-mail',
      'Offline',
      'Integração indisponível · Sincronização automática pausada',
      'Offline',
    ],
    [
      'DataJud e Infraestrutura verificando conexão',
      {
        receberEmails: true,
        userEmail: 'alexandre@carreiro.adv.br',
        isConfirmModalOpen: false,
        isUpdatingEmail: true,
        emailError: '',
        emailSuccess: '',
        datajudStatus: {
          isLoading: true,
          online: false,
          status: 'verificando',
          mensagem: 'Verificando conexão com o DataJud…',
        },
        infraStatus: {
          isLoading: true,
          online: false,
          status: 'verificando',
          mensagem: 'Verificando conexão com o armazenamento e banco de dados…',
        },
      },
      'Ativo',
      'Bloquear notificações por e-mail',
      'Verificando...',
      'Verificando conexão com o DataJud…',
      'Verificando...',
    ],
  ])(
    'renderiza corretamente quando %s',
    (
      _cenario,
      hookState,
      esperadoEmailBadge,
      esperadoBtnLabel,
      esperadoDatajudBadge,
      esperadoDatajudMensagem,
      esperadoInfraBadge
    ) => {
      useAjustes.mockReturnValue({
        ...hookState,
        paginaInicial: '/dashboard',
        escopoProcessos: 'escritorio',
        diasPrazoProximo: 15,
        diasProcessoCritico: '30',
        setDiasProcessoCritico: mockSetDiasCritico,
        handleOpenConfirmModal: mockOpenModal,
        handleCloseConfirmModal: mockCloseModal,
        handleToggleReceberEmails: mockToggle,
        handleRefreshDatajud: mockRefreshDatajud,
        handleRefreshInfra: mockRefreshInfra,
        handleChangePaginaInicial: mockChangePaginaInicial,
        handleChangeEscopoProcessos: mockChangeEscopoProcessos,
        handleChangeDiasPrazoProximo: mockChangeDiasPrazo,
        handleSaveSettings: mockSaveSettings,
      });

      render(<AjustesClient initialTeam={[]} />);

      expect(
        screen.getByRole('heading', { name: 'Ajustes' })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Gerencie as preferências do sistema.')
      ).toBeInTheDocument();

      expect(screen.getByTestId('email-notification-status')).toHaveTextContent(
        esperadoEmailBadge
      );
      expect(screen.getByTestId('datajud-status-badge')).toHaveTextContent(
        esperadoDatajudBadge
      );
      expect(screen.getByTestId('infra-status-badge')).toHaveTextContent(
        esperadoInfraBadge
      );
      expect(screen.getByText(esperadoDatajudMensagem)).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: esperadoBtnLabel });
      expect(btn).toBeInTheDocument();
      if (!hookState.isUpdatingEmail) {
        fireEvent.click(btn);
        expect(mockOpenModal).toHaveBeenCalledOnce();
      } else {
        expect(btn).toBeDisabled();
      }
    }
  );

  it('aciona re-verificação de integrações, alteração de campos e o botão geral de Salvar no topo', () => {
    useAjustes.mockReturnValue({
      receberEmails: true,
      userEmail: 'alexandre@carreiro.adv.br',
      isConfirmModalOpen: false,
      isUpdatingEmail: false,
      emailError: '',
      emailSuccess: '',
      datajudStatus: {
        isLoading: false,
        online: true,
        status: 'online',
        mensagem: 'Integração conectada · Sincronização automática ativa',
      },
      infraStatus: {
        isLoading: false,
        online: true,
        status: 'online',
        mensagem: 'Serviço de anexos e banco de dados operacionais',
      },
      paginaInicial: '/dashboard',
      escopoProcessos: 'escritorio',
      diasPrazoProximo: 15,
      diasProcessoCritico: '30',
      setDiasProcessoCritico: mockSetDiasCritico,
      handleOpenConfirmModal: mockOpenModal,
      handleCloseConfirmModal: mockCloseModal,
      handleToggleReceberEmails: mockToggle,
      handleRefreshDatajud: mockRefreshDatajud,
      handleRefreshInfra: mockRefreshInfra,
      handleChangePaginaInicial: mockChangePaginaInicial,
      handleChangeEscopoProcessos: mockChangeEscopoProcessos,
      handleChangeDiasPrazoProximo: mockChangeDiasPrazo,
      handleSaveSettings: mockSaveSettings,
    });

    render(<AjustesClient initialTeam={[]} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Testar conexão com o DataJud' })
    );
    expect(mockRefreshDatajud).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Testar conexão com o armazenamento',
      })
    );
    expect(mockRefreshInfra).toHaveBeenCalledOnce();

    const pageSelect = screen.getByRole('combobox', {
      name: 'Selecionar página inicial padrão',
    });
    expect(
      screen.getByRole('option', { name: 'Visão Geral' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Atividades' })
    ).toBeInTheDocument();
    fireEvent.change(pageSelect, { target: { value: '/processos' } });
    expect(mockChangePaginaInicial).toHaveBeenCalledWith('/processos');

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Selecionar filtro padrão de processos',
      }),
      { target: { value: 'meus_processos' } }
    );
    expect(mockChangeEscopoProcessos).toHaveBeenCalledWith('meus_processos');

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Selecionar antecedência de prazos próximos',
      }),
      { target: { value: '30' } }
    );
    expect(mockChangeDiasPrazo).toHaveBeenCalledWith('30');

    const criticalInput = screen.getByRole('spinbutton', {
      name: 'Dias sem movimentação para processo crítico',
    });
    fireEvent.change(criticalInput, { target: { value: '45' } });
    expect(mockSetDiasCritico).toHaveBeenCalledWith('45');

    const saveButtons = screen.getAllByRole('button', { name: /Salvar/i });
    expect(saveButtons).toHaveLength(1);
    fireEvent.click(saveButtons[0]);
    expect(mockSaveSettings).toHaveBeenCalledOnce();
  });

  it('exibe modal de confirmação e executa confirmação ou cancelamento', () => {
    useAjustes.mockReturnValue({
      receberEmails: true,
      userEmail: 'alexandre@carreiro.adv.br',
      isConfirmModalOpen: true,
      isUpdatingEmail: false,
      emailError: 'Erro ao salvar preferência',
      emailSuccess: 'Ajustes salvos com sucesso.',
      datajudStatus: {
        isLoading: false,
        online: true,
        status: 'online',
        mensagem: 'Integração conectada · Sincronização automática ativa',
      },
      handleOpenConfirmModal: mockOpenModal,
      handleCloseConfirmModal: mockCloseModal,
      handleToggleReceberEmails: mockToggle,
      handleSaveSettings: mockSaveSettings,
    });

    render(<AjustesClient initialTeam={[]} />);

    expect(
      screen.getByRole('heading', { name: 'Desabilitar notificações?' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ajustes salvos com sucesso.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockCloseModal).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole('button', { name: 'Desabilitar notificações' })
    );
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('oculta DataJud, armazenamento, alerta de prazos e processos críticos quando usuário não possui configuracoes_sistema', () => {
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        funcionario_id: 2,
        nome: 'Advogado Regular',
        email: 'regular@carreiro.adv.br',
        cargo: {
          nome_cargo: 'Advogado',
          permissao: {
            visualizar_processos: true,
            configuracoes_sistema: false,
          },
        },
      })
    );

    useAjustes.mockReturnValue({
      receberEmails: true,
      userEmail: 'regular@carreiro.adv.br',
      isConfirmModalOpen: false,
      isUpdatingEmail: false,
      emailError: '',
      emailSuccess: '',
      datajudStatus: {
        isLoading: false,
        online: true,
        status: 'online',
        mensagem: 'Integração ativa',
      },
      infraStatus: {
        isLoading: false,
        online: true,
        status: 'online',
        mensagem: 'Infra ok',
      },
      paginaInicial: '/dashboard',
      escopoProcessos: 'escritorio',
      diasPrazoProximo: 15,
      diasProcessoCritico: '30',
      handleOpenConfirmModal: mockOpenModal,
      handleCloseConfirmModal: mockCloseModal,
      handleToggleReceberEmails: mockToggle,
      handleSaveSettings: mockSaveSettings,
    });

    render(<AjustesClient initialTeam={[]} />);

    expect(screen.queryByText('Acesso Restrito')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ajustes' })
    ).toBeInTheDocument();

    expect(screen.getByText('Notificações por e-mail')).toBeInTheDocument();
    expect(
      screen.getByText('Receba alertas de prazos e movimentações')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/\(regular@carreiro\.adv\.br\)/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Selecionar página inicial padrão')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Selecionar filtro padrão de processos')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar/i })).toBeInTheDocument();

    expect(screen.queryByText('Integração DataJud')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Armazenamento e Banco de Dados')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Alerta de Prazos Próximos')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Selecionar antecedência de prazos próximos')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Processos Críticos')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Dias sem movimentação para processo crítico')
    ).not.toBeInTheDocument();
  });
});
