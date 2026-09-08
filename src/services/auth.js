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
