import { getAccessToken } from '@/utils/authSession';
import { isAdministratorAccount } from '@/utils/funcionario';
import { API_URL } from './api';

const validationFieldLabels = {
  nome: 'Nome',
  email: 'E-mail',
  cargo_id: 'Cargo',
};

const getErrorMessage = async (response, fallbackMessage) => {
  const error = await response.json().catch(() => null);

  if (typeof error?.detail === 'string') return error.detail;

  if (Array.isArray(error?.detail)) {
    const messages = error.detail
      .map((validationError) => {
        const field = validationError.loc?.at(-1);
        const label = validationFieldLabels[field] || field;

        if (!label || !validationError.msg) return null;
        if (validationError.type === 'missing') {
          return `${label}: campo obrigatório.`;
        }

        return `${label}: ${validationError.msg}`;
      })
      .filter(Boolean);

    if (messages.length > 0) return messages.join(' ');
  }

  return fallbackMessage;
};

export async function listarFuncionarios(options) {
  try {
    const token =
      typeof options === 'string'
        ? options
        : options?.token || getAccessToken();
    const response = await fetch(`${API_URL}/funcionarios`, {
      cache: 'no-store',
      ...(token && { headers: { Authorization: `Bearer ${token}` } }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data)
      ? data.filter((f) => !isAdministratorAccount(f))
      : [];
  } catch {
    return [];
  }
}

export async function criarFuncionario(dados) {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  const response = await fetch(`${API_URL}/funcionarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível cadastrar o usuário.')
    );
  }

  return response.json();
}

export async function excluirFuncionario(funcionarioId) {
  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const response = await fetch(`${API_URL}/funcionarios/${funcionarioId}`, {
    method: 'DELETE',
    ...(headers && { headers }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível excluir o usuário.');
  }
}

export async function mudarAcessoFuncionario(funcionarioId) {
  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const response = await fetch(
    `${API_URL}/funcionarios/${funcionarioId}/mudar-acesso`,
    {
      method: 'PATCH',
      ...(headers && { headers }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível atualizar o acesso.');
  }

  return response.json();
}

export async function mudarCargoFuncionario(funcionarioId, cargoId) {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  const response = await fetch(
    `${API_URL}/funcionarios/${funcionarioId}/mudar-cargo`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cargo_id: Number(cargoId) }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível alterar o cargo.')
    );
  }

  return response.json();
}

export async function mudarExibicaoInstitucional(
  funcionarioId,
  exibicaoInstitucional
) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(
    `${API_URL}/funcionarios/${funcionarioId}/exibicao-institucional`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ exibicaoInstitucional }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'Não foi possível alterar a visibilidade do advogado.'
      )
    );
  }

  return response.json();
}

export async function mudarReceberEmails(funcionarioId, receberEmails) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(
    `${API_URL}/funcionarios/${funcionarioId}/receber-emails`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ receber_emails: Boolean(receberEmails) }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'Não foi possível atualizar a preferência de notificações por e-mail.'
      )
    );
  }

  return response.json();
}
