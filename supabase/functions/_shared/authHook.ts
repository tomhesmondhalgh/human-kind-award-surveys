import { Webhook } from "npm:standardwebhooks@1.0.0";

// Supabase Auth signs Send Email hook requests (Standard Webhooks). Without this
// check, anyone could make these functions send real-looking confirmation and
// password-reset emails to any address.
//
// SEND_EMAIL_HOOK_SECRET is the secret shown in Authentication > Hooks, in the
// form "v1,whsec_...". If it isn't set, every request is rejected.
export async function verifyAuthHook<T>(req: Request): Promise<T | null> {
  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!secret) {
    console.error("SEND_EMAIL_HOOK_SECRET is not set; rejecting auth hook request");
    return null;
  }
  const body = await req.text();
  try {
    const webhook = new Webhook(secret.replace(/^v1,whsec_/, ""));
    return webhook.verify(body, Object.fromEntries(req.headers)) as T;
  } catch (error) {
    console.error("Auth hook signature verification failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
