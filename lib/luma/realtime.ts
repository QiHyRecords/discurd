export type RealtimeEvent =
  | { type: "message.created"; targetId: string; messageId: string }
  | { type: "message.updated"; targetId: string; messageId: string }
  | { type: "message.deleted"; targetId: string; messageId: string }
  | { type: "presence.changed"; userId: string }
  | { type: "typing.changed"; targetId: string; userId: string; active: boolean };

export type RealtimeSubscription = { unsubscribe: () => Promise<void> | void };
export type RealtimeTransport = { subscribe: (topic: string, handler: (event: RealtimeEvent) => void) => RealtimeSubscription };

/**
 * Keeps a mobile session scoped to the visible conversation. The production
 * Supabase implementation should create at most one target subscription at a
 * time, unsubscribe when the app backgrounds, then refetch missed events on
 * foreground before resubscribing.
 */
export function subscribeToTarget(transport: RealtimeTransport, targetId: string, onEvent: (event: RealtimeEvent) => void): RealtimeSubscription {
  return transport.subscribe(`conversation:${targetId}`, (event) => {
    if (event.type === "presence.changed" || event.targetId === targetId) onEvent(event);
  });
}
