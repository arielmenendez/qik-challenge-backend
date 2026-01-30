import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const isProduction = process.env.NODE_ENV === 'production';

const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value instanceof Error) return value.stack || value.message;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
};

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.colorize({ all: !isProduction }),
        winston.format.printf((info) => {
          const { timestamp, level, message, context, ms } = info;

          return `${safeString(timestamp)} [${safeString(context ?? 'App')}] ${safeString(level)}: ${safeString(message)} ${safeString(ms ?? '')}`;
        }),
      ),
    }),

    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: '%DATE%-error.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
    }),

    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: '%DATE%-combined.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
};
