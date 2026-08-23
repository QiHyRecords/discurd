import { useColorScheme } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as DocumentPicker from "expo-document-picker";
import { supabase, type SupabaseProfile } from "./supabase";
import { getNativePushRegistration } from "./notifications";
import type { AppearanceMode, Channel, Conversation, Member, Message, ProfileBadge, ReportItem, Space, UserSettings } from "./types";

export type Palette = { background: string; surface: string; elevated: string; text: string; secondary: string; tertiary: string; border: string; primary: string; primarySoft: string; success: string; danger: string; tab: string; overlay: string };

const lightPalette: Palette = { background: "#F5F6FB", surface: "#FFFFFF", elevated: "#FFFFFF", text: "#15172D", secondary: "#666B84", tertiary: "#9499AE", border: "#E3E5F0", primary: "#5167E8", primarySoft: "#E9EDFF", success: "#218A73", danger: "#C7465B", tab: "#FBFBFE", overlay: "rgba(17,19,38,0.42)" };
const darkPalette: Palette = { background: "#0F1020", surface: "#1A1B31", elevated: "#22243D", text: "#F3F4FF", secondary: "#B5B8CE", tertiary: "#8589A5", border: "#2C2F4A", primary: "#91A8FF", primarySoft: "#242C58", success: "#50C7A8", danger: "#FF8E9C", tab: "#151629", overlay: "rgba(0,0,0,0.56)" };
const accents = ["#596EEB", "#D47064", "#278A77", "#B15FBB", "#C08A35", "#3A94B6"];
const anonymousMember: Member = { id: "", name: "Guest", username: "guest", initials: "G", accent: "#596EEB", presence: "offline", bio: "" };
const displayTime = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const initials = (value: string) => value.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const accentFor = (id: string) => accents[Math.abs([...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % accents.length];

function toMember(profile: SupabaseProfile, presence = "offline"): Member {
  return { id: profile.id, name: profile.display_name, username: profile.username, initials: initials(profile.display_name), accent: accentFor(profile.id), presence: presence === "online" || presence === "idle" || presence === "dnd" ? presence : "offline", bio: profile.bio, isDeveloper: Boolean(profile.is_developer), isVerified: Boolean(profile.is_verified) };
}

type LumaContextValue = {
  ready: boolean;
  loading: boolean;
  session: Session | null;
  currentUser: Member;
  members: Member[];
  conversations: Conversation[];
  spaces: Space[];
  messages: Message[];
  reports: ReportItem[];
  relationships: { requesterId: string; addresseeId: string; state: "pending" | "accepted" | "declined" }[];
  blockedIds: string[];
  settings: UserSettings;
  notifications: { id: string; title: string; body: string; kind: string; targetPath?: string; createdAt: string; readAt?: string }[];
  typingByTarget: Record<string, string[]>;
  error: string | null;
  refresh: () => Promise<void>;
  signUp: (input: { email: string; password: string; displayName: string; acceptedPolicies: boolean; ageConfirmed: boolean }) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendMessage: (targetId: string, body: string, parentId?: string) => Promise<void>;
  createGroupConversation: (title: string, memberIds: string[]) => Promise<string>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, body: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  submitReport: (messageId: string, reason: string) => Promise<void>;
  resolveReport: (reportId: string, outcome: "resolved" | "dismissed") => Promise<void>;
  updateSettings: (next: Partial<UserSettings>) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  getProfileBadges: (userId: string, serverId?: string) => Promise<ProfileBadge[]>;
  sendFriendRequest: (userId: string) => Promise<void>;
  respondFriendRequest: (requesterId: string, accept: boolean) => Promise<void>;
  setBlocked: (userId: string, blocked: boolean) => Promise<void>;
  registerPushDevice: () => Promise<void>;
  setTyping: (targetId: string) => Promise<void>;
  attachFile: (targetId: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetDemo: () => Promise<void>;
};

const LumaContext = createContext<LumaContextValue | null>(null);
const emptySettings: UserSettings = { appearance: "system", notifications: true, reduceMotion: false, compactMode: false, onboardingComplete: false };

export function LumaProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<Member>(anonymousMember);
  const [members, setMembers] = useState<Member[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [relationships, setRelationships] = useState<LumaContextValue["relationships"]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<LumaContextValue["notifications"]>([]);
  const [typingByTarget, setTypingByTarget] = useState<Record<string, string[]>>({});
  const [settings, setSettings] = useState<UserSettings>(emptySettings);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setCurrentUser(anonymousMember); setMembers([]); setConversations([]); setSpaces([]); setMessages([]); setReports([]); setRelationships([]); setBlockedIds([]); setNotifications([]); setTypingByTarget({}); setSettings(emptySettings);
      return;
    }
    setLoading(true); setError(null);
    try {
      const [{ data: profile, error: profileError }, { data: settingsRow }, { data: memberships }, { data: conversationMemberships }, { data: accessibleChannels }, { data: categoryRows }, { data: messageRows }, { data: reactionRows }, { data: notificationRows }, { data: reportRows }, { data: relationshipRows }, { data: blockRows }, { data: typingRows }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, bio, avatar_path, status_text, is_developer, is_verified").eq("id", userId).single(),
        supabase.from("user_settings").select("appearance, reduce_motion, compact_mode, dm_notification_level").eq("user_id", userId).maybeSingle(),
        supabase.from("server_members").select("server_id, servers(id, name, description, icon_path)").eq("user_id", userId),
        supabase.from("conversation_members").select("conversation_id, user_id, conversations(id, kind, title, created_at)"),
        supabase.from("channels").select("id, server_id, category_id, name, kind, description, position").order("position"),
        supabase.from("categories").select("id, server_id, name, position").order("position"),
        supabase.from("messages").select("id, channel_id, conversation_id, author_id, parent_message_id, body, edited_at, deleted_at, created_at").order("created_at", { ascending: true }).limit(300),
        supabase.from("message_reactions").select("message_id, user_id, emoji"),
        supabase.from("notifications").select("id, title, body, kind, target_path, created_at, read_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("reports").select("id, message_id, reporter_id, reason, status, created_at, server_id").order("created_at", { ascending: false }),
        supabase.from("friendships").select("requester_id, addressee_id, state"),
        supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
        supabase.from("typing_indicators").select("conversation_id, channel_id, user_id").gt("expires_at", new Date().toISOString()),
      ]);
      if (profileError || !profile) throw new Error(profileError?.message ?? "Your Discurd profile is unavailable.");
      const conversationRows = (conversationMemberships ?? []) as any[];
      const channelRows = (accessibleChannels ?? []) as any[];
      const categoryList = (categoryRows ?? []) as any[];
      const rawMessages = (messageRows ?? []) as any[];
      const allMemberRows = [...conversationRows, ...((memberships ?? []) as any[])];
      const serverMemberResult = await supabase.from("server_members").select("server_id, user_id");
      const participantIds = [...new Set([userId, ...conversationRows.map((row) => row.user_id), ...(serverMemberResult.data ?? []).map((row: any) => row.user_id), ...rawMessages.map((row) => row.author_id)])];
      const [{ data: profiles }, { data: presenceRows }] = await Promise.all([
        participantIds.length ? supabase.from("profiles").select("id, username, display_name, bio, avatar_path, status_text, is_developer, is_verified").in("id", participantIds) : Promise.resolve({ data: [] as any[] }),
        participantIds.length ? supabase.from("presence").select("user_id, state").in("user_id", participantIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const presenceByUser = new Map((presenceRows ?? []).map((row: any) => [row.user_id, row.state]));
      const memberList = (profiles ?? []).map((item: any) => toMember(item, presenceByUser.get(item.id)));
      const memberById = new Map(memberList.map((member) => [member.id, member]));
      const conversationById = new Map<string, any>();
      conversationRows.forEach((row) => { if (row.conversations) conversationById.set(row.conversation_id, row.conversations); });
      const reactionsByMessage = new Map<string, { emoji: string; userIds: string[] }[]>();
      ((reactionRows ?? []) as any[]).forEach((reaction) => {
        const existing = reactionsByMessage.get(reaction.message_id) ?? [];
        const matching = existing.find((item) => item.emoji === reaction.emoji);
        if (matching) matching.userIds.push(reaction.user_id); else existing.push({ emoji: reaction.emoji, userIds: [reaction.user_id] });
        reactionsByMessage.set(reaction.message_id, existing);
      });
      const liveMessages: Message[] = rawMessages.map((row) => ({ id: row.id, targetId: row.channel_id ?? row.conversation_id, channelId: row.channel_id ?? undefined, conversationId: row.conversation_id ?? undefined, authorId: row.author_id, body: row.body, createdAt: displayTime(row.created_at), createdAtIso: row.created_at, status: "sent", parentId: row.parent_message_id ?? undefined, deletedAt: row.deleted_at ?? undefined, editedAt: row.edited_at ?? undefined, reactions: reactionsByMessage.get(row.id) ?? [] }));
      const conversations: Conversation[] = [...conversationById.entries()].map(([id, raw]) => {
        const ids = conversationRows.filter((row) => row.conversation_id === id).map((row) => row.user_id);
        const other = memberById.get(ids.find((id) => id !== userId) ?? "");
        const lastMessage = [...liveMessages].filter((message) => message.conversationId === id).at(-1);
        return { id, kind: (raw.kind === "direct" ? "dm" : "group") as Conversation["kind"], title: raw.title || (other?.name ?? "Direct message"), memberIds: ids, preview: lastMessage?.body ?? "No messages yet", updatedAt: lastMessage?.createdAt ?? displayTime(raw.created_at), unread: 0 };
      }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const memberCountByServer = new Map<string, number>();
      (serverMemberResult.data ?? []).forEach((row: any) => memberCountByServer.set(row.server_id, (memberCountByServer.get(row.server_id) ?? 0) + 1));
      const liveSpaces: Space[] = ((memberships ?? []) as any[]).map((membership) => membership.servers).filter(Boolean).map((server: any) => {
        const groups = categoryList.filter((category) => category.server_id === server.id).map((category) => ({ id: category.id, title: category.name, channels: channelRows.filter((channel) => channel.category_id === category.id).map((channel): Channel => ({ id: channel.id, serverId: channel.server_id, name: channel.name, type: channel.kind, unread: 0, description: channel.description })) }));
        const uncategorized = channelRows.filter((channel) => channel.server_id === server.id && !channel.category_id);
        if (uncategorized.length) groups.push({ id: `${server.id}-uncategorized`, title: "Channels", channels: uncategorized.map((channel): Channel => ({ id: channel.id, serverId: channel.server_id, name: channel.name, type: channel.kind, unread: 0, description: channel.description })) });
        return { id: server.id, name: server.name, initials: initials(server.name), accent: accentFor(server.id), description: server.description, memberCount: memberCountByServer.get(server.id) ?? 0, unread: 0, groups };
      });
      const liveTyping: Record<string, string[]> = {};
      ((typingRows ?? []) as any[]).forEach((row) => { const targetId = row.channel_id ?? row.conversation_id; if (targetId && row.user_id !== userId) liveTyping[targetId] = [...(liveTyping[targetId] ?? []), row.user_id]; });
      setCurrentUser(toMember(profile)); setMembers(memberList); setConversations(conversations); setSpaces(liveSpaces); setMessages(liveMessages); setReports(((reportRows ?? []) as any[]).map((row) => ({ id: row.id, messageId: row.message_id ?? undefined, reporterId: row.reporter_id, reason: row.reason, status: row.status, createdAt: displayTime(row.created_at), serverId: row.server_id ?? undefined }))); setRelationships(((relationshipRows ?? []) as any[]).map((row) => ({ requesterId: row.requester_id, addresseeId: row.addressee_id, state: row.state }))); setBlockedIds(((blockRows ?? []) as any[]).map((row) => row.blocked_id)); setNotifications(((notificationRows ?? []) as any[]).map((row) => ({ id: row.id, title: row.title, body: row.body, kind: row.kind, targetPath: row.target_path ?? undefined, createdAt: displayTime(row.created_at), readAt: row.read_at ?? undefined }))); setTypingByTarget(liveTyping); setSettings({ appearance: settingsRow?.appearance ?? "system", reduceMotion: Boolean(settingsRow?.reduce_motion), compactMode: Boolean(settingsRow?.compact_mode), notifications: settingsRow?.dm_notification_level !== "none", onboardingComplete: true });
      void allMemberRows;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load your community."); }
    finally { setLoading(false); }
  }, [session?.user.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);
  useEffect(() => {
    if (!session?.user.id) return;
    const channel = supabase.channel(`lumalink-live-${session.user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refresh()).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, () => void refresh()).on("postgres_changes", { event: "*", schema: "public", table: "typing_indicators" }, () => void refresh()).on("postgres_changes", { event: "*", schema: "public", table: "presence" }, () => void refresh()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh, session?.user.id]);
  useEffect(() => {
    if (!session?.user.id) return;
    const publish = () => void supabase.from("presence").update({ state: "online", updated_at: new Date().toISOString() }).eq("user_id", session.user.id);
    publish();
    const interval = setInterval(publish, 60_000);
    return () => { clearInterval(interval); void supabase.from("presence").update({ state: "offline", updated_at: new Date().toISOString() }).eq("user_id", session.user.id); };
  }, [session?.user.id]);

  const signUp = useCallback(async ({ email, password, displayName, acceptedPolicies, ageConfirmed }: Parameters<LumaContextValue["signUp"]>[0]) => {
    if (!acceptedPolicies || !ageConfirmed) throw new Error("Accept the policies and confirm the age requirement to create an account.");
    const username = displayName.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || `member_${Date.now().toString(36)}`;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.trim(), username } } });
    if (error) throw error;
    if (data.session) {
      const { error: consentError } = await supabase.from("account_consents").upsert({ user_id: data.user!.id, terms_version: "1.0", privacy_version: "1.0", community_policy_version: "1.0", age_confirmed_at: new Date().toISOString() });
      if (consentError) throw consentError;
    }
    return { needsEmailConfirmation: !data.session };
  }, []);
  const signIn = useCallback(async (email: string, password: string) => { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }, []);
  const signOut = useCallback(async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; }, []);
  const resetPassword = useCallback(async (email: string) => { const { error } = await supabase.auth.resetPasswordForEmail(email); if (error) throw error; }, []);
  const sendMessage = useCallback(async (targetId: string, body: string, parentId?: string) => {
    const trimmed = body.trim(); if (!trimmed) return;
    const channel = spaces.flatMap((space) => space.groups.flatMap((group) => group.channels)).find((item) => item.id === targetId);
    const { error } = await supabase.from("messages").insert({ author_id: session?.user.id, body: trimmed, parent_message_id: parentId ?? null, channel_id: channel ? targetId : null, conversation_id: channel ? null : targetId });
    if (error) throw error; await refresh();
  }, [refresh, session?.user.id, spaces]);
  const createGroupConversation = useCallback(async (title: string, memberIds: string[]) => { const { data, error } = await supabase.functions.invoke("create-conversation", { body: { title, memberIds } }); if (error) throw error; await refresh(); return data.id as string; }, [refresh]);
  const addReaction = useCallback(async (messageId: string, emoji: string) => { if (!session?.user.id) return; const already = messages.find((message) => message.id === messageId)?.reactions?.find((reaction) => reaction.emoji === emoji)?.userIds.includes(session.user.id); const request = already ? supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", session.user.id).eq("emoji", emoji) : supabase.from("message_reactions").insert({ message_id: messageId, user_id: session.user.id, emoji }); const { error } = await request; if (error) throw error; await refresh(); }, [messages, refresh, session?.user.id]);
  const editMessage = useCallback(async (messageId: string, body: string) => { const { error } = await supabase.from("messages").update({ body: body.trim(), edited_at: new Date().toISOString() }).eq("id", messageId); if (error) throw error; await refresh(); }, [refresh]);
  const deleteMessage = useCallback(async (messageId: string) => { const { error } = await supabase.from("messages").update({ body: "", deleted_at: new Date().toISOString() }).eq("id", messageId); if (error) throw error; await refresh(); }, [refresh]);
  const togglePin = useCallback(async (messageId: string) => {
    const message = messages.find((item) => item.id === messageId);
    const channel = spaces.flatMap((space) => space.groups.flatMap((group) => group.channels)).find((item) => item.id === message?.channelId);
    if (!channel?.serverId) throw new Error("Pinned messages are managed by moderators inside server channels.");
    const { error } = await supabase.functions.invoke("manage-community", { body: { action: "toggle_pin", serverId: channel.serverId, messageId } });
    if (error) throw error;
    await refresh();
  }, [messages, refresh, spaces]);
  const submitReport = useCallback(async (messageId: string, reason: string) => { const message = messages.find((item) => item.id === messageId); const channel = spaces.flatMap((space) => space.groups.flatMap((group) => group.channels)).find((item) => item.id === message?.channelId); const { error } = await supabase.from("reports").insert({ reporter_id: session?.user.id, message_id: messageId, reported_user_id: message?.authorId ?? null, server_id: channel?.serverId ?? null, reason }); if (error) throw error; await refresh(); }, [messages, refresh, session?.user.id, spaces]);
  const resolveReport = useCallback(async (reportId: string, outcome: "resolved" | "dismissed") => { const { error } = await supabase.functions.invoke("moderate-report", { body: { reportId, outcome: outcome === "dismissed" ? "dismiss" : "warn" } }); if (error) throw error; await refresh(); }, [refresh]);
  const updateSettings = useCallback(async (next: Partial<UserSettings>) => { if (!session?.user.id) return; const { error } = await supabase.from("user_settings").upsert({ user_id: session.user.id, appearance: next.appearance ?? settings.appearance, reduce_motion: next.reduceMotion ?? settings.reduceMotion, compact_mode: next.compactMode ?? settings.compactMode, dm_notification_level: (next.notifications ?? settings.notifications) ? "all" : "none" }); if (error) throw error; await refresh(); }, [refresh, session?.user.id, settings]);
  const markConversationRead = useCallback(async (conversationId: string) => { if (!session?.user.id) return; const last = messages.filter((message) => message.conversationId === conversationId).at(-1); const { error } = await supabase.from("read_states").upsert({ user_id: session.user.id, conversation_id: conversationId, last_read_message_id: last?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "user_id,conversation_id" }); if (error) throw error; }, [messages, session?.user.id]);
  const getProfileBadges = useCallback(async (userId: string, serverId?: string) => { const { data, error } = await supabase.rpc("get_profile_badges", { target_user: userId, target_server: serverId ?? null }); if (error) throw error; return ((data ?? []) as { badge: ProfileBadge }[]).map((item) => item.badge); }, []);
  const sendFriendRequest = useCallback(async (userId: string) => { if (!session?.user.id || userId === session.user.id) return; const { error } = await supabase.from("friendships").insert({ requester_id: session.user.id, addressee_id: userId }); if (error) throw error; await refresh(); }, [refresh, session?.user.id]);
  const respondFriendRequest = useCallback(async (requesterId: string, accept: boolean) => { if (!session?.user.id) return; const { error } = await supabase.from("friendships").update({ state: accept ? "accepted" : "declined", responded_at: new Date().toISOString() }).eq("requester_id", requesterId).eq("addressee_id", session.user.id); if (error) throw error; await refresh(); }, [refresh, session?.user.id]);
  const setBlocked = useCallback(async (userId: string, blocked: boolean) => { if (!session?.user.id) return; const response = blocked ? await supabase.from("blocks").upsert({ blocker_id: session.user.id, blocked_id: userId }) : await supabase.from("blocks").delete().eq("blocker_id", session.user.id).eq("blocked_id", userId); if (response.error) throw response.error; await refresh(); }, [refresh, session?.user.id]);
  const registerPushDevice = useCallback(async () => { const registration = await getNativePushRegistration(); const { error } = await supabase.functions.invoke("register-device-token", { body: registration }); if (error) throw error; }, []);
  const setTyping = useCallback(async (targetId: string) => { if (!session?.user.id) return; const channel = spaces.flatMap((space) => space.groups.flatMap((group) => group.channels)).find((item) => item.id === targetId); const payload = { user_id: session.user.id, channel_id: channel ? targetId : null, conversation_id: channel ? null : targetId, expires_at: new Date(Date.now() + 12_000).toISOString(), updated_at: new Date().toISOString() }; const { error } = await supabase.from("typing_indicators").upsert(payload, { onConflict: "conversation_id,channel_id,user_id" }); if (error) throw error; }, [session?.user.id, spaces]);
  const attachFile = useCallback(async (targetId: string) => {
    if (!session?.user.id) throw new Error("Sign in before attaching a file.");
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: "*/*" });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset.size || asset.size > 26214400) throw new Error("Choose a file no larger than 25 MB.");
    const channel = spaces.flatMap((space) => space.groups.flatMap((group) => group.channels)).find((item) => item.id === targetId);
    const { data: message, error: messageError } = await supabase.from("messages").insert({ author_id: session.user.id, body: `📎 ${asset.name}`, channel_id: channel ? targetId : null, conversation_id: channel ? null : targetId }).select("id").single();
    if (messageError || !message) throw messageError ?? new Error("Attachment message could not be created.");
    const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${session.user.id}/${message.id}/${Date.now()}-${safeName}`;
    try {
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage.from("attachments").upload(storagePath, bytes, { contentType: asset.mimeType ?? "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      const { error: linkError } = await supabase.functions.invoke("attach-message", { body: { messageId: message.id, storagePath, fileName: asset.name, contentType: asset.mimeType ?? "application/octet-stream", byteSize: asset.size } });
      if (linkError) throw linkError;
    } catch (error) { await supabase.storage.from("attachments").remove([storagePath]); await supabase.from("messages").delete().eq("id", message.id); throw error; }
    await refresh();
  }, [refresh, session?.user.id, spaces]);
  const completeOnboarding = useCallback(async () => { await updateSettings({}); }, [updateSettings]);
  const resetDemo = useCallback(async () => { await refresh(); }, [refresh]);
  const value = useMemo(() => ({ ready, loading, session, currentUser, members, conversations, spaces, messages, reports, relationships, blockedIds, settings, notifications, typingByTarget, error, refresh, signUp, signIn, signOut, resetPassword, sendMessage, createGroupConversation, addReaction, editMessage, deleteMessage, togglePin, submitReport, resolveReport, updateSettings, markConversationRead, getProfileBadges, sendFriendRequest, respondFriendRequest, setBlocked, registerPushDevice, setTyping, attachFile, completeOnboarding, resetDemo }), [addReaction, attachFile, blockedIds, completeOnboarding, conversations, createGroupConversation, currentUser, deleteMessage, editMessage, error, getProfileBadges, loading, markConversationRead, members, messages, notifications, ready, refresh, registerPushDevice, relationships, reports, resetDemo, resetPassword, resolveReport, respondFriendRequest, sendFriendRequest, sendMessage, session, setBlocked, setTyping, settings, signIn, signOut, signUp, spaces, submitReport, togglePin, typingByTarget, updateSettings]);
  return <LumaContext.Provider value={value}>{children}</LumaContext.Provider>;
}

export function useLuma() { const value = useContext(LumaContext); if (!value) throw new Error("useLuma must be used within LumaProvider"); return value; }
export function usePalette(): Palette { const systemScheme = useColorScheme(); const { settings } = useLuma(); const mode: AppearanceMode = settings.appearance === "system" ? (systemScheme === "dark" ? "dark" : "light") : settings.appearance; return mode === "dark" ? darkPalette : lightPalette; }
