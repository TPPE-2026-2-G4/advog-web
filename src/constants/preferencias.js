export const SYSTEM_PREF_KEYS = {
  PAGINA_INICIAL: 'sistema_pagina_inicial',
  ESCOPO_PROCESSOS: 'sistema_escopo_processos',
  DIAS_PRAZO: 'sistema_dias_prazo_proximo',
  DIAS_CRITICO: 'sistema_dias_processo_critico',
};

// Disparado quando a configuração de alertas do escritório (vinda do servidor) é gravada
// no navegador, para que telas já abertas (painel, ajustes) se atualizem.
export const ALERTAS_CONFIG_EVENT = 'advog:alertas-config';

export function subscribeAlertasConfig(onChange) {
  window.addEventListener(ALERTAS_CONFIG_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(ALERTAS_CONFIG_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
