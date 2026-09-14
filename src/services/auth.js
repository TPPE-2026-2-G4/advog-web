const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

export async function login(email, senha) {
  if (!apiUrl) {
    throw new Error('URL da API não configurada');
  }

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      senha,
    }),
  });

  if (!response.ok) {
    let message = 'Email ou senha inválidos';

    try {
      const errorData = await response.json();
      if (errorData.message) {
        message = errorData.message;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function firstLogin({ token, nome, senha, uf_oab, numero_oab }) {
  if (!apiUrl) {
    throw new Error('URL da API não configurada');
  }

  const response = await fetch(`${apiUrl}/funcionarios/primeiro-acesso`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      nome,
      senha,
      uf_oab: uf_oab || undefined,
      numero_oab: numero_oab || undefined,
    }),
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir o cadastro.';

    try {
      const errorData = await response.json();
      if (errorData.message) {
        message = errorData.message;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
