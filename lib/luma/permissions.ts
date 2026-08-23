import type { Permission, PermissionRule, Role } from "./types";

export type PermissionCheckInput = {
  memberId: string;
  roleIds: string[];
  channelId?: string;
  permission: Permission;
  roles: Role[];
  rules: PermissionRule[];
};

/**
 * Client-side preview only. Production authorization must repeat this decision in
 * database RLS policies and server-side functions.
 */
export function can(input: PermissionCheckInput): boolean {
  const rankedRoles = input.roles
    .filter((role) => input.roleIds.includes(role.id))
    .sort((a, b) => b.priority - a.priority);
  const grantedByRole = rankedRoles.some((role) => role.permissions.includes(input.permission));
  const matchingRules = input.rules.filter(
    (rule) =>
      (!rule.channelId || rule.channelId === input.channelId) &&
      (!rule.roleId || input.roleIds.includes(rule.roleId)) &&
      (!rule.memberId || rule.memberId === input.memberId),
  );
  if (matchingRules.some((rule) => rule.deny.includes(input.permission))) return false;
  if (matchingRules.some((rule) => rule.allow.includes(input.permission))) return true;
  return grantedByRole;
}

export function canManageRole(actor: Role, target: Role, requested: Permission[]): boolean {
  return actor.priority > target.priority && requested.every((permission) => actor.permissions.includes(permission));
}
