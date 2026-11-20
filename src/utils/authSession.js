import {
  AUTH_SESSION_EVENT,
  getCargoNome,
  normalizeRoleName,
  notifyAuthSessionChange,
  subscribeAuthSession,
} from '@/utils/funcionario';
import { parseJwtPayload } from '@/utils/jwt';

export { AUTH_SESSION_EVENT, notifyAuthSessionChange, subscribeAuthSession };

const ACTIVE_TOKEN_KEY = 'auth_active_token';
const ROLES_PERMS_CACHE_KEY = 'updated_roles_permissions';
const AUTH_SYNC_STORAGE_KEYS = new Set([
  'access_token',
  'token',
  ACTIVE_TOKEN_KEY,
  'current_user',
  ROLES_PERMS_CACHE_KEY,
]);

const clearTabSessionStorage = () => {
  sessionStorage.removeItem(ACTIVE_TOKEN_KEY);
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('current_user');
};

const syncTabSessionIfNeeded = () => {
  if (typeof window === 'undefined') return;

  const activeLocalToken = localStorage.getItem(ACTIVE_TOKEN_KEY);
  const activeSessionToken = sessionStorage.getItem(ACTIVE_TOKEN_KEY);

  if (activeLocalToken) {
    if (activeSessionToken !== activeLocalToken) {
      sessionStorage.setItem(ACTIVE_TOKEN_KEY, activeLocalToken);
      const localAccessToken =
        localStorage.getItem('access_token') ||
        localStorage.getItem('token') ||
        activeLocalToken;
      sessionStorage.setItem('access_token', localAccessToken);

      const localUser = localStorage.getItem('current_user');
      if (localUser !== null) {
        sessionStorage.setItem('current_user', localUser);
      } else {
        sessionStorage.removeItem('current_user');
      }
      return;
    }

    const localUser = localStorage.getItem('current_user');
    const sessionUser = sessionStorage.getItem('current_user');
    if (localUser !== null && localUser !== sessionUser) {
      sessionStorage.setItem('current_user', localUser);
    }
    return;
  }

  if (activeSessionToken) {
    clearTabSessionStorage();
  }
};

const readRolesPermsCache = () => {
  if (typeof window === 'undefined') return { byId: {}, byName: {} };
  try {
    const raw = localStorage.getItem(ROLES_PERMS_CACHE_KEY);
    if (!raw) return { byId: {}, byName: {} };
    const parsed = JSON.parse(raw);
    return {
      byId: parsed?.byId && typeof parsed.byId === 'object' ? parsed.byId : {},
      byName:
        parsed?.byName && typeof parsed.byName === 'object'
          ? parsed.byName
          : {},
    };
  } catch {
    return { byId: {}, byName: {} };
  }
};

