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
      if (typeof errorData?.detail === 'string') {
        message = errorData.detail;
      } else if (errorData?.message) {
        message = errorData.message;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function firstLogin({
  token,
  nome,
  senha,
  uf_oab,
  numero_oab,
  uf,
  numeroOab,
}) {
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
      uf_oab: uf_oab || uf || undefined,
      numero_oab: numero_oab || numeroOab || undefined,
    }),
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir o cadastro.';

    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === 'string') {
        message = errorData.detail;
      } else if (Array.isArray(errorData?.detail)) {
        message = errorData.detail
          .map((err) => {
            const field = err.loc?.at(-1);
            if (field === 'numero_oab') {
              return 'Número da OAB deve conter exatamente 5 dígitos.';
            }
            if (field === 'uf_oab') {
              return 'UF da OAB deve conter 2 letras.';
            }
            return err.msg || err.message;
          })
          .filter(Boolean)
          .join(' ');
      } else if (errorData?.message) {
        message = errorData.message;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
