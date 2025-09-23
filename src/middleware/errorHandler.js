/**
 * Middleware de Manejo de Errores
 * Implementa el patrón Error Handler para manejo centralizado de errores
 */

const logger = require('../utils/logger');
const { createErrorResponse } = require('../utils/response');
const { NODE_ENV } = require('../utils/constants');

/**
 * Middleware principal de manejo de errores
 * Debe ser el último middleware en la cadena
 */
const errorHandler = (error, req, res, next) => {
  // Log del error con contexto
  logger.error('Error capturado por errorHandler:', {
    message: error.message,
    stack: NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : 'no autenticado',
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  });

  // Determinar tipo de error y respuesta apropiada
  const errorResponse = determineErrorResponse(error, req);

  // Enviar respuesta de error
  res.status(errorResponse.statusCode).json(createErrorResponse(
    errorResponse.message,
    errorResponse.details,
    errorResponse.code
  ));
};

/**
 * Determina la respuesta de error apropiada según el tipo de error
 */
function determineErrorResponse(error, req) {
  // Errores de validación de Mongoose
  if (error.name === 'ValidationError') {
    return {
      statusCode: 400,
      message: 'Error de validación',
      details: extractValidationErrors(error),
      code: 'VALIDATION_ERROR'
    };
  }

  // Errores de cast de Mongoose (ID inválido)
  if (error.name === 'CastError') {
    return {
      statusCode: 400,
      message: 'ID inválido',
      details: `El valor "${error.value}" no es un ID válido`,
      code: 'INVALID_ID'
    };
  }

  // Errores de duplicado (índice único)
  if (error.code === 11000) {
    return {
      statusCode: 409,
      message: 'Recurso duplicado',
      details: extractDuplicateKeyError(error),
      code: 'DUPLICATE_RESOURCE'
    };
  }

  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Token de autenticación inválido',
      code: 'INVALID_TOKEN'
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Token de autenticación expirado',
      code: 'EXPIRED_TOKEN'
    };
  }

  // Errores de conexión a base de datos
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return {
      statusCode: 503,
      message: 'Error de base de datos',
      details: NODE_ENV === 'development' ? error.message : 'Servicio temporalmente no disponible',
      code: 'DATABASE_ERROR'
    };
  }

  // Errores de conexión de red
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      statusCode: 503,
      message: 'Error de conexión',
      details: 'Servicio temporalmente no disponible',
      code: 'CONNECTION_ERROR'
    };
  }

  // Errores de sintaxis JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return {
      statusCode: 400,
      message: 'JSON inválido',
      details: 'El cuerpo de la petición contiene JSON malformado',
      code: 'INVALID_JSON'
    };
  }

  // Errores de límite de tamaño de payload
  if (error.type === 'entity.too.large') {
    return {
      statusCode: 413,
      message: 'Payload demasiado grande',
      details: 'El tamaño de la petición excede el límite permitido',
      code: 'PAYLOAD_TOO_LARGE'
    };
  }

  // Errores de timeout
  if (error.code === 'ETIMEDOUT') {
    return {
      statusCode: 408,
      message: 'Timeout de petición',
      details: 'La petición tardó demasiado tiempo en procesarse',
      code: 'REQUEST_TIMEOUT'
    };
  }

  // Errores personalizados de la aplicación con statusCode
  if (error.statusCode) {
    return {
      statusCode: error.statusCode,
      message: error.message || 'Error de aplicación',
      details: error.details,
      code: error.code || 'APPLICATION_ERROR'
    };
  }

  // Errores de negocio conocidos
  if (isBusinessError(error)) {
    return {
      statusCode: 400,
      message: error.message,
      code: 'BUSINESS_ERROR'
    };
  }

  // Error interno del servidor (fallback)
  return {
    statusCode: 500,
    message: NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : error.message,
    details: NODE_ENV === 'development' ? error.stack : undefined,
    code: 'INTERNAL_SERVER_ERROR'
  };
}

/**
 * Extrae errores de validación de Mongoose
 */
function extractValidationErrors(error) {
  const errors = {};
  
  for (const field in error.errors) {
    errors[field] = error.errors[field].message;
  }
  
  return errors;
}

/**
 * Extrae información de errores de clave duplicada
 */
function extractDuplicateKeyError(error) {
  const keyValue = error.keyValue || {};
  const duplicatedField = Object.keys(keyValue)[0];
  const duplicatedValue = keyValue[duplicatedField];
  
  return `Ya existe un registro con ${duplicatedField}: "${duplicatedValue}"`;
}

/**
 * Determina si es un error de negocio conocido
 */
function isBusinessError(error) {
  const businessErrorMessages = [
    'Usuario no encontrado',
    'Libro no encontrado',
    'Credenciales inválidas',
    'Ya existe un usuario',
    'Ya existe un libro',
    'El libro no está disponible',
    'No tienes permisos',
    'Cuenta bloqueada',
    'Usuario desactivado',
    'Límite de reservas alcanzado',
    'El libro no está reservado',
    'No autorizado'
  ];

  return businessErrorMessages.some(msg => 
    error.message && error.message.includes(msg)
  );
}

/**
 * Sanitiza el cuerpo de la petición para logging (remueve datos sensibles)
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Middleware para manejar rutas no encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  
  logger.warn('Ruta no encontrada:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  next(error);
};

/**
 * Middleware para manejar errores asíncronos
 * Wrapper para funciones async que automáticamente pasa errores al error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para validar Content-Type en peticiones POST/PUT
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const error = new Error('Content-Type debe ser application/json');
      error.statusCode = 415;
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      return next(error);
    }
  }
  
  next();
};

/**
 * Middleware de logging de peticiones
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log de petición entrante
  logger.info('Petición entrante:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    user: req.user ? req.user.email : 'no autenticado'
  });

  // Override del método end de res para capturar respuesta
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log de respuesta
    logger.info('Respuesta enviada:', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      user: req.user ? req.user.email : 'no autenticado'
    });

    // Llamar al método original
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateContentType,
  requestLogger
};