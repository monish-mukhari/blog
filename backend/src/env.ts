export interface Bindings {
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
  ERROR_MONITOR_URL?: string;
  ERROR_MONITOR_TOKEN?: string;
  DIGEST_WEBHOOK_URL?: string;
  DIGEST_WEBHOOK_TOKEN?: string;
}

export interface Variables {
  userId: string | undefined;
  requestId: string;
}
