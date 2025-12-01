/**
 * Utilitaire de logging avec niveaux et contrôle de verbosité
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;
const LOG_LEVEL = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function shouldLog(level) {
  return levels[level] <= levels[LOG_LEVEL];
}

const logger = {
  error: (message, ...args) => {
    if (shouldLog('error')) {
      console.error(`❌ [${new Date().toISOString()}]`, message, ...args);
    }
  },

  warn: (message, ...args) => {
    if (shouldLog('warn')) {
      console.warn(`⚠️  [${new Date().toISOString()}]`, message, ...args);
    }
  },

  info: (message, ...args) => {
    if (shouldLog('info')) {
      console.log(`ℹ️  [${new Date().toISOString()}]`, message, ...args);
    }
  },

  debug: (message, ...args) => {
    if (shouldLog('debug')) {
      console.log(`🔍 [${new Date().toISOString()}]`, message, ...args);
    }
  },

  success: (message, ...args) => {
    if (shouldLog('info')) {
      console.log(`✅ [${new Date().toISOString()}]`, message, ...args);
    }
  }
};

module.exports = logger;

