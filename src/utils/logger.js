/**
 * Sistema de Logging
 * Implementa el patrón Singleton para logging centralizado
 * Usa Winston para manejo avanzado de logs
 */

const winston = require('winston');
const path = require('path');
const { NODE_ENV } = require('./constants');

class Logger {
  constructor() {
    this.logger = this.createLogger();
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  createLogger() {
    // Configuración de formatos
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Formato para consola en desarrollo
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
      })
    );

    // Configuración de transports
    const transports = [];

    // Transport para consola
    transports.push(
      new winston.transports.Console({
        level: NODE_ENV === 'development' ? 'debug' : 'info',
        format: NODE_ENV === 'development' ? consoleFormat : logFormat,
        handleExceptions: true,
        handleRejections: true
      })
    );

    // Transport para archivos (solo en producción y desarrollo)
    if (NODE_ENV !== 'test') {
      // Logs de error
      transports.push(
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          handleExceptions: true,
          handleRejections: true
        })
      );

      // Logs combinados
      transports.push(
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log'),
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );

      // Logs de acceso/requests
      transports.push(
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'access.log'),
          level: 'info',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 10
        })
      );
    }

    // Crear logger de Winston
    const logger = winston.createLogger({
      level: this.getLogLevel(),
      format: logFormat,
      defaultMeta: {
        service: 'book-management-system',
        environment: NODE_ENV,
        pid: process.pid,
        hostname: require('os').hostname()
      },
      transports,
      exitOnError: false
    });

    return logger;
  }

  getLogLevel() {
    switch (NODE_ENV) {
      case 'development':
        return 'debug';
      case 'test':
        return 'warn';
      case 'production':
        return 'info';
      default:
        return 'info';
    }
  }

  // Métodos de logging con contexto mejorado
  error(message, meta = {}) {
    this.logger.error(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  info(message, meta = {}) {
    this.logger.info(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  debug(message, meta = {}) {
    this.logger.debug(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  // Métodos especializados para diferentes tipos de eventos
  logRequest(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null
    });
  }

  logAuth(action, user, success, meta = {}) {
    const level = success ? 'info' : 'warn';
    
    this.logger[level](`Auth: ${action}`, {
      action,
      success,
      user: user ? {
        id: user.id || user._id,
        email: user.email,
        role: user.role
      } : null,
      ...meta
    });
  }

  logDatabase(operation, collection, success, meta = {}) {
    const level = success ? 'debug' : 'error';
    
    this.logger[level](`Database: ${operation}`, {
      operation,
      collection,
      success,
      ...meta
    });
  }

  logSecurity(event, severity = 'warn', meta = {}) {
    this.logger[severity](`Security: ${event}`, {
      securityEvent: event,
      severity,
      ...meta
    });
  }

  logPerformance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'warn' : 'debug';
    
    this.logger[level](`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      slow: duration > 1000,
      ...meta
    });
  }

  // Método para logging estructurado de errores
  logError(error, context = {}) {
    this.error('Application Error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      context
    });
  }

  // Método para crear un logger hijo con contexto específico
  child(defaultMeta) {
    return {
      error: (message, meta = {}) => this.error(message, { ...defaultMeta, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...defaultMeta, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...defaultMeta, ...meta }),
      debug: (message, meta = {}) => this.debug(message, { ...defaultMeta, ...meta })
    };
  }

  // Método para logging de métricas de aplicación
  logMetrics(metrics) {
    this.info('Application Metrics', {
      ...metrics,
      timestamp: new Date().toISOString(),
      type: 'metrics'
    });
  }

  // Método para crear logs de auditoría
  audit(action, resource, user, success = true, meta = {}) {
    this.info('Audit Log', {
      action,
      resource,
      user: user ? {
        id: user.id || user._id,
        email: user.email,
        role: user.role
      } : null,
      success,
      type: 'audit',
      ...meta
    });
  }
}

// Crear y exportar instancia singleton
const loggerInstance = Logger.getInstance();

// Crear directorio de logs si no existe
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Manejar cierre graceful del logger
process.on('exit', () => {
  loggerInstance.logger.end();
});

process.on('SIGINT', () => {
  loggerInstance.logger.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  loggerInstance.logger.end();
  process.exit(0);
});

module.exports = loggerInstance;