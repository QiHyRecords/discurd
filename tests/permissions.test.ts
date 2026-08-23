import { describe, expect, it } from "vitest";
import { can, canManageRole } from "../lib/luma/permissions";
import type { PermissionRule, Role } from "../lib/luma/types";

const roles: Role[] = [
  { id: "host", name: "Host", priority: 100, permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "DELETE_MESSAGES", "MANAGE_SERVER", "MANAGE_ROLES"] },
  { id: "moderator", name: "Moderator", priority: 50, permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "DELETE_MESSAGES"] },
  { id: "member", name: "Member", priority: 10, permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"] },
];
const rules: PermissionRule[] = [{ channelId: "notices", roleId: "member", allow: [], deny: ["SEND_MESSAGES"] }];

describe("permission evaluator", () => {
  it("allows a member to read ordinary channels", () => expect(can({ memberId: "user-a", roleIds: ["member"], channelId: "lobby", permission: "VIEW_CHANNEL", roles, rules })).toBe(true));
  it("honours a channel-specific deny over inherited send permission", () => expect(can({ memberId: "user-a", roleIds: ["member"], channelId: "notices", permission: "SEND_MESSAGES", roles, rules })).toBe(false));
  it("does not let a lower role manage an equal or higher role", () => expect(canManageRole(roles[2], roles[1], ["SEND_MESSAGES"])).toBe(false));
  it("does not let a moderator grant a capability they do not have", () => expect(canManageRole(roles[1], roles[2], ["MANAGE_SERVER"])).toBe(false));
  it("allows a moderator to use inherited message-deletion capability", () => expect(can({ memberId: "user-b", roleIds: ["moderator"], channelId: "lobby", permission: "DELETE_MESSAGES", roles, rules })).toBe(true));
  it("allows a host to manage lower roles", () => expect(canManageRole(roles[0], roles[1], ["DELETE_MESSAGES"])).toBe(true));
  it("honours an explicit member allow when no deny exists", () => expect(can({ memberId: "user-a", roleIds: ["member"], channelId: "private", permission: "MANAGE_CHANNELS", roles, rules: [{ channelId: "private", memberId: "user-a", allow: ["MANAGE_CHANNELS"], deny: [] }] })).toBe(true));
  it("denies a capability when no role or override grants it", () => expect(can({ memberId: "user-a", roleIds: ["member"], channelId: "lobby", permission: "MANAGE_SERVER", roles, rules })).toBe(false));
});
