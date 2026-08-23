export type Presence = "online" | "idle" | "dnd" | "offline";
export type AppearanceMode = "system" | "light" | "dark";
export type MessageStatus = "sent" | "pending" | "failed";

export type Member = {
  id: string;
  name: string;
  username: string;
  initials: string;
  accent: string;
  presence: Presence;
  bio?: string;
  isDeveloper?: boolean;
  isVerified?: boolean;
};

export type ProfileBadge = "owner" | "admin" | "developer" | "verified";

export type SpaceMembership = {
  spaceId: string;
  memberId: string;
  isOwner?: boolean;
  roleIds: string[];
};

export type Conversation = {
  id: string;
  kind: "dm" | "group";
  title: string;
  memberIds: string[];
  preview: string;
  updatedAt: string;
  unread: number;
  pinned?: boolean;
};

export type Message = {
  id: string;
  targetId: string;
  channelId?: string;
  conversationId?: string;
  authorId: string;
  body: string;
  createdAt: string;
  createdAtIso?: string;
  status: MessageStatus;
  parentId?: string;
  pinnedAt?: string;
  deletedAt?: string;
  editedAt?: string;
  reactions?: { emoji: string; userIds: string[] }[];
};

export type Channel = {
  id: string;
  serverId?: string;
  name: string;
  type: "text" | "voice";
  unread: number;
  description?: string;
};

export type ChannelGroup = {
  id: string;
  title: string;
  channels: Channel[];
};

export type Space = {
  id: string;
  name: string;
  initials: string;
  accent: string;
  description: string;
  memberCount: number;
  unread: number;
  groups: ChannelGroup[];
};

export type UserSettings = {
  appearance: AppearanceMode;
  notifications: boolean;
  reduceMotion: boolean;
  compactMode: boolean;
  onboardingComplete: boolean;
};

export type PersistedCommunityState = {
  conversations: Conversation[];
  messages: Message[];
  settings: UserSettings;
  reports: ReportItem[];
};

export type ReportItem = {
  id: string;
  messageId?: string;
  reporterId: string;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
  serverId?: string;
};

export type Permission =
  | "VIEW_CHANNEL"
  | "SEND_MESSAGES"
  | "EDIT_MESSAGES"
  | "DELETE_MESSAGES"
  | "ATTACH_FILES"
  | "ADD_REACTIONS"
  | "CREATE_THREADS"
  | "MANAGE_CHANNELS"
  | "MANAGE_SERVER"
  | "MANAGE_ROLES"
  | "CONNECT"
  | "SPEAK";

export type Role = {
  id: string;
  name: string;
  priority: number;
  permissions: Permission[];
};

export type PermissionRule = {
  roleId?: string;
  memberId?: string;
  channelId?: string;
  allow: Permission[];
  deny: Permission[];
};
