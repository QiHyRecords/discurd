import type { Member, ProfileBadge, Role, SpaceMembership } from "./types";

export const profileBadgeOrder: ProfileBadge[] = ["owner", "admin", "developer", "verified"];

/** Mirrors the server's get_profile_badges function for deterministic client-side display tests. */
export function deriveProfileBadges(member: Member, membership: SpaceMembership | undefined, roles: Role[]): ProfileBadge[] {
  const hasAdminRole = membership?.roleIds.some((roleId) => roles.find((role) => role.id === roleId)?.permissions.some((permission) => permission === "MANAGE_SERVER" || permission === "MANAGE_ROLES")) ?? false;
  const granted = new Set<ProfileBadge>();
  if (membership?.isOwner) granted.add("owner");
  else if (hasAdminRole) granted.add("admin");
  if (member.isDeveloper) granted.add("developer");
  if (member.isVerified) granted.add("verified");
  return profileBadgeOrder.filter((badge) => granted.has(badge));
}
