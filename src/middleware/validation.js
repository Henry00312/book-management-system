/**
 * Middleware de Validación
 * Implementa validaciones usando Joi para todas las entradas de datos
 * Patrón Validator para validación centralizada
 */

const Joi = require('joi');
const { createValidationErrorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { VALIDATION, BOOK_STATUS, USER_ROLES } = require('../utils/constants');

/**
 * Factory para crear middleware de validación
 * @param {Object} schema - Esquema de validación de Joi
 * @param {string} source - Fuente de datos (body, query, params)
 * @returns {Function} Middleware de validación
 */
const createValidationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Mostrar todos los errores
      allowUnknown: false, // No permitir campos desconocidos
      stripUnknown: true // Remover campos desconocidos
    });

    if (error) {
      // Formatear errores de validación
      const validationErrors = {};
      error.details.forEach(detail => {
        const field = detail.path.join('.');
        validationErrors[field] = detail.message;
      });

      logger.warn('Error de validación:', {
        source,
        errors: validationErrors,
        endpoint: req.originalUrl,
        method: req.method,
        user: req.user?.email || 'anónimo'
      });

      return res.status(400).json(
        createValidationErrorResponse(
          validationErrors,
          'Error de validación en los datos proporcionados'
        )
      );
    }

    // Reemplazar datos originales con datos validados y sanitizados
    req[source] = value;
    next();
  };
};

// Esquemas de validación para autenticación
const registrationSchema = Joi.object({
  username: Joi.string()
    .min(VALIDATION.USERNAME.MIN_LENGTH)
    .max(VALIDATION.USERNAME.MAX_LENGTH)
    .pattern(VALIDATION.USERNAME.PATTERN)
    .required()
    .messages({
      'string.base': 'El nombre de usuario debe ser un texto',
      'string.empty': 'El nombre de usuario es requerido',
      'string.min': `El nombre de usuario debe tener al menos ${VALIDATION.USERNAME.MIN_LENGTH} caracteres`,
      'string.max': `El nombre de usuario no puede exceder ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`,
      'string.pattern.base': 'El nombre de usuario solo puede contener letras, números y guiones bajos',
      'any.required': 'El nombre de usuario es requerido'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'El email debe ser un texto',
      'string.empty': 'El email es requerido',
      'string.email': 'Formato de email inválido',
      'any.required': 'El email es requerido'
    }),
  
  password: Joi.string()
    .min(VALIDATION.PASSWORD.MIN_LENGTH)
    .max(VALIDATION.PASSWORD.MAX_LENGTH)
    .required()
    .messages({
      'string.base': 'La contraseña debe ser un texto',
      'string.empty': 'La contraseña es requerida',
      'string.min': `La contraseña debe tener al menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`,
      'string.max': `La contraseña no puede exceder ${VALIDATION.PASSWORD.MAX_LENGTH} caracteres`,
      'any.required': 'La contraseña es requerida'
    }),
  
  role: Joi.string()
    .valid(...Object.values(USER_ROLES))
    .default(USER_ROLES.USER)
    .messages({
      'any.only': 'El rol debe ser admin o user'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'El email debe ser un texto',
      'string.empty': 'El email es requerido',
      'string.email': 'Formato de email inválido',
      'any.required': 'El email es requerido'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.base': 'La contraseña debe ser un texto',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    })
});

const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.base': 'La contraseña actual debe ser un texto',
      'string.empty': 'La contraseña actual es requerida',
      'any.required': 'La contraseña actual es requerida'
    }),
  
  newPassword: Joi.string()
    .min(VALIDATION.PASSWORD.MIN_LENGTH)
    .max(VALIDATION.PASSWORD.MAX_LENGTH)
    .required()
    .messages({
      'string.base': 'La nueva contraseña debe ser un texto',
      'string.empty': 'La nueva contraseña es requerida',
      'string.min': `La nueva contraseña debe tener al menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`,
      'string.max': `La nueva contraseña no puede exceder ${VALIDATION.PASSWORD.MAX_LENGTH} caracteres`,
      'any.required': 'La nueva contraseña es requerida'
    })
});

