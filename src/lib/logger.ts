/**
 * Simple structured logger. Replace with pino or another logger for production.
 */
function log(level: string, message: string, meta?: Record<string, unknown>): void {
  const payload = { level, message, ...meta, timestamp: new Date().toISOString() };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
