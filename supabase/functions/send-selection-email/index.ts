import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamMemberRow {
  id: string;
  name: string;
  reg_no: string;
  email: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(
  batchCode: string,
  projectTitle: string,
  projectDomain: string | null,
  supervisorName: string | null,
  lockedAt: string | null,
  memberName: string,
  members: TeamMemberRow[],
): string {
  const memberList = members
    .map((m) => `<li>${escapeHtml(m.name)} (${escapeHtml(m.reg_no)})</li>`)
    .join("");
  const lockedLabel = lockedAt
    ? new Date(lockedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : "—";

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; color: #0f172a;">
      <p>Dear ${escapeHtml(memberName)},</p>
      <p>Your team <strong>${escapeHtml(batchCode)}</strong> has been allotted the following final year project:</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Project</td><td><strong>${escapeHtml(projectTitle)}</strong></td></tr>
        ${projectDomain ? `<tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Domain</td><td>${escapeHtml(projectDomain)}</td></tr>` : ""}
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Selected on</td><td>${escapeHtml(lockedLabel)}</td></tr>
        ${supervisorName ? `<tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Supervisor</td><td>${escapeHtml(supervisorName)}</td></tr>` : ""}
      </table>
      <p><strong>Team members</strong></p>
      <ul>${memberList}</ul>
      <p style="margin-top: 20px; padding: 12px; background: #f5f3ff; border-radius: 8px;">
        This selection is final. Contact your coordinator if any detail is incorrect.
      </p>
      <p style="text-align: center; color: #64748b; font-size: 13px; margin-top: 24px; line-height: 1.6;">
        <strong>Project Allotment Portal</strong><br/>
        Rajalakshmi Engineering College<br/>
        Team OG
      </p>
    </div>
  `.trim();
}

async function sendBrevoEmail(
  apiKey: string,
  senderEmail: string,
  senderName: string,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo ${response.status}: ${body}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Project Allotment Portal - REC";

    if (!brevoKey || !senderEmail) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const teamId = body?.team_id as string | undefined;

    if (!teamId) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      const user = userData?.user;

      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: membership } = await userClient
        .from("team_members")
        .select("team_id")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        const { data: adminProfile } = await userClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (adminProfile?.role !== "admin") {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: team, error: teamError } = await admin
      .from("teams")
      .select(`
        id,
        batch_code,
        supervisor_name,
        locked_at,
        selected_project_id,
        team_members ( id, name, reg_no, email )
      `)
      .eq("id", teamId)
      .single();

    if (teamError || !team?.selected_project_id) {
      return new Response(JSON.stringify({ error: "Team not found or no project selected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await admin
      .from("projects")
      .select("title, domain")
      .eq("id", team.selected_project_id)
      .single();

    const members = (team.team_members ?? []) as TeamMemberRow[];
    const subject = `Project Allotment Confirmation — Team ${team.batch_code}`;
    const results: { member_id: string; email: string; status: string; error?: string }[] = [];

    const { data: existingLogs } = await admin
      .from("selection_email_log")
      .select("member_id, status")
      .eq("team_id", teamId)
      .eq("status", "sent");

    const alreadySent = new Set((existingLogs ?? []).map((l) => l.member_id));

    for (const member of members) {
      if (alreadySent.has(member.id)) {
        results.push({ member_id: member.id, email: member.email ?? "", status: "skipped" });
        continue;
      }

      if (!member.email) {
        results.push({ member_id: member.id, email: "", status: "skipped", error: "No email on file" });
        await admin.from("selection_email_log").upsert(
          {
            team_id: teamId,
            member_id: member.id,
            email: "",
            status: "skipped",
            error_message: "No email on file",
          },
          { onConflict: "team_id,member_id" },
        );
        continue;
      }

      try {
        const html = buildHtml(
          team.batch_code,
          project?.title ?? "Project",
          project?.domain ?? null,
          team.supervisor_name,
          team.locked_at,
          member.name,
          members,
        );
        await sendBrevoEmail(brevoKey, senderEmail, senderName, member.email, member.name, subject, html);
        results.push({ member_id: member.id, email: member.email, status: "sent" });
        await admin.from("selection_email_log").upsert(
          {
            team_id: teamId,
            member_id: member.id,
            email: member.email,
            status: "sent",
            error_message: null,
          },
          { onConflict: "team_id,member_id" },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ member_id: member.id, email: member.email, status: "failed", error: message });
        await admin.from("selection_email_log").upsert(
          {
            team_id: teamId,
            member_id: member.id,
            email: member.email,
            status: "failed",
            error_message: message,
          },
          { onConflict: "team_id,member_id" },
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
