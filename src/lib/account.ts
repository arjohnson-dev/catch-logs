import { supabase } from "@/lib/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function getDeleteAccountFunctionUrl() {
  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split(".")[0];
  if (!projectRef) {
    throw new Error("Unable to resolve Supabase project ref");
  }

  return `https://${projectRef}.functions.supabase.co/delete-account`;
}

export async function deleteCurrentAccount() {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("No active session");
  }

  const response = await fetch(getDeleteAccountFunctionUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let message = bodyText;
    try {
      const bodyJson = JSON.parse(bodyText) as { error?: string };
      if (bodyJson?.error) {
        message = bodyJson.error;
      }
    } catch {
      // Keep raw bodyText when it's not JSON.
    }
    throw new Error(message || `Account deletion failed (${response.status})`);
  }
}
