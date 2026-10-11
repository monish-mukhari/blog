import type { Context } from 'hono';
import type { Bindings, Variables } from './env';

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export const logEvent = (event: string, details: Record<string, unknown>) => {
  console.log(JSON.stringify({ level: 'info', event, timestamp: new Date().toISOString(), ...details }));
};

export const logError = (event: string, error: unknown, details: Record<string, unknown>) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      timestamp: new Date().toISOString(),
      error: { name: normalized.name, message: normalized.message, stack: normalized.stack },
      ...details
    })
  );
};

export const reportError = (context: AppContext, error: unknown) => {
  const endpoint = context.env.ERROR_MONITOR_URL;
  if (!endpoint) return;

  const normalized = error instanceof Error ? error : new Error(String(error));
  const request = context.req.raw;
  const delivery = fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(context.env.ERROR_MONITOR_TOKEN
        ? { Authorization: `Bearer ${context.env.ERROR_MONITOR_TOKEN}` }
        : {})
    },
    body: JSON.stringify({
      service: 'inkwell-api',
      environment: 'production',
      requestId: context.get('requestId'),
      method: request.method,
      path: new URL(request.url).pathname,
      error: { name: normalized.name, message: normalized.message, stack: normalized.stack },
      timestamp: new Date().toISOString()
    })
  }).catch((monitorError) => logError('error_monitor_delivery_failed', monitorError, {}));

  try {
    context.executionCtx.waitUntil(delivery);
  } catch {
    void delivery;
  }
};
