import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessFormModal from './ProcessFormModal';

const processData = {
  id: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
  cliente: 'Maria Silva',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  responsavel: 'Ana Paula',
  prazo: '05/10/2026',
  diasRestantes: 4,
};

const fillCreationForm = () => {
  fireEvent.change(screen.getByLabelText('Número do Processo'), {
    target: { value: processData.id.replace(/\D/g, '') },
  });
  fireEvent.change(screen.getByLabelText('Tribunal'), {
    target: { value: ` ${processData.tribunal} ` },
  });
  fireEvent.change(screen.getByLabelText('Título do Caso'), {
    target: { value: processData.titulo },
  });
  fireEvent.change(screen.getByLabelText('Cliente'), {
    target: { value: processData.cliente },
  });
  fireEvent.change(screen.getByLabelText('Área de Atuação'), {
    target: { value: processData.area },
  });
  fireEvent.change(screen.getByLabelText('Responsável'), {
    target: { value: processData.responsavel },
  });
  fireEvent.change(screen.getByLabelText('Status'), {
    target: { value: processData.status },
  });
  fireEvent.change(screen.getByLabelText('Próximo Prazo'), {
    target: { value: '2026-10-05' },
  });
};

describe('ProcessFormModal', () => {
  it('não renderiza quando está fechado', () => {
    render(
      <ProcessFormModal
        isOpen={false}
        process={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('indica os campos obrigatórios e formata a digitação do CNJ', () => {
    const { container } = render(
      <ProcessFormModal
        isOpen
        process={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Campos obrigatórios/)).toBeInTheDocument();
    const requiredFields = container.querySelectorAll('[required]');
    expect(requiredFields).toHaveLength(8);
    requiredFields.forEach((field) => expect(field).toBeRequired());

    const cnjInput = screen.getByLabelText('Número do Processo');
    expect(cnjInput).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(cnjInput, {
      target: { value: '0061234abc562026x8y2601009999' },
    });
    expect(cnjInput).toHaveValue('0061234-56.2026.8.26.0100');
  });

  it('cadastra um processo com valores normalizados', async () => {
    const onSave = vi.fn().mockResolvedValue(processData);
    const onClose = vi.fn();
    render(
      <ProcessFormModal
        isOpen
        process={null}
        onClose={onClose}
        onSave={onSave}
      />
    );
    fillCreationForm();

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());

    expect(onSave).toHaveBeenCalledWith({
      id: processData.id,
      titulo: processData.titulo,
      cliente: processData.cliente,
      status: processData.status,
      tribunal: processData.tribunal,
      area: processData.area,
      responsavel: processData.responsavel,
      prazo: '2026-10-05',
      diasRestantes: expect.any(Number),
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('edita sem permitir ou enviar alteração do CNJ', async () => {
    const onSave = vi.fn().mockResolvedValue(processData);
    render(
      <ProcessFormModal
        isOpen
        process={processData}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByLabelText('Número do Processo')).toHaveAttribute(
      'readonly'
    );
    expect(screen.getByLabelText('Próximo Prazo')).toHaveValue('2026-10-05');
    fireEvent.change(screen.getByLabelText('Título do Caso'), {
      target: { value: 'Caso atualizado' },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('id');
    expect(onSave.mock.calls[0][0].titulo).toBe('Caso atualizado');
  });

  it('rejeita CNJ, campos vazios e prazo inválidos antes da API', () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <ProcessFormModal
        isOpen
        process={null}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByLabelText('Número do Processo'), {
      target: { value: '123' },
    });
    fireEvent.submit(screen.getByRole('dialog'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o número do processo no formato CNJ.'
    );

    rerender(
      <ProcessFormModal
        isOpen={false}
        process={null}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    rerender(
      <ProcessFormModal
        isOpen
        process={null}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fireEvent.change(screen.getByLabelText('Número do Processo'), {
      target: { value: processData.id },
    });
    fireEvent.submit(screen.getByRole('dialog'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Preencha todos os campos obrigatórios.'
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('mantém o modal aberto e mostra erro da API', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(new Error('Processo já cadastrado'));
    render(
      <ProcessFormModal
        isOpen
        process={null}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fillCreationForm();

    fireEvent.submit(screen.getByRole('dialog'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Processo já cadastrado'
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('bloqueia botões enquanto salva', async () => {
    let resolveSave;
    const onSave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    render(
      <ProcessFormModal
        isOpen
        process={null}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fillCreationForm();

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    });

    resolveSave(processData);
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  });
});
