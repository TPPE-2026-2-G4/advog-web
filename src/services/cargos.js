const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://localhost:8000';

const getErrorMessage = async (response, fallbackMessage) => {
  const error = await response.json().catch(() => null);
  return error?.detail || fallbackMessage;
};

export async function listarCargos() {
  try {
    const response = await fetch(`${apiUrl}/cargos`, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    return await response.json();
  } catch {
    return [];
  }
}

export async function criarCargo(dados) {
  const response = await fetch(`${apiUrl}/cargos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível criar o cargo.')
    );
  }

  return response.json();
}

export async function atualizarCargo(cargoId, dados) {
  const response = await fetch(`${apiUrl}/cargos/${cargoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível atualizar o cargo.')
    );
  }

  return response.json();
}

export async function excluirCargo(cargoId) {
  const response = await fetch(`${apiUrl}/cargos/${cargoId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'Não foi possível excluir o cargo.')
    );
  }

  return response.json();
}
