import { API_URL } from './api';

export const LIMITES_SOLICITACAO = {
  nome: { minLength: 3, maxLength: 100 },
  descricao: { minLength: 10, maxLength: 2000 },
};

export const ERROS_SOLICITACAO = {
  nome: 'Nome deve conter de 3 a 100 caracteres.',
  email: 'Informe um email válido.',
  telefone: 'Telefone deve conter DDD + número (10 ou 11 dígitos).',
  descricao: 'Descrição deve conter de 10 a 2000 caracteres.',
};

export async function enviarSolicitacaoServico(dados) {
  let response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, '')}/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (response.ok) return response.json();
  if (response.status === 429) {
    throw new Error(
      'Muitas solicitações. Aguarde um minuto e tente novamente.'
    );
  }

  const data = await response.json().catch(() => null);
  const error = new Error(
    typeof data?.detail === 'string'
      ? data.detail
      : 'Não foi possível enviar sua solicitação. Tente novamente.'
  );
  if (response.status === 422 && Array.isArray(data?.detail)) {
    error.message = 'Confira os dados informados e tente novamente.';
    error.fields = Object.fromEntries(
      data.detail
        .map(({ loc, type }) => [
          loc?.at(-1),
          type === 'missing'
            ? 'Preencha este campo.'
            : ERROS_SOLICITACAO[loc?.at(-1)],
        ])
        .filter(([field]) => Object.hasOwn(ERROS_SOLICITACAO, field))
    );
  }
  throw error;
}
