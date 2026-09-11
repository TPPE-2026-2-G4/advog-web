export function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function toTeamMember(funcionario) {
  const cargo =
    (typeof funcionario.cargo === 'string' && funcionario.cargo) ||
    funcionario.cargo?.nome_cargo ||
    funcionario.cargo?.nome ||
    funcionario.nome_cargo ||
    'Não informado';
  const cargoId = funcionario.cargo_id ?? funcionario.cargo?.cargo_id;
  const permission = funcionario.cargo?.permissao;

  return {
    funcionario_id: funcionario.funcionario_id,
    initials: getInitials(funcionario.nome),
    nome_func: funcionario.nome,
    email_func: funcionario.email,
    cargo,
    status: funcionario.status,
    ...(cargoId !== undefined && { cargo_id: cargoId }),
    ...(funcionario.telefone !== undefined && {
      telefone: funcionario.telefone,
    }),
    ...(permission && {
      permissao: { ...permission },
    }),
  };
}
