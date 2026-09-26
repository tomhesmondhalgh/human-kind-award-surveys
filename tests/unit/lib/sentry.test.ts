import { describe, it, expect } from 'vitest';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry';

// Error reports must never carry tokens from links, emails or user details.
describe('Sentry scrubbing', () => {
  it('strips secrets from the page URL and drops user, headers and cookies', () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: 'u1', email: 'head@school.org', ip_address: '1.2.3.4' },
      request: {
        url: 'https://surveys.humankindaward.com/reset-password?token=abc123&type=recovery',
        query_string: 'token=abc123',
        cookies: { sb: 'session' },
        headers: { Authorization: 'Bearer jwt' },
      },
    } as ErrorEvent);

    expect(event.user).toBeUndefined();
    expect(event.request?.url).toBe('https://surveys.humankindaward.com/reset-password');
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers).toBeUndefined();
  });

  it('strips login tokens in the URL fragment', () => {
    const event = scrubEvent({
      type: undefined,
      request: { url: 'https://surveys.humankindaward.com/login#access_token=eyJ.secret&type=signup' },
    } as ErrorEvent);
    expect(event.request?.url).toBe('https://surveys.humankindaward.com/login');
  });

  it('removes email addresses from error messages', () => {
    const event = scrubEvent({
      type: undefined,
      message: 'Could not invite head.teacher@school.sch.uk',
      exception: { values: [{ type: 'Error', value: 'Duplicate user jane.doe@example.com' }] },
    } as ErrorEvent);
    expect(event.message).toBe('Could not invite [email]');
    expect(event.exception?.values?.[0].value).toBe('Duplicate user [email]');
  });

  it('cuts breadcrumb URLs back to the path', () => {
    const crumb = scrubBreadcrumb({
      category: 'fetch',
      data: { url: 'https://x.supabase.co/rest/v1/profiles?email=eq.jane@example.com', method: 'GET' },
    } as Breadcrumb);
    expect(crumb?.data?.url).toBe('https://x.supabase.co/rest/v1/profiles');

    const nav = scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/accept-invitation?token=secret', to: '/dashboard' },
    } as Breadcrumb);
    expect(nav?.data?.from).toBe('/accept-invitation');
  });

  it('drops console breadcrumbs entirely', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'user a@b.com logged in' })).toBeNull();
  });
});
