/**
 * Middleware de Autenticación
 * Implementa el patrón Middleware para validación de JWT y autorización
 */

const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const { JWT_SECRET } = require('../utils/constants');
const { createErrorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class AuthMiddleware {
  constructor() {
    this.userRepository = new UserRepository();
    this.userCache = new Map(); // Simple cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    // Bind de métodos
    this.authenticate = this.authenticate.bind(this);
    this.authorize = this.authorize.bind(this);
    this.optionalAuth = this.optionalAuth.bind(this);
  }

  /**
   * Middleware principal de autenticación
   * Verifica token JWT y carga información del usuario
   */
  async authenticate(req, res, next) {
    try {
      // Extraer token del header Authorization
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        logger.warn('Token de autorización faltante', {
          ip: req.ip,
          endpoint: req.originalUrl
        });
        
        return res.status(401).json(
          createErrorResponse('Token de acceso requerido')
        );
      }

      const token = this.extractTokenFromHeader(authHeader);
      
      if (!token) {
        logger.warn('Formato de token inválido', {
          ip: req.ip,
          authHeader: authHeader.substring(0, 20) + '...'
        });
        
        return res.status(401).json(
          createErrorResponse('Formato de token inválido')
        );
      }

      // Verificar y decodificar token JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Buscar usuario en base de datos
      const cachedUser = this.getUserFromCache(decoded.userId);
      let user = cachedUser;
      
      if (!user) {
        user = await this.userRepository.findById(decoded.userId);
        if (user) {
          this.cacheUser(user);
        }
      }    

      if (!user) {
        logger.warn('Usuario no encontrado para token válido', {
          userId: decoded.userId,
          ip: req.ip
        });
        
        return res.status(401).json(
          createErrorResponse('Usuario no válido')
        );
      }

      if (!user.isActive) {
        logger.warn('Intento de acceso con usuario inactivo', {
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
        
        return res.status(401).json(
          createErrorResponse('Usuario desactivado')
        );
      }

      // Verificar si el usuario está bloqueado
      if (user.isLocked) {
        logger.warn('Intento de acceso con usuario bloqueado', {
          userId: user._id,
          email: user.email,
          ip: req.ip
        });
        
        return res.status(401).json(
          createErrorResponse('Usuario bloqueado temporalmente')
        );
      }

      // Agregar información del usuario al request
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      };

      req.token = token;

      logger.debug('Autenticación exitosa', {
        userId: user._id,
        email: user.email,
        role: user.role,
        endpoint: req.originalUrl
      });

      next();

    } catch (error) {
      this.handleAuthError(error, req, res);
    }
  }

  /**
   * Middleware de autenticación opcional
   * Si hay token, lo valida, pero no falla si no hay token
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        // No hay token, continuar sin usuario
        return next();
      }

      const token = this.extractTokenFromHeader(authHeader);
      
      if (!token) {
        // Token inválido, continuar sin usuario
        return next();
      }

      // Intentar validar token
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await this.userRepository.findById(decoded.userId);
        
        if (user && user.isActive && !user.isLocked) {
          req.user = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive
          };
          req.token = token;
        }
      } catch (tokenError) {
        // Token inválido o expirado, continuar sin usuario
        logger.debug('Token opcional inválido', {
          error: tokenError.message,
          ip: req.ip
        });
      }

      next();

    } catch (error) {
      logger.error('Error en autenticación opcional:', error);
      next(); // Continuar sin usuario en caso de error
    }
  }

  /**
   * Factory para crear middleware de autorización por roles
   */
  authorize(allowedRoles = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          logger.warn('Intento de autorización sin usuario autenticado', {
            endpoint: req.originalUrl,
            ip: req.ip
          });
          
          return res.status(401).json(
            createErrorResponse('Autenticación requerida')
          );
        }

        // Si no se especifican roles, solo requiere estar autenticado
        if (allowedRoles.length === 0) {
          return next();
        }

        // Verificar si el usuario tiene alguno de los roles permitidos
        if (!allowedRoles.includes(req.user.role)) {
          logger.warn('Acceso denegado por rol insuficiente', {
            userId: req.user.id,
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            endpoint: req.originalUrl
          });
          
          return res.status(403).json(
            createErrorResponse('Permisos insuficientes para esta operación')
          );
        }

        logger.debug('Autorización exitosa', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          endpoint: req.originalUrl
        });

        next();

      } catch (error) {
        logger.error('Error en autorización:', error);
        res.status(500).json(
          createErrorResponse('Error interno de autorización')
        );
      }
    };
  }
  getUserFromCache(userId) {
    const cached = this.userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.user;
    }
    this.userCache.delete(userId);
    return null;
  }

  cacheUser(user) {
    this.userCache.set(user._id.toString(), {
      user,
      timestamp: Date.now()
    });
  }
    /**
   * Middleware para verificar propiedad del recurso
   */
  checkResourceOwnership(getResourceOwnerIdFn) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json(
            createErrorResponse('Autenticación requerida')
          );
        }

        // Si es admin, permitir acceso
        if (req.user.role === 'admin') {
          return next();
        }

        // Obtener el ID del propietario del recurso
        const resourceOwnerId = await getResourceOwnerIdFn(req);
        
        if (!resourceOwnerId) {
          logger.warn('No se pudo determinar el propietario del recurso', {
            userId: req.user.id,
            endpoint: req.originalUrl
          });
          
          return res.status(403).json(
            createErrorResponse('No se puede verificar la propiedad del recurso')
          );
        }

        // Verificar si el usuario es el propietario
        if (req.user.id !== resourceOwnerId.toString()) {
          logger.warn('Intento de acceso a recurso ajeno', {
            userId: req.user.id,
            resourceOwnerId,
            endpoint: req.originalUrl
          });
          
          return res.status(403).json(
            createErrorResponse('No tienes permisos para acceder a este recurso')
          );
        }

        next();

      } catch (error) {
        logger.error('Error verificando propiedad del recurso:', error);
        res.status(500).json(
          createErrorResponse('Error interno verificando permisos')
        );
      }
    };
  }

  /**
   * Extraer token del header Authorization
   */
  extractTokenFromHeader(authHeader) {
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Manejo centralizado de errores de autenticación
   */
  handleAuthError(error, req, res) {
    let message = 'Error de autenticación';
    let statusCode = 401;

    if (error.name === 'JsonWebTokenError') {
      message = 'Token inválido';
    } else if (error.name === 'TokenExpiredError') {
      message = 'Token expirado';
    } else if (error.name === 'NotBeforeError') {
      message = 'Token no válido aún';
    } else {
      statusCode = 500;
      message = 'Error interno de autenticación';
      
      logger.error('Error interno en autenticación:', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        endpoint: req.originalUrl
      });
    }

    logger.warn('Error de autenticación:', {
      error: message,
      ip: req.ip,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    res.status(statusCode).json(createErrorResponse(message));
  }
}

// Crear instancia singleton del middleware
const authMiddleware = new AuthMiddleware();

// Exportar métodos individuales para facilitar uso
module.exports = {
  authenticate: authMiddleware.authenticate,
  authorize: authMiddleware.authorize,
  optionalAuth: authMiddleware.optionalAuth,
  checkResourceOwnership: authMiddleware.checkResourceOwnership
};