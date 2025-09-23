/**
 * Constantes de la Aplicación
 * Centraliza configuración y valores constantes
 * Implementa el patrón Configuration Object
 */

// Configuración del entorno
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// Configuración de base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookstore';

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Configuración de CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN || (NODE_ENV === 'production' ? false : true);

// Estados de libros
const BOOK_STATUS = {
  DISPONIBLE: 'disponible',
  RESERVADO: 'reservado',
  PRESTADO: 'prestado',
  MANTENIMIENTO: 'mantenimiento'
};

// Roles de usuario
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

// Configuración de validación
const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100
  },
  BOOK_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  BOOK_AUTHOR: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100
  },
  BOOK_DESCRIPTION: {
    MAX_LENGTH: 1000
  },
  YEAR: {
    MIN: 1000,
    MAX: new Date().getFullYear() + 1
  }
};

// Configuración de Rate Limiting
const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS: 100, // máximo 100 requests por ventana
  AUTH_MAX_REQUESTS: 5 // máximo 5 intentos de auth por ventana
};

// Configuración de paginación
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Códigos de error de la aplicación
const ERROR_CODES = {
  // Errores de autenticación
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Errores de validación
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Errores de recursos
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

  // Errores de libros
  BOOK_NOT_AVAILABLE: 'BOOK_NOT_AVAILABLE',
  BOOK_ALREADY_RESERVED: 'BOOK_ALREADY_RESERVED',

  // Errores del sistema
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// Mensajes de respuesta
const MESSAGES = {
  SUCCESS: {
    USER_REGISTERED: 'Usuario registrado exitosamente',
    USER_LOGGED_IN: 'Inicio de sesión exitoso',
    USER_LOGGED_OUT: 'Sesión cerrada exitosamente',
    PROFILE_UPDATED: 'Perfil actualizado exitosamente',
    PASSWORD_CHANGED: 'Contraseña cambiada exitosamente',
    
    BOOK_CREATED: 'Libro creado exitosamente',
    BOOK_UPDATED: 'Libro actualizado exitosamente',
    BOOK_DELETED: 'Libro eliminado exitosamente',
    BOOK_RESERVED: 'Libro reservado exitosamente',
    RESERVATION_RELEASED: 'Reserva liberada exitosamente'
  },
  ERROR: {
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    EMAIL_EXISTS: 'El email ya está registrado',
    USER_NOT_FOUND: 'Usuario no encontrado',
    BOOK_NOT_FOUND: 'Libro no encontrado',
    INSUFFICIENT_PERMISSIONS: 'Permisos insuficientes',
    BOOK_NOT_AVAILABLE: 'Libro no disponible',
    UNAUTHORIZED: 'No autorizado para realizar esta operación',
    TOKEN_EXPIRED: 'Token expirado',
    TOKEN_INVALID: 'Token inválido',
    VALIDATION_FAILED: 'Error de validación en los datos proporcionados',
    INTERNAL_ERROR: 'Error interno del servidor'
  }
};

// Configuración de límites de reservas por rol
const RESERVATION_LIMITS = {
  [USER_ROLES.USER]: 3,
  [USER_ROLES.ADMIN]: 10
};

// URLs y endpoints importantes
const ENDPOINTS = {
  API_PREFIX: '/api',
  AUTH: '/api/auth',
  BOOKS: '/api/books',
  DOCS: '/api-docs',
  HEALTH: '/health'
};

module.exports = {
  // Variables de entorno
  NODE_ENV,
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CORS_ORIGIN,

  // Constantes de la aplicación
  BOOK_STATUS,
  USER_ROLES,
  VALIDATION,
  RATE_LIMIT,
  PAGINATION,
  ERROR_CODES,
  MESSAGES,
  RESERVATION_LIMITS,
  ENDPOINTS
};