const writeRolePermsCache = (role) => {
  if (typeof window === 'undefined' || !role?.permissao) return;
  try {
    const cache = readRolesPermsCache();
    const roleName = getCargoNome(role);
    const entry = {
      ...(role.cargo_id != null ? { cargo_id: role.cargo_id } : {}),
      ...(roleName ? { nome_cargo: roleName } : {}),
      permissao: { ...role.permissao },
    };
    if (role.cargo_id != null) {
      cache.byId[String(role.cargo_id)] = entry;
    }
    const normalizedName = normalizeRoleName(roleName);
    if (normalizedName) {
      cache.byName[normalizedName] = entry;
    }
    localStorage.setItem(ROLES_PERMS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const findCachedRoleForUser = (user) => {
  if (!user || typeof user !== 'object') return null;
  const cache = readRolesPermsCache();
  const userCargoId = user.cargo?.cargo_id ?? user.cargo_id;
  if (userCargoId != null && cache.byId[String(userCargoId)]) {
    return cache.byId[String(userCargoId)];
  }
  const roleName = normalizeRoleName(
    getCargoNome(user.cargo) || user.nome_cargo
  );
  if (roleName && cache.byName[roleName]) {
    return cache.byName[roleName];
  }
  return null;
};

const applyRolePermissionsToUser = (user, role) => {
  if (!user || typeof user !== 'object' || !role?.permissao) return user;

  const nextPermsObj = { ...role.permissao };
  const existingCargo =
    user.cargo && typeof user.cargo === 'object'
      ? user.cargo
      : getCargoNome(user.cargo) || user.nome_cargo
        ? { nome_cargo: getCargoNome(user.cargo) || user.nome_cargo }
        : {};
  const roleName = getCargoNome(role) || getCargoNome(existingCargo);

  const nextCargo = {
    ...existingCargo,
    ...(role.cargo_id != null
      ? { cargo_id: role.cargo_id }
      : existingCargo.cargo_id != null
        ? { cargo_id: existingCargo.cargo_id }
        : {}),
    ...(roleName ? { nome_cargo: roleName } : {}),
    permissao: nextPermsObj,
  };

  const nextUser = {
    ...user,
    ...(role.cargo_id != null
      ? { cargo_id: role.cargo_id }
      : user.cargo_id != null
        ? { cargo_id: user.cargo_id }
        : {}),
    cargo: nextCargo,
    ...(user.permissao ? { permissao: { ...nextPermsObj } } : {}),
  };

  if (Array.isArray(user.permissoes)) {
    nextUser.permissoes = Array.from(
      new Set([
        ...user.permissoes.filter((p) => nextPermsObj[p] !== false),
        ...Object.entries(nextPermsObj)
          .filter(([, allowed]) => Boolean(allowed))
          .map(([perm]) => perm),
      ])
    );
  }

  return nextUser;
};

const persistCurrentUser = (nextUser) => {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(nextUser);
  localStorage.setItem('current_user', serialized);
  sessionStorage.setItem('current_user', serialized);
};

const isSameEmployee = (userA, userB) => {
  if (!userA || !userB) return false;
  const idA = userA.funcionario_id ?? userA.id;
  const idB = userB.funcionario_id ?? userB.id;
  if (idA != null && idB != null && String(idA) === String(idB)) {
    return true;
  }
  const emailA = (userA.email || userA.email_func || '').trim().toLowerCase();
  const emailB = (userB.email || userB.email_func || '').trim().toLowerCase();
  return Boolean(emailA && emailB && emailA === emailB);
};

const doesUserMatchRole = (user, role, contextMembers = []) => {
  if (!user || !role) return false;

  const userCargoId = user.cargo?.cargo_id ?? user.cargo_id;
  if (
    userCargoId != null &&
    role.cargo_id != null &&
    String(userCargoId) === String(role.cargo_id)
  ) {
    return true;
  }

  const userRoleName = normalizeRoleName(
    getCargoNome(user.cargo) || user.nome_cargo
  );
  const targetRoleName = normalizeRoleName(getCargoNome(role));
  if (userRoleName && targetRoleName && userRoleName === targetRoleName) {
    return true;
  }

  if (Array.isArray(contextMembers) && contextMembers.length > 0) {
    const matchedMember = contextMembers.find((member) =>
      isSameEmployee(user, member)
    );
    if (matchedMember) {
      const memberCargoId =
        matchedMember.cargo_id ?? matchedMember.cargo?.cargo_id;
      if (
        memberCargoId != null &&
        role.cargo_id != null &&
        String(memberCargoId) === String(role.cargo_id)
      ) {
        return true;
      }
      const memberRoleName = normalizeRoleName(
        getCargoNome(matchedMember.cargo) || matchedMember.nome_cargo
      );
      if (
        memberRoleName &&
        targetRoleName &&
        memberRoleName === targetRoleName
      ) {
        return true;
      }
    }
  }

  return false;
};

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  syncTabSessionIfNeeded();
  return (
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')
  );
};

export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  syncTabSessionIfNeeded();

  const raw =
    sessionStorage.getItem('current_user') ||
    localStorage.getItem('current_user');
  let user = null;
  try {
    user = JSON.parse(raw || 'null');
  } catch {
    user = null;
  }

  const token = getAccessToken();
  if (token) {
    const payload = parseJwtPayload(token);
    if (payload && user) {
      const tokenEmail =
        payload.email ||
        (typeof payload.sub === 'string' && payload.sub.includes('@')
          ? payload.sub
          : null);
      const userEmail = user.email || user.email_func;
      const emailMismatch = Boolean(
        tokenEmail &&
        userEmail &&
        tokenEmail.toLowerCase() !== userEmail.toLowerCase()
      );

      const tokenSub =
        payload.sub !== undefined &&
        payload.sub !== null &&
        !(typeof payload.sub === 'string' && payload.sub.includes('@'))
          ? String(payload.sub)
          : null;
      const userId = user.funcionario_id ?? user.id;
      const idMismatch = Boolean(
        tokenSub &&
        userId !== undefined &&
        userId !== null &&
        String(tokenSub) !== String(userId)
      );

      if (emailMismatch || idMismatch) {
        sessionStorage.removeItem('current_user');
        localStorage.removeItem('current_user');
        user = null;
      }
    }

    if (!user && payload) {
      const fallbackEmail =
        payload.email ||
        (typeof payload.sub === 'string' && payload.sub.includes('@')
          ? payload.sub
          : undefined);

      if (fallbackEmail) {
        const hasNumericSub =
          payload.sub !== undefined &&
          payload.sub !== null &&
          !String(payload.sub).includes('@');
        const inferredId = hasNumericSub
          ? Number.isNaN(Number(payload.sub))
            ? payload.sub
            : Number(payload.sub)
          : undefined;

        user = {
          funcionario_id: inferredId,
          email: fallbackEmail,
          nome: payload.nome || fallbackEmail.split('@')[0],
          cargo: payload.cargo || '',
          ...(Array.isArray(payload.permissoes)
            ? { permissoes: payload.permissoes }
            : {}),
        };
      }
    }
  }

  if (user) {
    const cachedRole = findCachedRoleForUser(user);
    if (cachedRole?.permissao) {
      user = applyRolePermissionsToUser(user, cachedRole);
    }
  }

  return user;
};

export const syncSessionWithLocalStorage = (event) => {
  if (typeof window === 'undefined') return;

  if (event && 'key' in event) {
    if (event.key !== null && !AUTH_SYNC_STORAGE_KEYS.has(event.key)) {
      return;
    }

    if (event.key === null) {
      if (
        sessionStorage.getItem(ACTIVE_TOKEN_KEY) ||
        !localStorage.getItem('access_token')
      ) {
        clearTabSessionStorage();
      }
      return;
    }

    if (event.newValue === null) {
      if (event.key === ACTIVE_TOKEN_KEY || event.key === 'access_token') {
        if (
          !localStorage.getItem(ACTIVE_TOKEN_KEY) &&
          !localStorage.getItem('access_token')
        ) {
          clearTabSessionStorage();
        }
      } else if (event.key === 'current_user') {
        if (localStorage.getItem('current_user') === null) {
          sessionStorage.removeItem('current_user');
        }
      }
      return;
    }

    const activeLocalToken = localStorage.getItem(ACTIVE_TOKEN_KEY);
    const localToken =
      localStorage.getItem('access_token') || localStorage.getItem('token');
    const localUser = localStorage.getItem('current_user');

    if (activeLocalToken) {
      sessionStorage.setItem(ACTIVE_TOKEN_KEY, activeLocalToken);
    }
    if (localToken) {
      sessionStorage.setItem('access_token', localToken);
    }
    if (localUser !== null) {
      sessionStorage.setItem('current_user', localUser);
    }
    return;
  }

  syncTabSessionIfNeeded();
};

export const syncCurrentUserRolePermissions = (
  updatedRole,
  contextMembers = []
) => {
  if (typeof window === 'undefined' || !updatedRole) return null;

  writeRolePermsCache(updatedRole);

  const currentUser = getCurrentUser();
  if (
    !currentUser ||
    !doesUserMatchRole(currentUser, updatedRole, contextMembers)
  ) {
    return null;
  }

  const nextUser = applyRolePermissionsToUser(currentUser, updatedRole);
  persistCurrentUser(nextUser);
  notifyAuthSessionChange();
  return nextUser;
};

export const syncCurrentUserMemberRole = (
  targetMember,
  updatedFuncionario,
  matchedRole = null
) => {
  if (typeof window === 'undefined') return null;

  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const matchesTarget =
    isSameEmployee(currentUser, targetMember) ||
    isSameEmployee(currentUser, updatedFuncionario);
  if (!matchesTarget) return null;

  const rawUpdatedCargo = updatedFuncionario?.cargo;
  const nextCargoId =
    updatedFuncionario?.cargo_id ??
    (typeof rawUpdatedCargo === 'object'
      ? rawUpdatedCargo?.cargo_id
      : undefined) ??
    matchedRole?.cargo_id;
  const nextRoleName =
    getCargoNome(rawUpdatedCargo) ||
    updatedFuncionario?.nome_cargo ||
    getCargoNome(matchedRole);

  let nextCargo =
    rawUpdatedCargo && typeof rawUpdatedCargo === 'object'
      ? {
          ...(matchedRole || {}),
          ...rawUpdatedCargo,
          ...(rawUpdatedCargo.permissao || matchedRole?.permissao
            ? {
                permissao: rawUpdatedCargo.permissao ?? matchedRole?.permissao,
              }
            : {}),
        }
      : matchedRole
        ? {
            ...matchedRole,
            ...(nextRoleName ? { nome_cargo: nextRoleName } : {}),
          }
        : rawUpdatedCargo || currentUser.cargo;

  const cachedRole = findCachedRoleForUser({
    cargo_id: nextCargoId,
    cargo: nextCargo,
    nome_cargo: nextRoleName,
  });

  if (
    nextCargo &&
    typeof nextCargo === 'object' &&
    !nextCargo.permissao &&
    cachedRole?.permissao
  ) {
    nextCargo = { ...nextCargo, permissao: { ...cachedRole.permissao } };
  }

  let nextUser = {
    ...currentUser,
    ...(nextCargoId !== undefined ? { cargo_id: nextCargoId } : {}),
    ...(nextRoleName ? { nome_cargo: nextRoleName } : {}),
    cargo: nextCargo,
  };

  const nextPermsObj =
    (nextCargo && typeof nextCargo === 'object' && nextCargo.permissao) ||
    cachedRole?.permissao ||
    null;

  if (nextPermsObj) {
    nextUser = applyRolePermissionsToUser(nextUser, {
      cargo_id: nextCargoId,
      nome_cargo: nextRoleName,
      permissao: nextPermsObj,
    });
  }

  persistCurrentUser(nextUser);
  notifyAuthSessionChange();
  return nextUser;
};

export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem(ACTIVE_TOKEN_KEY);
  localStorage.removeItem('current_user');
  localStorage.removeItem(ROLES_PERMS_CACHE_KEY);
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem(ACTIVE_TOKEN_KEY);
  sessionStorage.removeItem('current_user');
  document.cookie =
    'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  notifyAuthSessionChange();
};
