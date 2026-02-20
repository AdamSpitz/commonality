export interface Logger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

export const ConsoleLogger: Logger = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
};

export function wrapLoggerWithPrefix(prefix: string, logger: Logger): Logger {
  return {
    info: (msg: string) => logger.info(`[${prefix}] ${msg}`),
    warn: (msg: string) => logger.warn(`[${prefix}] ${msg}`),
    error: (msg: string) => logger.error(`[${prefix}] ${msg}`),
  };
}
