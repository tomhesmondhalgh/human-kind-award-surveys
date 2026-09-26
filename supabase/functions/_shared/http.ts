// Shared request/response helpers: CORS pinned to the app's own origins, JSON
// responses, and an error type that carries an HTTP status.

const ALLOWED_ORIGINS = [
  'https://surveys.humankindaward.com',
  'http://localhost:8080',
  ...(Deno.env.get('ADDITIONAL_ALLOWED_ORIGINS')?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
];

// Vercel preview deployments of this project.
const PREVIEW_ORIGIN = /^https:\/\/human-kind-surveys[a-z0-9-]*\.vercel\.app$/;

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = isAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

// Wraps a handler with CORS preflight handling and consistent error responses.
// Unexpected errors are logged but not echoed back to the caller.
export function serveJson(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(req) });
    }
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof HttpError) {
        return json(req, { success: false, error: error.message }, error.status);
      }
      console.error('Unhandled error:', error);
      return json(req, { success: false, error: 'Internal error' }, 500);
    }
  });
}

export function siteUrl(): string {
  return (Deno.env.get('SITE_URL') || 'https://surveys.humankindaward.com').replace(/\/+$/, '');
}
