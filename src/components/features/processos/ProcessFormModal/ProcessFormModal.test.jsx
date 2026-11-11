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
  fireEvent.change(screen.getByLabelText('Status Inicial'), {
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

  it.each([
    { label: 'Número do Processo', isRequired: true },
    { label: 'Tribunal', isRequired: true },
    { label: 'Título do Caso', isRequired: true },
    { label: 'Cliente', isRequired: true },
    { label: 'Área de Atuação', isRequired: true },
    { label: 'Status Inicial', isRequired: true },
    { label: 'Descrição', isRequired: false },
    { label: 'Responsável', isRequired: false },
    { label: 'Data de Início', isRequired: true },
    { label: 'Data de Realização', isRequired: false },
    { label: 'Próximo Prazo', isRequired: true },
  ])(
    'configura obrigatoriedade do campo "$label" como $isRequired',
    ({ label, isRequired }) => {
      renderForm();
      const field = screen.getByLabelText(label);

      if (isRequired) {
        expect(field).toBeRequired();
      } else {
        expect(field).not.toBeRequired();
      }
    }
  );

  it('formata o CNJ automaticamente ao digitar', () => {
    const { container } = renderForm();

    expect(screen.getByText(/Campos obrigatórios/)).toBeInTheDocument();
    expect(container.querySelectorAll('[required]')).toHaveLength(8);

    const cnjInput = screen.getByLabelText('Número do Processo');
    fireEvent.change(cnjInput, {
      target: { value: '0061234abc562026x8y2601009999' },
    });
    expect(cnjInput).toHaveValue(processData.cnj);
  });

  it('oferece os quatro status aceitos pelo backend', () => {
    renderForm();
    expect(screen.getByLabelText('Status Inicial')).toHaveValue('Em Análise');
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
    expect(screen.getByLabelText('Cliente')).toHaveValue('Maria Silva');
    expect(screen.getByLabelText('Responsável')).toHaveValue('Ana Paula');
    expect(screen.getByLabelText('Próximo Prazo')).toHaveValue('2026-10-05');
    fireEvent.change(screen.getByLabelText('Título do Caso'), {
      target: { value: 'Caso atualizado' },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith({ titulo: 'Caso atualizado' });
  });

  it('aceita responsável e data de realização vazios', async () => {
    const onSave = vi.fn().mockResolvedValue(processData);
    renderForm({ onSave });
    fillCreationForm();
    fireEvent.change(screen.getByLabelText('Responsável'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Data de Realização'), {
      target: { value: '' },
    });

    fireEvent.submit(screen.getByRole('dialog'));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      funcionario_id: null,
      data_realizado: null,
    });
  });

  it.each([
    {
      campo: 'Próximo Prazo',
      esperado: 'Preencha os campos obrigatórios: Próximo Prazo.',
    },
    {
      campo: 'Data de Início',
      esperado: 'Preencha os campos obrigatórios: Data de Início.',
    },
  ])(
    'exige o campo "$campo" e avisa qual está faltando',
    ({ campo, esperado }) => {
      const onSave = vi.fn();
      renderForm({ onSave });
      fillCreationForm();
      fireEvent.change(screen.getByLabelText(campo), { target: { value: '' } });

      fireEvent.submit(screen.getByRole('dialog'));

      expect(screen.getByRole('alert')).toHaveTextContent(esperado);
      expect(onSave).not.toHaveBeenCalled();
    }
  );

  it('fecha o aviso de erro no X e mantém o formulário preenchido', () => {
    renderForm();
    fillCreationForm();
    fireEvent.change(screen.getByLabelText('Próximo Prazo'), {
      target: { value: '' },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Título do Caso')).toHaveValue(
      processData.titulo
    );
  });

  it.each([
    {
      scenario: 'CNJ em formato inválido',
      cnj: '123',
      expectedError:
        'O número do processo deve seguir o formato CNJ: 0000000-00.0000.0.00.0000.',
    },
    {
      scenario: 'campos obrigatórios em branco após CNJ válido',
      cnj: processData.cnj,
      expectedError:
        'Preencha os campos obrigatórios: Título do Caso, Tribunal, Cliente, Área de Atuação, Próximo Prazo.',
    },
  ])('rejeita submissão quando há $scenario', ({ cnj, expectedError }) => {
    const onSave = vi.fn();
    renderForm({ onSave });

    fireEvent.change(screen.getByLabelText('Número do Processo'), {
      target: { value: cnj },
    });
    fireEvent.submit(screen.getByRole('dialog'));

    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);
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

  it('não exibe conta administradora nas opções de responsável e bloqueia atribuição ao administrador', async () => {
    const mixedFuncionarios = [
      {
        funcionario_id: 1,
        nome: 'Administrador',
        cargo: 'Administrador',
        email: 'advog@advog.com',
      },
      { funcionario_id: 5, nome: 'Ana Paula', cargo: 'Advogada' },
    ];
    renderForm({ funcionarios: mixedFuncionarios });

    const input = screen.getByLabelText('Responsável');
    fireEvent.focus(input);
    const options = screen.getAllByRole('option').map((o) => o.textContent);

    expect(options.some((o) => o.includes('Ana Paula'))).toBe(true);
    expect(options.some((o) => o.includes('Administrador'))).toBe(false);
  });

  it('inicializa a data de início com a data atual no cadastro de novo processo', () => {
    renderForm();
    const hoje = new Date().toISOString().split('T')[0];
    expect(screen.getByLabelText('Data de Início')).toHaveValue(hoje);
  });
});
