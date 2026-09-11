const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://localhost:8000';

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

export async function listarFuncionarios() {
  try {
    const response = await fetch(`${apiUrl}/funcionarios`, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    return await response.json();
  } catch {
    return [];
  }
}

export async function criarFuncionario(dados) {
  const response = await fetch(`${apiUrl}/funcionarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetch(`${apiUrl}/funcionarios/${funcionarioId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível excluir o usuário.');
  }
}

export async function mudarAcessoFuncionario(funcionarioId) {
  const response = await fetch(
    `${apiUrl}/funcionarios/${funcionarioId}/mudar-acesso`,
    {
      method: 'PATCH',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Não foi possível atualizar o acesso.');
  }

  return response.json();
}
