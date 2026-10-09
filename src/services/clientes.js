import { getAccessToken } from '@/utils/authSession';
import { API_URL } from './api';

export async function listarClientes() {
  const token = getAccessToken();
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  let response;
  try {
    response = await fetch(`${API_URL}/clientes/`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Não foi possível carregar os clientes.');
  }

  if (response.status === 401) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  if (!response.ok) {
    throw new Error('Não foi possível carregar os clientes.');
  }

  try {
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    throw new Error('Não foi possível carregar os clientes.');
  }
}
