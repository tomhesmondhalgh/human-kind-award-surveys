import * as Sentry from '@sentry/react';

// Public ingest key: it only allows sending errors in, not reading them.
const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  'https://62ee5bd037bfbe41ca1be36d00363f97@o4512153111429120.ingest.de.sentry.io/4512153117196368';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Reset-password, invitation and login links carry secrets in the query string
// or fragment, and Supabase REST URLs carry filter values (sometimes emails),
// so every URL sent to Sentry is cut back to its path.
function stripUrl(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  return url.split(/[?#]/)[0];
}

function scrubText(text: string | undefined): string | undefined {
  return text?.replace(EMAIL, '[email]');
}

function environment(): string {
  const host = window.location.hostname;
  if (host === 'surveys.humankindaward.com') return 'production';
  if (host.endsWith('.vercel.app')) return 'preview';
  return 'development';
}

export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  delete event.user;
  if (event.request) {
    event.request.url = stripUrl(event.request.url) as string | undefined;
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.headers;
  }
  event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    exception.value = scrubText(exception.value);
  }
  return event;
}

export function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  // Console output can contain anything; production builds strip console
  // calls anyway.
  if (breadcrumb.category === 'console') return null;
  if (breadcrumb.data) {
    for (const key of ['url', 'from', 'to']) {
      if (key in breadcrumb.data) breadcrumb.data[key] = stripUrl(breadcrumb.data[key]);
    }
  }
  breadcrumb.message = scrubText(breadcrumb.message);
  return breadcrumb;
}

export function initSentry() {
  const env = environment();
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env,
    // Only report from deployed sites, not local development.
    enabled: env !== 'development',
    // Collect nothing beyond the error itself. The SDK's defaults include request
    // and response bodies, which here would mean survey answers, plus headers,
    // cookies, query strings, user details and local variables.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    // Errors only: no performance tracing or session replay (keeps us within
    // the free plan and avoids recording what users type).
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

export { Sentry };
