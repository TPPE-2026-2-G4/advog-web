import { getAccessToken } from '@/utils/authSession';
import {
  ALERTAS_CONFIG_EVENT,
  SYSTEM_PREF_KEYS,
} from '@/constants/preferencias';
import { API_URL } from './api';

const ENDPOINT = `${API_URL}/institucional/alertas`;

const getHeaders = () => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const getErrorMessage = async (response, fallbackMessage) => {
  const error = await response.json().catch(() => null);
  if (typeof error?.detail === 'string') return error.detail;
  if (Array.isArray(error?.detail)) {
    const msg = error.detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(' ');
    if (msg) return msg;
  }
  return fallbackMessage;
};

export function gravarConfigAlertasLocal(config) {
  if (typeof window === 'undefined' || !config) return;
  try {
    if (config.dias_prazo_proximo != null) {
      localStorage.setItem(
        SYSTEM_PREF_KEYS.DIAS_PRAZO,
        String(config.dias_prazo_proximo)
      );
    }
    if (config.dias_processo_critico != null) {
      localStorage.setItem(
        SYSTEM_PREF_KEYS.DIAS_CRITICO,
        String(config.dias_processo_critico)
      );
    }
  } catch {
    // Sem acesso ao armazenamento do navegador: a tela usa o valor do servidor/padrão.
  }
  window.dispatchEvent(new Event(ALERTAS_CONFIG_EVENT));
}

export async function obterConfigAlertas() {
  const response = await fetch(ENDPOINT, {
    cache: 'no-store',
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'Não foi possível carregar a configuração de alertas.'
      )
    );
  }
  return response.json();
}

export async function salvarConfigAlertas({
  diasPrazoProximo,
  diasProcessoCritico,
}) {
  const response = await fetch(ENDPOINT, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      dias_prazo_proximo: Number(diasPrazoProximo),
      dias_processo_critico: Number(diasProcessoCritico),
    }),
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'Não foi possível salvar a configuração de alertas.'
      )
    );
  }
  const config = await response.json();
  gravarConfigAlertasLocal(config);
  return config;
}

/**
 * Traz do servidor a configuração de alertas do escritório (que vale para todos) e a
 * grava no navegador, de onde o painel e os ajustes a leem. Falhas são silenciosas: a
 * tela segue com o último valor conhecido.
 */
export async function sincronizarConfigAlertas() {
  try {
    const config = await obterConfigAlertas();
    gravarConfigAlertasLocal(config);
    return config;
  } catch {
    return null;
  }
}
