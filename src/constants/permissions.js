export const PERMISSOES_IMPLICADAS = Object.freeze({
  gerenciar_processos: 'visualizar_processos',
  gerenciar_atividades: 'visualizar_atividades',
  gerenciar_financeiro: 'visualizar_financeiro',
  gerenciar_equipe: 'visualizar_equipe',
  gerenciar_clientes: 'visualizar_clientes',
});

export const PERMISSION_LABELS = Object.freeze({
  visualizar_processos: 'Visualizar processos',
  gerenciar_processos: 'Gerenciar processos',
  visualizar_atividades: 'Visualizar atividades',
  gerenciar_atividades: 'Gerenciar atividades',
  visualizar_financeiro: 'Visualizar financeiro',
  gerenciar_financeiro: 'Gerenciar financeiro',
  visualizar_equipe: 'Visualizar equipe',
  gerenciar_equipe: 'Gerenciar equipe',
  visualizar_clientes: 'Visualizar clientes',
  gerenciar_clientes: 'Gerenciar clientes',
  gerenciar_site: 'Gerenciar site',
  configuracoes_sistema: 'Configurações do sistema',
});

export const createEmptyPermission = () =>
  Object.fromEntries(
    Object.keys(PERMISSION_LABELS).map((permissionName) => [
      permissionName,
      false,
    ])
  );

export const togglePermission = (currentPermissions, permissionName) => {
  const nextValue = !currentPermissions[permissionName];
  const updated = {
    ...currentPermissions,
    [permissionName]: nextValue,
  };
  if (nextValue && PERMISSOES_IMPLICADAS[permissionName]) {
    updated[PERMISSOES_IMPLICADAS[permissionName]] = true;
  }
  if (!nextValue) {
    for (const [gerenciar, visualizar] of Object.entries(
      PERMISSOES_IMPLICADAS
    )) {
      if (visualizar === permissionName) {
        updated[gerenciar] = false;
      }
    }
  }
  return updated;
};

export const getPermissionLabel = (permissionName) => {
  if (PERMISSION_LABELS[permissionName]) {
    return PERMISSION_LABELS[permissionName];
  }

  const label = permissionName.replaceAll('_', ' ');
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
};
