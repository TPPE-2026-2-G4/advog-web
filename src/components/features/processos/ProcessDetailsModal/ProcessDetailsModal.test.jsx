import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessDetailsModal from './ProcessDetailsModal';
import styles from './ProcessDetailsModal.module.css';

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

  it('permite alternar entre as abas Resumo, Movimentações e Documentos sem inventar movimentações', () => {
    const processWithSync = {
      ...processData,
      data_realizado: '2026-10-15T10:00:00',
    };
    render(<ProcessDetailsModal process={processWithSync} onClose={vi.fn()} />);

    // Aba padrão é Resumo
    expect(screen.getByText('15/10/2026')).toBeInTheDocument();

    // Clica na aba Movimentações
    fireEvent.click(screen.getByRole('tab', { name: 'Movimentações' }));
    expect(
      screen.getByText(
        'O histórico de movimentações ainda não está disponível.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('DataJud')).not.toBeInTheDocument();

    // Volta para a aba Resumo
    fireEvent.click(screen.getByRole('tab', { name: 'Resumo' }));
    expect(screen.getByText('15/10/2026')).toBeInTheDocument();

    // Clica na aba Documentos
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    expect(
      screen.getByText(
        'A consulta de documentos ainda não está disponível nesta tela.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Fazer Upload' })
    ).not.toBeInTheDocument();
  });

  it('conecta tabs ao painel e permite navegação por teclado', () => {
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
});