const profileUpdateSchema = Joi.object({
  username: Joi.string()
    .min(VALIDATION.USERNAME.MIN_LENGTH)
    .max(VALIDATION.USERNAME.MAX_LENGTH)
    .pattern(VALIDATION.USERNAME.PATTERN)
    .messages({
      'string.base': 'El nombre de usuario debe ser un texto',
      'string.min': `El nombre de usuario debe tener al menos ${VALIDATION.USERNAME.MIN_LENGTH} caracteres`,
      'string.max': `El nombre de usuario no puede exceder ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`,
      'string.pattern.base': 'El nombre de usuario solo puede contener letras, números y guiones bajos'
    }),
  
  email: Joi.string()
    .email()
    .messages({
      'string.base': 'El email debe ser un texto',
      'string.email': 'Formato de email inválido'
    })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

// Esquemas de validación para libros
const bookSchema = Joi.object({
  titulo: Joi.string()
    .min(VALIDATION.BOOK_TITLE.MIN_LENGTH)
    .max(VALIDATION.BOOK_TITLE.MAX_LENGTH)
    .trim()
    .required()
    .messages({
      'string.base': 'El título debe ser un texto',
      'string.empty': 'El título es requerido',
      'string.min': `El título debe tener al menos ${VALIDATION.BOOK_TITLE.MIN_LENGTH} caracter`,
      'string.max': `El título no puede exceder ${VALIDATION.BOOK_TITLE.MAX_LENGTH} caracteres`,
      'any.required': 'El título es requerido'
    }),
  
  autor: Joi.string()
    .min(VALIDATION.BOOK_AUTHOR.MIN_LENGTH)
    .max(VALIDATION.BOOK_AUTHOR.MAX_LENGTH)
    .trim()
    .required()
    .messages({
      'string.base': 'El autor debe ser un texto',
      'string.empty': 'El autor es requerido',
      'string.min': `El autor debe tener al menos ${VALIDATION.BOOK_AUTHOR.MIN_LENGTH} caracter`,
      'string.max': `El autor no puede exceder ${VALIDATION.BOOK_AUTHOR.MAX_LENGTH} caracteres`,
      'any.required': 'El autor es requerido'
    }),
  
  anoPublicacion: Joi.number()
    .integer()
    .min(VALIDATION.YEAR.MIN)
    .max(VALIDATION.YEAR.MAX)
    .required()
    .messages({
      'number.base': 'El año de publicación debe ser un número',
      'number.integer': 'El año de publicación debe ser un número entero',
      'number.min': `El año de publicación debe ser mayor a ${VALIDATION.YEAR.MIN}`,
      'number.max': `El año de publicación no puede ser mayor a ${VALIDATION.YEAR.MAX}`,
      'any.required': 'El año de publicación es requerido'
    }),
  
  estado: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .default(BOOK_STATUS.DISPONIBLE)
    .messages({
      'any.only': 'El estado debe ser: disponible, reservado, prestado o mantenimiento'
    }),
  
  isbn: Joi.string()
    .pattern(/^(?:(?:\d{9}[\dX])|(?:\d{10})|(?:97[89]\d{10}))$/)
    .messages({
      'string.pattern.base': 'Formato de ISBN inválido (debe ser ISBN-10 o ISBN-13)'
    }),
  
  descripcion: Joi.string()
    .max(VALIDATION.BOOK_DESCRIPTION.MAX_LENGTH)
    .trim()
    .messages({
      'string.base': 'La descripción debe ser un texto',
      'string.max': `La descripción no puede exceder ${VALIDATION.BOOK_DESCRIPTION.MAX_LENGTH} caracteres`
    }),
  
  genero: Joi.array()
    .items(Joi.string().trim())
    .max(5)
    .messages({
      'array.base': 'Los géneros deben ser un array',
      'array.max': 'No puede tener más de 5 géneros'
    }),
  
  editorial: Joi.string()
    .max(100)
    .trim()
    .messages({
      'string.base': 'La editorial debe ser un texto',
      'string.max': 'La editorial no puede exceder 100 caracteres'
    }),
  
  idioma: Joi.string()
    .max(50)
    .trim()
    .default('Español')
    .messages({
      'string.base': 'El idioma debe ser un texto',
      'string.max': 'El idioma no puede exceder 50 caracteres'
    }),
  
  numeroPaginas: Joi.number()
    .integer()
    .min(1)
    .messages({
      'number.base': 'El número de páginas debe ser un número',
      'number.integer': 'El número de páginas debe ser un número entero',
      'number.min': 'El número de páginas debe ser mayor a 0'
    }),
  
  precio: Joi.number()
    .min(0)
    .messages({
      'number.base': 'El precio debe ser un número',
      'number.min': 'El precio no puede ser negativo'
    }),
  
  ubicacion: Joi.object({
    estanteria: Joi.string().max(10).trim(),
    seccion: Joi.string().max(10).trim(),
    nivel: Joi.number().integer().min(1)
  }).messages({
    'object.base': 'La ubicación debe ser un objeto válido'
  })
});

const bookUpdateSchema = Joi.object({
  titulo: Joi.string()
    .min(VALIDATION.BOOK_TITLE.MIN_LENGTH)
    .max(VALIDATION.BOOK_TITLE.MAX_LENGTH)
    .trim()
    .messages({
      'string.base': 'El título debe ser un texto',
      'string.min': `El título debe tener al menos ${VALIDATION.BOOK_TITLE.MIN_LENGTH} caracter`,
      'string.max': `El título no puede exceder ${VALIDATION.BOOK_TITLE.MAX_LENGTH} caracteres`
    }),
  
  autor: Joi.string()
    .min(VALIDATION.BOOK_AUTHOR.MIN_LENGTH)
    .max(VALIDATION.BOOK_AUTHOR.MAX_LENGTH)
    .trim()
    .messages({
      'string.base': 'El autor debe ser un texto',
      'string.min': `El autor debe tener al menos ${VALIDATION.BOOK_AUTHOR.MIN_LENGTH} caracter`,
      'string.max': `El autor no puede exceder ${VALIDATION.BOOK_AUTHOR.MAX_LENGTH} caracteres`
    }),
  
  anoPublicacion: Joi.number()
    .integer()
    .min(VALIDATION.YEAR.MIN)
    .max(VALIDATION.YEAR.MAX)
    .messages({
      'number.base': 'El año de publicación debe ser un número',
      'number.integer': 'El año de publicación debe ser un número entero',
      'number.min': `El año de publicación debe ser mayor a ${VALIDATION.YEAR.MIN}`,
      'number.max': `El año de publicación no puede ser mayor a ${VALIDATION.YEAR.MAX}`
    }),
  
  estado: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .messages({
      'any.only': 'El estado debe ser: disponible, reservado, prestado o mantenimiento'
    }),
  
  isbn: Joi.string()
    .pattern(/^(?:(?:\d{9}[\dX])|(?:\d{10})|(?:97[89]\d{10}))$/)
    .messages({
      'string.pattern.base': 'Formato de ISBN inválido (debe ser ISBN-10 o ISBN-13)'
    }),
  
  descripcion: Joi.string()
    .max(VALIDATION.BOOK_DESCRIPTION.MAX_LENGTH)
    .trim()
    .messages({
      'string.base': 'La descripción debe ser un texto',
      'string.max': `La descripción no puede exceder ${VALIDATION.BOOK_DESCRIPTION.MAX_LENGTH} caracteres`
    }),
  
  genero: Joi.array()
    .items(Joi.string().trim())
    .max(5)
    .messages({
      'array.base': 'Los géneros deben ser un array',
      'array.max': 'No puede tener más de 5 géneros'
    }),
  
  editorial: Joi.string()
    .max(100)
    .trim()
    .messages({
      'string.base': 'La editorial debe ser un texto',
      'string.max': 'La editorial no puede exceder 100 caracteres'
    }),
  
  idioma: Joi.string()
    .max(50)
    .trim()
    .messages({
      'string.base': 'El idioma debe ser un texto',
      'string.max': 'El idioma no puede exceder 50 caracteres'
    }),
  
  numeroPaginas: Joi.number()
    .integer()
    .min(1)
    .messages({
      'number.base': 'El número de páginas debe ser un número',
      'number.integer': 'El número de páginas debe ser un número entero',
      'number.min': 'El número de páginas debe ser mayor a 0'
    }),
  
  precio: Joi.number()
    .min(0)
    .messages({
      'number.base': 'El precio debe ser un número',
      'number.min': 'El precio no puede ser negativo'
    }),
  
  ubicacion: Joi.object({
    estanteria: Joi.string().max(10).trim(),
    seccion: Joi.string().max(10).trim(),
    nivel: Joi.number().integer().min(1)
  }).messages({
    'object.base': 'La ubicación debe ser un objeto válido'
  })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

const bookStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .required()
    .messages({
      'any.only': 'El estado debe ser: disponible, reservado, prestado o mantenimiento',
      'any.required': 'El estado es requerido'
    })
});

// Esquemas de validación para parámetros de consulta
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'La página debe ser un número',
      'number.integer': 'La página debe ser un número entero',
      'number.min': 'La página debe ser mayor a 0'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser mayor a 0',
      'number.max': 'El límite no puede ser mayor a 100'
    }),
  
  sortBy: Joi.string()
    .valid('titulo', 'autor', 'anoPublicacion', 'createdAt', 'updatedAt')
    .default('createdAt')
    .messages({
      'any.only': 'El campo de ordenamiento debe ser: titulo, autor, anoPublicacion, createdAt o updatedAt'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'El orden debe ser: asc o desc'
    }),
  
  search: Joi.string()
    .trim()
    .messages({
      'string.base': 'El término de búsqueda debe ser un texto'
    }),
  
  estado: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .messages({
      'any.only': 'El estado debe ser: disponible, reservado, prestado o mantenimiento'
    }),
  
  autor: Joi.string()
    .trim()
    .messages({
      'string.base': 'El autor debe ser un texto'
    }),
  
  genero: Joi.string()
    .trim()
    .messages({
      'string.base': 'El género debe ser un texto'
    }),
  
  anoDesde: Joi.number()
    .integer()
    .min(VALIDATION.YEAR.MIN)
    .max(VALIDATION.YEAR.MAX)
    .messages({
      'number.base': 'El año desde debe ser un número',
      'number.integer': 'El año desde debe ser un número entero',
      'number.min': `El año desde debe ser mayor a ${VALIDATION.YEAR.MIN}`,
      'number.max': `El año desde no puede ser mayor a ${VALIDATION.YEAR.MAX}`
    }),
  
  anoHasta: Joi.number()
    .integer()
    .min(VALIDATION.YEAR.MIN)
    .max(VALIDATION.YEAR.MAX)
    .messages({
      'number.base': 'El año hasta debe ser un número',
      'number.integer': 'El año hasta debe ser un número entero',
      'number.min': `El año hasta debe ser mayor a ${VALIDATION.YEAR.MIN}`,
      'number.max': `El año hasta no puede ser mayor a ${VALIDATION.YEAR.MAX}`
    })
});

