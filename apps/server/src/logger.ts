import pino from 'pino';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, '../../logs');
const LOG_FILE = join(LOG_DIR, 'server.log');

mkdirSync(LOG_DIR, { recursive: true });

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        level: process.env.LOG_LEVEL ?? 'debug',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
      {
        target: 'pino/file',
        level: process.env.LOG_LEVEL ?? 'debug',
        options: {
          destination: LOG_FILE,
          append: true,
          mkdir: true,
        },
      },
    ],
  }),
);

export default logger;
