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
  return {
    funcionario_id: funcionario.funcionario_id,
    initials: getInitials(funcionario.nome),
    nome_func: funcionario.nome,
    email_func: funcionario.email,
    cargo: 'Não informado',
    status: funcionario.status,
  };
}
