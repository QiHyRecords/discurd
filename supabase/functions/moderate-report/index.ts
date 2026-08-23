import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit, HttpError } from "../_shared/rateLimit.ts";

type ModerationOutcome = "warn" | "mute" | "delete_message" | "dismiss";

function responseError(error: unknown, fallback: string) {
  return Response.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: error instanceof HttpError ? error.status : 400 },
  );
}

Deno.serve(async (request) => {
  const auth = request.headers.get("Authorization");
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: userData } = await client.auth.getUser();
  if (!userData.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = (await request.json()) as {
    reportId?: string;
    outcome?: ModerationOutcome;
    muteMinutes?: number;
  };
  if (
    !input.reportId ||
    !["warn", "mute", "delete_message", "dismiss"].includes(input.outcome ?? "")
  )
    return Response.json(
      { error: "Invalid moderation request" },
      { status: 400 },
    );
  try {
    await enforceRateLimit(client, "moderate-report", {
      limit: 20,
      windowSeconds: 60,
    });
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: report, error: reportError } = await service
      .from("reports")
      .select("id, server_id, message_id, reported_user_id, status")
      .eq("id", input.reportId)
      .single();
    if (reportError || !report) throw new HttpError("Report not found", 404);
    if (!report.server_id)
      throw new HttpError("This report is not associated with a server", 400);
    if (report.status === "resolved" || report.status === "dismissed")
      throw new HttpError("Report has already been reviewed", 409);

    const { data: permitted, error: permissionError } = await client.rpc(
      "has_server_permission",
      {
        target_server: report.server_id,
        requested_permission: "MODERATE_MEMBERS",
      },
    );
    if (permissionError)
      throw new HttpError("Unable to verify moderator permission", 500);
    if (!permitted)
      throw new HttpError("Moderator permission is required", 403);

    const outcome = input.outcome;
    const muteMinutes = input.muteMinutes ?? 60;
    if (
      outcome === "mute" &&
      (!Number.isInteger(muteMinutes) ||
        muteMinutes < 1 ||
        muteMinutes > 10_080)
    )
      throw new HttpError(
        "Mute duration must be between 1 minute and 7 days",
        400,
      );
    if ((outcome === "warn" || outcome === "mute") && !report.reported_user_id)
      throw new HttpError("The reported user is required for this action", 400);
    if (outcome === "delete_message" && !report.message_id)
      throw new HttpError(
        "The reported message is required for this action",
        400,
      );

    const muteUntil =
      outcome === "mute"
        ? new Date(Date.now() + muteMinutes * 60_000).toISOString()
        : null;
    if (outcome === "mute") {
      const { data: mutedMember, error } = await service
        .from("server_members")
        .update({ timeout_until: muteUntil })
        .eq("server_id", report.server_id)
        .eq("user_id", report.reported_user_id!)
        .select("user_id")
        .maybeSingle();
      if (error) throw error;
      if (!mutedMember)
        throw new HttpError(
          "Reported user is not a member of this server",
          400,
        );
    }
    if (outcome === "delete_message") {
      const { data: message, error: messageError } = await service
        .from("messages")
        .select("id, channel_id, conversation_id")
        .eq("id", report.message_id!)
        .single();
      if (messageError || !message?.channel_id || message.conversation_id)
        throw new HttpError(
          "Reported message is not a server-channel message",
          400,
        );
      const { data: channel, error: channelError } = await service
        .from("channels")
        .select("server_id")
        .eq("id", message.channel_id)
        .single();
      if (channelError || channel?.server_id !== report.server_id)
        throw new HttpError(
          "Reported message does not belong to this server",
          400,
        );
      const { error } = await service
        .from("messages")
        .update({
          body: "Message removed by a moderator.",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", report.message_id!);
      if (error) throw error;
    }
    if (outcome === "warn") {
      const { error } = await service.from("notifications").insert({
        user_id: report.reported_user_id!,
        kind: "system",
        title: "Moderator warning",
        body: "A moderator issued a warning in one of your spaces.",
        target_path: "/notifications",
      });
      if (error) throw error;
    }

    const reportStatus = outcome === "dismiss" ? "dismissed" : "resolved";
    const { error: updateReportError } = await service
      .from("reports")
      .update({
        status: reportStatus,
        reviewed_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    if (updateReportError) throw updateReportError;
    const targetType =
      outcome === "delete_message"
        ? "message"
        : outcome === "dismiss"
          ? "report"
          : "member";
    const targetId =
      outcome === "delete_message"
        ? report.message_id
        : outcome === "dismiss"
          ? report.id
          : report.reported_user_id;
    const { error: actionError } = await service
      .from("moderation_actions")
      .insert({
        report_id: report.id,
        server_id: report.server_id,
        actor_id: userData.user.id,
        target_user_id: report.reported_user_id,
        message_id: report.message_id,
        action: outcome,
        mute_until: muteUntil,
        metadata: { mute_minutes: outcome === "mute" ? muteMinutes : null },
      });
    if (actionError) throw actionError;
    const { error: auditError } = await service.from("audit_logs").insert({
      server_id: report.server_id,
      actor_id: userData.user.id,
      action: `moderation.${outcome}`,
      target_type: targetType,
      target_id: targetId,
      metadata: { report_id: report.id, mute_until: muteUntil },
    });
    if (auditError) throw auditError;
    return Response.json({
      data: { reportId: report.id, outcome, status: reportStatus, muteUntil },
    });
  } catch (error) {
    return responseError(error, "Moderation action failed");
  }
});
