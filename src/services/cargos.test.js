import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  atualizarCargo,
  criarCargo,
  excluirCargo,
  listarCargos,
} from './cargos';

const respostaJson = (dados, configuracao = {}) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(dados),
  ...configuracao,
});

const respostaComErro = (detail) => ({
  ok: false,
  json: vi.fn().mockResolvedValue({ detail }),
});

describe('serviço de cargos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('lista os cargos sem usar cache', async () => {
    const cargos = [{ cargo_id: 1, nome_cargo: 'Administrador' }];
    fetch.mockResolvedValue(respostaJson(cargos));

    await expect(listarCargos()).resolves.toEqual(cargos);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos', {
      cache: 'no-store',
    });
  });

  it.each([
    ['resposta HTTP inválida', () => respostaComErro('Falha interna')],
    ['falha de rede', () => Promise.reject(new Error('NetworkError'))],
  ])('retorna uma lista vazia em caso de %s', async (_descricao, resposta) => {
    fetch.mockReturnValueOnce(resposta());

    await expect(listarCargos()).resolves.toEqual([]);
  });

  it('cria um cargo com o contrato esperado pelo backend', async () => {
    const dados = {
      nome_cargo: 'Paralegal',
      descricao: 'Cargo personalizado.',
      permissao: { visualizar_processos: true },
    };
    const cargo = { cargo_id: 4, ...dados };
    fetch.mockResolvedValue(respostaJson(cargo));

    await expect(criarCargo(dados)).resolves.toEqual(cargo);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
  });

  it('propaga a mensagem da API ao falhar na criação', async () => {
    fetch.mockResolvedValue(respostaComErro('Cargo já cadastrado'));

    await expect(criarCargo({ nome_cargo: 'Advogado' })).rejects.toThrow(
      'Cargo já cadastrado'
    );
  });

  it('atualiza um cargo por PUT', async () => {
    const dados = { permissao: { visualizar_equipe: true } };
    const cargo = { cargo_id: 3, nome_cargo: 'Estagiário', ...dados };
    fetch.mockResolvedValue(respostaJson(cargo));

    await expect(atualizarCargo(3, dados)).resolves.toEqual(cargo);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos/3', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
  });

  it('propaga a mensagem da API ao falhar na atualização', async () => {
    fetch.mockResolvedValue(respostaComErro('Cargo não encontrado'));

    await expect(atualizarCargo(99, {})).rejects.toThrow(
      'Cargo não encontrado'
    );
  });

  it('exclui um cargo e retorna o objeto removido', async () => {
    const cargo = { cargo_id: 4, nome_cargo: 'Paralegal' };
    fetch.mockResolvedValue(respostaJson(cargo));

    await expect(excluirCargo(4)).resolves.toEqual(cargo);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/cargos/4', {
      method: 'DELETE',
    });
  });

  it.each([
    [
      'mensagem da API',
      respostaComErro(
        'Não é possível excluir um cargo associado a funcionários'
      ),
      'Não é possível excluir um cargo associado a funcionários',
    ],
    [
      'cargo inexistente',
      respostaComErro('Cargo não encontrado'),
      'Cargo não encontrado',
    ],
    [
      'mensagem padrão',
      {
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('Resposta inválida')),
      },
      'Não foi possível excluir o cargo.',
    ],
  ])(
    'lança o erro com %s quando a exclusão falha',
    async (_descricao, resposta, mensagemEsperada) => {
      fetch.mockResolvedValue(resposta);

      await expect(excluirCargo(4)).rejects.toThrow(mensagemEsperada);
    }
  );
});
