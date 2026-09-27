// supabase.functions.invoke() reports any non-2xx reply as a FunctionsHttpError
// whose message is always the generic "Edge Function returned a non-2xx status
// code". The function's own JSON reply ({ error: '...' }) is on error.context,
// which is the fetch Response.

export interface FunctionErrorBody {
  error?: string;
  [key: string]: unknown;
}

export async function readFunctionErrorBody(error: unknown): Promise<FunctionErrorBody | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== 'object') return null;
  const response = context as Response;
  if (typeof response.json !== 'function' || response.bodyUsed) return null;
  try {
    const body = await response.clone().json();
    return body && typeof body === 'object' ? (body as FunctionErrorBody) : null;
  } catch {
    return null;
  }
}

// The most specific message available: the function's `error` field, then the
// error's own message.
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const body = await readFunctionErrorBody(error);
  if (typeof body?.error === 'string' && body.error) return body.error;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? message : fallback;
}
