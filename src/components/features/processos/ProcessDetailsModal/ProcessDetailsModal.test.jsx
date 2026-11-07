import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProcessDetailsModal from './ProcessDetailsModal';
import styles from './ProcessDetailsModal.module.css';

vi.mock('@/services/processos', () => ({
  listarDocumentos: vi.fn().mockResolvedValue([]),
  listarMovimentacoes: vi.fn().mockResolvedValue([]),
  uploadDocumento: vi.fn().mockResolvedValue({}),
  obterUrlDocumento: vi.fn().mockResolvedValue({ url: 'http://test.url/doc' }),
  excluirDocumento: vi.fn().mockResolvedValue({}),
}));

const processData = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
  descricao: 'Descrição do processo',
  cliente: 'Maria Silva',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana Paula',
  data_inicio: '2026-01-01T00:00:00',
  data_realizado: null,
  data_prazo: '2026-10-05T00:00:00',
};

describe('ProcessDetailsModal', () => {
  beforeEach(async () => {
    const {
      listarDocumentos,
      listarMovimentacoes,
      obterUrlDocumento,
      excluirDocumento,
      uploadDocumento,
    } = await import('@/services/processos');
    listarDocumentos.mockReset().mockResolvedValue([]);
    listarMovimentacoes.mockReset().mockResolvedValue([]);
    obterUrlDocumento
      .mockReset()
      .mockResolvedValue({ url: 'http://test.url/doc' });
    excluirDocumento.mockReset().mockResolvedValue({});
    uploadDocumento.mockReset().mockResolvedValue({});
  });

  it('não renderiza sem processo', () => {
    render(<ProcessDetailsModal process={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra o cabeçalho, descrição e fecha pelo botão', () => {
    const onClose = vi.fn();
    render(<ProcessDetailsModal process={processData} onClose={onClose} />);

    expect(
      screen.getByRole('heading', { name: processData.titulo })
    ).toBeInTheDocument();
    expect(screen.getByText(processData.cnj)).toBeInTheDocument();
    expect(screen.getByText(processData.descricao)).toBeInTheDocument();
    expect(screen.getByText(processData.area)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    { label: 'Cliente', expectedValue: 'Maria Silva' },
    { label: 'Tribunal', expectedValue: 'TJDFT' },
    { label: 'Responsável', expectedValue: 'Ana Paula' },
    { label: 'Data de Início', expectedValue: '01/01/2026' },
    { label: 'Data de Realização', expectedValue: 'Não informado' },
    { label: 'Próximo Prazo', expectedValue: '05/10/2026' },
  ])(
    'exibe o campo "$label" com valor "$expectedValue"',
    ({ label, expectedValue }) => {
      render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);

      const term = screen.getByText(label);
      expect(term).toBeInTheDocument();
      expect(term.parentElement).toHaveTextContent(expectedValue);
    }
  );

  it.each([
    { status: 'Ativo', expectedClass: styles.statusActive },
    { status: 'Concluído', expectedClass: styles.statusCompleted },
    { status: 'Arquivado', expectedClass: styles.statusArchived },
    { status: 'Em Análise', expectedClass: styles.statusPending },
  ])(
    'aplica o estilo correto para o badge de status "$status"',
    ({ status, expectedClass }) => {
      render(
        <ProcessDetailsModal
          process={{ ...processData, status, responsavel: '' }}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(status)).toHaveClass(expectedClass);
      expect(screen.getByText('Sem responsável')).toBeInTheDocument();
    }
  );

  it('permite alternar entre as abas Resumo, Movimentações e Documentos exibindo movimentações reais da API e upload', async () => {
    const { listarMovimentacoes } = await import('@/services/processos');
    listarMovimentacoes.mockResolvedValueOnce([
      {
        movimentacao_id: 2,
        processo_id: 1,
        funcionario_id: null,
        tipo_movimentacao: 'SINCRONIZACAO_TRIBUNAL',
        descricao:
          "Status sincronizado via Datajud de 'Ativo' para 'Concluído'.",
        data_movimentacao: '2026-10-15T10:00:00',
      },
      {
        movimentacao_id: 1,
        processo_id: 1,
        funcionario_id: 2,
        tipo_movimentacao: 'CRIACAO_PROCESSO',
        descricao:
          "Processo 'Caso Teste' (CNJ 0061234-56.2026.8.26.0100) criado.",
        data_movimentacao: '2026-01-01T00:00:00',
      },
    ]);

    const processWithSync = {
      ...processData,
      data_realizado: '2026-10-15T10:00:00',
    };
    render(<ProcessDetailsModal process={processWithSync} onClose={vi.fn()} />);

    expect(screen.getByText('15/10/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Movimentações' }));
    expect(
      await screen.findByText(
        "Status sincronizado via Datajud de 'Ativo' para 'Concluído'."
      )
    ).toBeInTheDocument();
    expect(screen.getByText('DataJud')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Processo 'Caso Teste' (CNJ 0061234-56.2026.8.26.0100) criado."
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Criação do Processo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Resumo' }));
    expect(screen.getByText('15/10/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(
      await screen.findByText('Nenhum documento anexado.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Fazer Upload' })
    ).toBeInTheDocument();
  });

  it('exibe alerta de erro e opção de tentar novamente quando falha ao carregar movimentações, sem exibir estado vazio', async () => {
    const { listarMovimentacoes } = await import('@/services/processos');
    listarMovimentacoes.mockRejectedValueOnce(
      new Error('Não foi possível carregar as movimentações.')
    );

    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Movimentações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as movimentações.'
    );
    expect(
      screen.queryByText('Nenhuma movimentação registrada para este processo.')
    ).not.toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryBtn).toBeInTheDocument();

    listarMovimentacoes.mockResolvedValueOnce([]);
    fireEvent.click(retryBtn);

    expect(
      await screen.findByText(
        'Nenhuma movimentação registrada para este processo.'
      )
    ).toBeInTheDocument();
  });

  it('recarrega movimentações ao clicar novamente na aba Movimentações selecionada sem travar o carregamento', async () => {
    const { listarMovimentacoes } = await import('@/services/processos');
    listarMovimentacoes.mockResolvedValue([
      {
        movimentacao_id: 1,
        processo_id: 1,
        tipo_movimentacao: 'CRIACAO_PROCESSO',
        descricao: 'Processo inicial criado.',
        data_movimentacao: '2026-01-01T00:00:00',
      },
    ]);

    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    const movTab = screen.getByRole('tab', { name: 'Movimentações' });
    fireEvent.click(movTab);

    expect(
      await screen.findByText('Processo inicial criado.')
    ).toBeInTheDocument();
    expect(listarMovimentacoes).toHaveBeenCalledTimes(1);

    // Clica novamente na aba já selecionada
    fireEvent.click(movTab);
    await waitFor(() => {
      expect(listarMovimentacoes).toHaveBeenCalledTimes(2);
    });
    expect(
      screen.queryByText('Carregando movimentações…')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Processo inicial criado.')).toBeInTheDocument();
  });

  it('recarrega documentos ao clicar novamente na aba Documentos selecionada sem travar o carregamento', async () => {
    const { listarDocumentos } = await import('@/services/processos');
    listarDocumentos.mockResolvedValue([
      {
        documento_id: 1,
        nome_original: 'doc_teste.pdf',
        tamanho_bytes: 2048,
        data_upload: '2026-02-01T10:00:00',
      },
    ]);

    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    const docTab = screen.getByRole('tab', { name: 'Documentos' });
    fireEvent.click(docTab);

    expect(await screen.findByText('doc_teste.pdf')).toBeInTheDocument();
    expect(listarDocumentos).toHaveBeenCalledTimes(1);

    // Clica novamente na aba Documentos já selecionada
    fireEvent.click(docTab);
    await waitFor(() => {
      expect(listarDocumentos).toHaveBeenCalledTimes(2);
    });
    expect(
      screen.queryByText('Carregando documentos…')
    ).not.toBeInTheDocument();
    expect(screen.getByText('doc_teste.pdf')).toBeInTheDocument();
  });

  it('diferencia falha de listagem de lista vazia na aba Documentos e permite tentar novamente', async () => {
    const { listarDocumentos } = await import('@/services/processos');
    listarDocumentos.mockRejectedValueOnce(
      new Error('Erro ao listar documentos.')
    );

    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Erro ao listar documentos.'
    );
    expect(
      screen.queryByText('Nenhum documento anexado.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Fazer Upload' })
    ).not.toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(retryBtn).toBeInTheDocument();

    listarDocumentos.mockResolvedValueOnce([]);
    fireEvent.click(retryBtn);

    expect(
      await screen.findByText('Nenhum documento anexado.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Fazer Upload' })
    ).toBeInTheDocument();
  });

  it('solicita sempre uma URL atualizada ao visualizar documento, mesmo que o documento já traga uma URL prévia', async () => {
    const { listarDocumentos, obterUrlDocumento } =
      await import('@/services/processos');
    listarDocumentos.mockResolvedValueOnce([
      {
        documento_id: 99,
        nome_original: 'arquivo_antigo.pdf',
        tamanho_bytes: 4096,
        data_upload: '2026-03-01T10:00:00',
        url: 'http://url-expirada.com/arquivo_antigo.pdf',
      },
    ]);
    obterUrlDocumento.mockResolvedValueOnce({
      url: 'http://url-assinada-fresca.com/arquivo_antigo.pdf',
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));

    expect(await screen.findByText('arquivo_antigo.pdf')).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', { name: 'Visualizar' });
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(obterUrlDocumento).toHaveBeenCalledWith(1, 99);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'http://url-assinada-fresca.com/arquivo_antigo.pdf',
        '_blank'
      );
    });

    windowOpenSpy.mockRestore();
  });

  it('exibe mensagem de erro na aba de documentos caso a obtenção da URL falhe', async () => {
    const { listarDocumentos, obterUrlDocumento } =
      await import('@/services/processos');
    listarDocumentos.mockResolvedValueOnce([
      {
        documento_id: 101,
        nome_original: 'arquivo_falha.pdf',
        tamanho_bytes: 4096,
        data_upload: '2026-03-01T10:00:00',
      },
    ]);
    obterUrlDocumento.mockRejectedValueOnce(
      new Error('Link expirado ou inacessível.')
    );

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));

    expect(await screen.findByText('arquivo_falha.pdf')).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', { name: 'Visualizar' });
    fireEvent.click(viewBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Link expirado ou inacessível.'
    );
    expect(windowOpenSpy).not.toHaveBeenCalled();

    windowOpenSpy.mockRestore();
  });

  it('conecta tabs ao painel e permite navegação por teclado', async () => {
    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumo' }), {
      key: 'ArrowRight',
    });
    const movements = screen.getByRole('tab', { name: 'Movimentações' });
    expect(movements).toHaveFocus();
    expect(movements).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      movements.id
    );
    fireEvent.keyDown(movements, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Documentos' }), {
      key: 'Home',
    });
    expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Resumo' }), {
      key: 'ArrowLeft',
    });
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Documentos' }), {
      key: 'Tab',
    });
    expect(screen.getByRole('tab', { name: 'Documentos' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      await screen.findByText('Nenhum documento anexado.')
    ).toBeInTheDocument();
  });

  it('avisa sobre detalhe desatualizado e permite nova consulta', () => {
    const onRetry = vi.fn();
    render(
      <ProcessDetailsModal
        process={processData}
        error="Falha de rede"
        onRetry={onRetry}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Os dados exibidos podem estar desatualizados'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('exibe documentos do processo e permite excluir pelo modal de confirmação quando canEdit for true', async () => {
    const { listarDocumentos, excluirDocumento } =
      await import('@/services/processos');
    listarDocumentos.mockResolvedValueOnce([
      {
        documento_id: 10,
        nome_original: 'procuracao.pdf',
        tamanho_bytes: 10240,
        data_upload: '2026-05-10T12:00:00',
      },
    ]);

    render(
      <ProcessDetailsModal
        process={processData}
        onClose={vi.fn()}
        canEdit={true}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(await screen.findByText('procuracao.pdf')).toBeInTheDocument();
    expect(screen.getByText('10.0 KB •', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText('10/05/2026', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Adicionar Documento' })
    ).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', {
      name: 'Excluir documento procuracao.pdf',
    });
    expect(deleteBtn).toBeInTheDocument();

    // Clica no ícone de lixeira -> abre o modal de confirmação
    fireEvent.click(deleteBtn);
    expect(
      await screen.findByRole('heading', { name: 'Excluir documento?' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tem certeza que deseja excluir o documento/)
    ).toBeInTheDocument();

    // Testa cancelar
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(
      screen.queryByRole('heading', { name: 'Excluir documento?' })
    ).not.toBeInTheDocument();

    // Abre novamente e confirma a exclusão
    fireEvent.click(deleteBtn);
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Excluir' });
    fireEvent.click(confirmDeleteBtn);
    expect(excluirDocumento).toHaveBeenCalledWith(1, 10);
  });

  it('oculta botões de upload e exclusão quando canEdit for false', async () => {
    const { listarDocumentos } = await import('@/services/processos');
    listarDocumentos.mockResolvedValueOnce([
      {
        documento_id: 20,
        nome_original: 'contrato.pdf',
        tamanho_bytes: 5120,
        data_upload: '2026-06-01T12:00:00',
      },
    ]);

    render(
      <ProcessDetailsModal
        process={processData}
        onClose={vi.fn()}
        canEdit={false}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(await screen.findByText('contrato.pdf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Visualizar' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adicionar Documento' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Excluir documento contrato.pdf' })
    ).not.toBeInTheDocument();
  });

  it('valida formato inválido de arquivo no upload', async () => {
    render(<ProcessDetailsModal process={processData} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    await screen.findByText('Nenhum documento anexado.');

    const fileInput = screen.getByTestId('file-upload-input');
    const invalidFile = new File(['executavel'], 'malware.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(
      await screen.findByText(
        'Formato inválido. Envie arquivos PDF, DOCX, DOC, PNG ou JPG.'
      )
    ).toBeInTheDocument();
  });
});
