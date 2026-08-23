import { describe, expect, it } from "vitest";
import { deriveProfileBadges } from "../lib/luma/badges";
import type { Member, Role, SpaceMembership } from "../lib/luma/types";

const roles: Role[] = [{ id: "owner", name: "Owner", priority: 100, permissions: ["MANAGE_SERVER", "MANAGE_ROLES"] }, { id: "member", name: "Member", priority: 1, permissions: ["VIEW_CHANNEL"] }];
const person = (overrides: Partial<Member> = {}): Member => ({ id: "user-id", name: "Test Person", username: "test_person", initials: "TP", accent: "#5167E8", presence: "online", ...overrides });

describe("deriveProfileBadges", () => {
  it("orders owner and account flags consistently", () => {
    const membership: SpaceMembership = { spaceId: "server-id", memberId: "user-id", roleIds: ["owner"], isOwner: true };
    expect(deriveProfileBadges(person({ isDeveloper: true, isVerified: true }), membership, roles)).toEqual(["owner", "developer", "verified"]);
  });
  it("derives admin from role permissions rather than identity", () => {
    const membership: SpaceMembership = { spaceId: "server-id", memberId: "user-id", roleIds: ["owner"] };
    expect(deriveProfileBadges(person(), membership, roles)).toEqual(["admin"]);
  });
  it("does not render administrative badges without membership-derived authority", () => expect(deriveProfileBadges(person({ isVerified: true }), undefined, roles)).toEqual(["verified"]));
});
