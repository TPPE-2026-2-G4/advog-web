import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProcessFormModal from './ProcessFormModal';

const clientes = [{ cliente_id: 10, nome: 'Maria Silva' }];
const funcionarios = [{ funcionario_id: 5, nome: 'Ana Paula' }];
const processData = {
  processo_id: 1,
  cnj: '0061234-56.2026.8.26.0100',
  titulo: 'Caso Teste',
  descricao: 'Descrição',
  status: 'Ativo',
  tribunal: 'TJDFT',
  area: 'Civil',
  data_inicio: '2026-01-01T00:00:00',
  data_realizado: null,
  data_prazo: '2026-10-05T00:00:00',
  cliente_id: 10,
  funcionario_id: 5,
};

const renderForm = (overrides = {}) =>
  render(
    <ProcessFormModal
      isOpen
      process={null}
      clientes={clientes}
      funcionarios={funcionarios}
      onClose={vi.fn()}
      onSave={vi.fn()}
      {...overrides}
    />
  );

const fillCreationForm = () => {
  fireEvent.change(screen.getByLabelText('Número do Processo'), {
    target: { value: processData.cnj.replace(/\D/g, '') },
  });
  fireEvent.change(screen.getByLabelText('Tribunal'), {
    target: { value: ` ${processData.tribunal} ` },
  });
  fireEvent.change(screen.getByLabelText('Título do Caso'), {
    target: { value: processData.titulo },
  });
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: processData.descricao },
  });
  fireEvent.change(screen.getByLabelText('Cliente'), {
    target: { value: String(processData.cliente_id) },
  });
  fireEvent.change(screen.getByLabelText('Área de Atuação'), {
    target: { value: processData.area },
  });
  fireEvent.change(screen.getByLabelText('Responsável'), {
    target: { value: String(processData.funcionario_id) },
  });
  fireEvent.change(screen.getByLabelText('Status'), {
    target: { value: processData.status },
  });
  fireEvent.change(screen.getByLabelText('Data de Início'), {
    target: { value: '2026-01-01' },
  });
  fireEvent.change(screen.getByLabelText('Próximo Prazo'), {
    target: { value: '2026-10-05' },
  });
};

describe('ProcessFormModal', () => {
  it('não renderiza quando está fechado', () => {
    renderForm({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marca somente os campos obrigatórios e formata o CNJ', () => {
    const { container } = renderForm();

    expect(screen.getByText(/Campos obrigatórios/)).toBeInTheDocument();
    expect(container.querySelectorAll('[required]')).toHaveLength(6);
    expect(screen.getByLabelText('Responsável')).not.toBeRequired();
    expect(screen.getByLabelText('Próximo Prazo')).not.toBeRequired();

    const cnjInput = screen.getByLabelText('Número do Processo');
    fireEvent.change(cnjInput, {
      target: { value: '0061234abc562026x8y2601009999' },
    });
    expect(cnjInput).toHaveValue(processData.cnj);
  });

  it('oferece os quatro status aceitos pelo backend', () => {
    renderForm();
    const options = screen
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(options).toEqual(
      expect.arrayContaining(['Em Análise', 'Ativo', 'Concluído', 'Arquivado'])
    );
    expect(options).not.toContain('Pendente');
  });

  it('cadastra usando IDs e datas no formato datetime', async () => {
    const onSave = vi.fn().mockResolvedValue(processData);
    const onClose = vi.fn();
    renderForm({ onSave, onClose });
    fillCreationForm();

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());

    expect(onSave).toHaveBeenCalledWith({
      cnj: processData.cnj,
      titulo: processData.titulo,
      descricao: processData.descricao,
      status: processData.status,
      tribunal: processData.tribunal,
      area: processData.area,
      data_inicio: '2026-01-01T00:00:00',
      data_realizado: null,
      data_prazo: '2026-10-05T00:00:00',
      cliente_id: 10,
      funcionario_id: 5,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('edita sem reenviar o CNJ', async () => {
    const onSave = vi.fn().mockResolvedValue(processData);
    renderForm({ process: processData, onSave });

    expect(screen.getByLabelText('Número do Processo')).toHaveAttribute(
      'readonly'
    );
    expect(screen.getByLabelText('Cliente')).toHaveValue('10');
    expect(screen.getByLabelText('Responsável')).toHaveValue('5');
    expect(screen.getByLabelText('Próximo Prazo')).toHaveValue('2026-10-05');
    fireEvent.change(screen.getByLabelText('Título do Caso'), {
      target: { value: 'Caso atualizado' },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith({ titulo: 'Caso atualizado' });
  });

  it('aceita responsável e datas opcionais vazios', async () => {
    const onSave = vi.fn().mockResolvedValue(processData);
    renderForm({ onSave });
    fillCreationForm();
    fireEvent.change(screen.getByLabelText('Responsável'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Data de Início'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Próximo Prazo'), {
      target: { value: '' },
    });

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      funcionario_id: null,
      data_inicio: null,
      data_prazo: null,
    });
  });

  it('rejeita CNJ inválido e campos obrigatórios vazios', () => {
    const onSave = vi.fn();
    const { rerender } = renderForm({ onSave });

    fireEvent.change(screen.getByLabelText('Número do Processo'), {
      target: { value: '123' },
    });
    fireEvent.submit(screen.getByRole('dialog'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o número do processo no formato CNJ.'
    );

    rerender(
      <ProcessFormModal
        isOpen
        process={null}
        clientes={clientes}
        funcionarios={funcionarios}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    fireEvent.change(screen.getByLabelText('Número do Processo'), {
      target: { value: processData.cnj },
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
    renderForm({ onSave });
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
    renderForm({ onSave });
    fillCreationForm();

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    );

    resolveSave(processData);
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  });
});
