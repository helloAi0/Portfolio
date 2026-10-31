type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown> | Error | null;
}

export function log(level: LogLevel, context: string, message: string, data?: Record<string, unknown> | Error | null) {
  const logEntry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data: data instanceof Error ? { name: data.name, message: data.message, stack: data.stack } : data,
  };

  const output = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.context}] ${logEntry.message}`;

  switch (level) {
    case 'ERROR':
      console.error(output, logEntry.data || '');
      break;
    case 'WARN':
      console.warn(output, logEntry.data || '');
      break;
    case 'DEBUG':
      if (process.env.NODE_ENV === 'development') {
        console.debug(output, logEntry.data || '');
      }
      break;
    default:
      console.log(output, logEntry.data || '');
      break;
  }
}

export const logger = {
  info: (context: string, message: string, data?: Record<string, unknown>) =>
    log('INFO', context, message, data),
  warn: (context: string, message: string, data?: Record<string, unknown>) =>
    log('WARN', context, message, data),
  error: (context: string, messageOrError: string | Error, data?: Record<string, unknown> | Error) => {
    if (messageOrError instanceof Error) {
      log('ERROR', context, messageOrError.message, messageOrError);
    } else {
      log('ERROR', context, messageOrError, data);
    }
  },
  debug: (context: string, message: string, data?: Record<string, unknown>) =>
    log('DEBUG', context, message, data),
};
