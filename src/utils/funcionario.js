export function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getLawyerInitials(name) {
  if (!name) return '';
  const clean = name.replace(/^(dr[a]?\.?|adv[a]?\.?)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatOab(memberOrUf, maybeNumero) {
  if (!memberOrUf) return '';

  let uf = '';
  let rawNumero = '';

  if (typeof memberOrUf === 'object') {
    uf = (
      memberOrUf.uf_oab ||
      memberOrUf.ufOab ||
      memberOrUf.uf ||
      memberOrUf.estado_oab ||
      ''
    )
      .toString()
      .trim()
      .toUpperCase();

    rawNumero =
      memberOrUf.numero_oab ??
      memberOrUf.numeroOab ??
      memberOrUf.oab_numero ??
      memberOrUf.numero ??
      memberOrUf.oab ??
      '';
  } else {
    uf = String(memberOrUf).trim().toUpperCase();
    rawNumero = maybeNumero ?? '';
  }

  let numero = String(rawNumero).trim();
  if (!numero) return '';

  if (numero.toUpperCase().startsWith('OAB')) {
    return numero;
  }

  numero = numero.replace(/^OAB\/?/i, '').trim();

  // Formata o número com ponto separador de milhar se forem dígitos puros
  if (/^\d{4,}$/.test(numero)) {
    numero = Number(numero).toLocaleString('pt-BR');
  }

  if (uf) {
    return `OAB/${uf} ${numero}`;
  }

  return `OAB ${numero}`;
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

export function normalizeRoleName(roleName = '') {
  return String(roleName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function isAdministratorRole(roleOrName) {
  if (!roleOrName) return false;
  const name =
    typeof roleOrName === 'string'
      ? roleOrName
      : roleOrName.nome_cargo || roleOrName.nome || roleOrName.cargo || '';
  const normalized = normalizeRoleName(name);
  return normalized === 'administrador' || normalized === 'admin';
}

export function isAdministratorAccount(member, roles = []) {
  if (!member) return false;

  const roleValue =
    member.cargo || member.cargo_nome || member.nome_cargo || '';
  if (isAdministratorRole(roleValue)) return true;

  if (
    member.cargo_id !== undefined &&
    member.cargo_id !== null &&
    Array.isArray(roles) &&
    roles.length > 0
  ) {
    const matchingRole = roles.find(
      (r) => String(r.cargo_id) === String(member.cargo_id)
    );
    if (matchingRole && isAdministratorRole(matchingRole)) return true;
  }

  const name = normalizeRoleName(
    member.nome_func ?? member.nome ?? member.nome_completo ?? ''
  );
  if (name === 'administrador' || name === 'admin') return true;

  const email = String(member.email_func ?? member.email ?? '')
    .trim()
    .toLowerCase();
  if (
    email === 'advog@advog.com' ||
    email === 'admin@admin.com' ||
    email.startsWith('admin@') ||
    email === 'administrador@advog.com'
  ) {
    return true;
  }

  return false;
}

export function filterNonAdministratorMembers(members = [], roles = []) {
  if (!Array.isArray(members)) return [];
  return members.filter((member) => !isAdministratorAccount(member, roles));
}
