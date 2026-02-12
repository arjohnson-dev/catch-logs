const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function getSupportFunctionUrl() {
  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) {
    throw new Error("Unable to resolve Supabase project ref");
  }

  return `https://${projectRef}.functions.supabase.co/support-email-forwarder`;
}

export async function sendSupportEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
}) {
  const payload = new URLSearchParams({
    name: input.name.trim(),
    email: input.email.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    website: (input.website ?? "").trim(),
  });

  const response = await fetch(getSupportFunctionUrl(), {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Support request failed (${response.status})`);
  }
}
