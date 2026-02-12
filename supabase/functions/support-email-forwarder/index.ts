const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const ipBuckets = new Map<string, RateBucket>();
const emailBuckets = new Map<string, RateBucket>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 3;

function takeToken(store: Map<string, RateBucket>, key: string, limit: number): boolean {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

function getClientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    website?: string;
  } = {};

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  try {
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      payload = {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        subject: String(form.get("subject") ?? ""),
        message: String(form.get("message") ?? ""),
        website: String(form.get("website") ?? ""),
      };
    } else {
      return jsonResponse(400, { error: "Unsupported content type" });
    }
  } catch {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const subject = (payload.subject ?? "").trim();
  const message = (payload.message ?? "").trim();
  const website = (payload.website ?? "").trim();

  if (!name || !email || !subject || !message) {
    return jsonResponse(400, {
      error: "Missing required fields: name, email, subject, message",
    });
  }

  if (website) {
    return jsonResponse(400, { error: "Request blocked" });
  }

  if (name.length > 120 || subject.length > 180 || message.length > 4000) {
    return jsonResponse(400, { error: "Input is too long" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse(400, { error: "Invalid email address" });
  }

  const ip = getClientIp(req);
  if (!takeToken(ipBuckets, ip, MAX_PER_IP) || !takeToken(emailBuckets, email.toLowerCase(), MAX_PER_EMAIL)) {
    return jsonResponse(429, { error: "Too many requests. Please try again later." });
  }

  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number.parseInt(Deno.env.get("SMTP_PORT") ?? "587", 10);
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const supportToEmail = Deno.env.get("SUPPORT_TO_EMAIL") ?? "arjohnson.dev@gmail.com";
  const supportFromEmail = Deno.env.get("SUPPORT_FROM_EMAIL") ?? "noreply.catchlogs@gmail.com";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return jsonResponse(500, { error: "SMTP secrets are not configured" });
  }

  const secure = smtpPort === 465;
  let transporter: {
    sendMail: (input: {
      from: string;
      to: string;
      replyTo: string;
      subject: string;
      text: string;
    }) => Promise<unknown>;
  };

  try {
    const nodemailerModule = await import("npm:nodemailer@6.9.13");
    const nodemailer = nodemailerModule.default;
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize SMTP transport";
    return jsonResponse(500, { error: message });
  }

  const textBody = [
    "CatchLogs support request",
    "",
    `From: ${name}`,
    `Return Email: ${email}`,
    "",
    "Message:",
    message,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: supportFromEmail,
      to: supportToEmail,
      replyTo: email,
      subject: `[CatchLogs Support] ${subject}`,
      text: textBody,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return jsonResponse(500, { error: message });
  }

  return jsonResponse(200, { ok: true });
});
