export const PERMISSION_LABELS = Object.freeze({
  visualizar_processos: 'Visualizar processos',
  criar_processos: 'Criar processos',
  editar_processos: 'Editar processos',
  excluir_processos: 'Excluir processos',
  visualizar_financeiro: 'Visualizar financeiro',
  gerenciar_financeiro: 'Gerenciar financeiro',
  visualizar_equipe: 'Visualizar equipe',
  gerenciar_equipe: 'Gerenciar equipe',
  configuracoes_sistema: 'Configurações do sistema',
});

export const createEmptyPermission = () =>
  Object.fromEntries(
    Object.keys(PERMISSION_LABELS).map((permissionName) => [
      permissionName,
      false,
    ])
  );

export const getPermissionLabel = (permissionName) => {
  if (PERMISSION_LABELS[permissionName]) {
    return PERMISSION_LABELS[permissionName];
  }

  const label = permissionName.replaceAll('_', ' ');
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
};
