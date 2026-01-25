// Logger utility - only logs in development mode

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (isDev) console.log('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
