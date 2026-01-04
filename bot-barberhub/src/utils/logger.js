/**
 * Logger otimizado para produção
 * Minimal footprint para Fly.io free tier
 */

import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;