// Validación personalizada para validar que anoDesde <= anoHasta
const validateYearRange = (req, res, next) => {
  const { anoDesde, anoHasta } = req.query;
  
  if (anoDesde && anoHasta && parseInt(anoDesde) > parseInt(anoHasta)) {
    return res.status(400).json(
      createValidationErrorResponse(
        { yearRange: 'El año desde no puede ser mayor al año hasta' },
        'Rango de años inválido'
      )
    );
  }
  
  next();
};

// Middleware para validar parámetros de ID
const validateObjectId = (paramName = 'id') => {
  const objectIdSchema = Joi.object({
    [paramName]: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'ID inválido',
        'any.required': 'ID es requerido'
      })
  });
  
  return createValidationMiddleware(objectIdSchema, 'params');
};

// Middleware para sanitizar datos de entrada
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remover scripts maliciosos básicos
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };
  
  // Sanitizar body, query y params
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  
  next();
};

// Exportar middleware de validación
module.exports = {
  // Autenticación
  validateRegistration: createValidationMiddleware(registrationSchema),
  validateLogin: createValidationMiddleware(loginSchema),
  validatePasswordChange: createValidationMiddleware(passwordChangeSchema),
  validateProfileUpdate: createValidationMiddleware(profileUpdateSchema),
  
  // Libros
  validateBook: createValidationMiddleware(bookSchema),
  validateBookUpdate: createValidationMiddleware(bookUpdateSchema),
  validateBookStatus: createValidationMiddleware(bookStatusSchema),
  
  // Parámetros de consulta
  validatePagination: [
    createValidationMiddleware(paginationSchema, 'query'),
    validateYearRange
  ],
  
  // Utilidades
  validateObjectId,
  sanitizeInput,
  
  // Factory function para crear validadores personalizados
  createValidationMiddleware
};