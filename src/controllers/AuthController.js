/**
 * Controlador de Autenticación
 * Implementa el patrón MVC - Capa de Controlador
 * Maneja las peticiones HTTP y coordina con la capa de servicio
 */

const AuthService = require('../services/AuthService');
const { createErrorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  constructor() {
    // Inyección de dependencias
    this.authService = new AuthService();
    
    // Bind de métodos para mantener contexto
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  this.verifyAuth = this.verifyAuth.bind(this);
   this.getPublicInfo = this.getPublicInfo.bind(this);
  }

  /**
   * Registrar nuevo usuario
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { username, email, password, role } = req.body;

      // Log de intento de registro (sin datos sensibles)
      logger.info(`Intento de registro para: ${email}`);

      const result = await this.authService.register({
        username,
        email,
        password,
        role
      });

      // Respuesta exitosa
      res.status(201).json(result);

    } catch (error) {
      logger.error('Error en registro:', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });

      next(error);
    }
  }

  /**
   * Iniciar sesión
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Log de intento de login (sin contraseña)
      logger.info(`Intento de login para: ${email}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const result = await this.authService.login({
        email,
        password
      });

      // Respuesta exitosa
      res.status(200).json(result);

    } catch (error) {
      logger.warn('Error en login:', {
        error: error.message,
        email: req.body.email,
        ip: req.ip
      });

      next(error);
    }
  }

  /**
   * Cerrar sesión
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      logger.info(`Logout solicitado por usuario: ${req.user?.email || 'desconocido'}`);

      const result = await this.authService.logout(token);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error en logout:', error.message);
      next(error);
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   * GET /api/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await this.authService.getProfile(userId);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo perfil:', {
        error: error.message,
        userId: req.user?.id
      });

      next(error);
    }
  }

  /**
   * Actualizar perfil del usuario
   * PUT /api/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      logger.info(`Actualizando perfil para usuario: ${req.user.email}`);

      const result = await this.authService.updateProfile(userId, updateData);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error actualizando perfil:', {
        error: error.message,
        userId: req.user?.id
      });

      next(error);
    }
  }

  /**
   * Cambiar contraseña
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      logger.info(`Cambio de contraseña solicitado por: ${req.user.email}`);

      const result = await this.authService.changePassword(userId, {
        currentPassword,
        newPassword
      });

      res.status(200).json(result);

    } catch (error) {
      logger.warn('Error cambiando contraseña:', {
        error: error.message,
        userId: req.user?.id
      });

      next(error);
    }
  }

  /**
   * Renovar token JWT
   * POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const currentToken = req.headers.authorization?.split(' ')[1];

      if (!currentToken) {
        return res.status(400).json(
          createErrorResponse('Token requerido para renovación')
        );
      }

      const result = await this.authService.refreshToken(currentToken);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error renovando token:', error.message);
      next(error);
    }
  }

  /**
   * Verificar estado de autenticación
   * GET /api/auth/verify
   */
  async verifyAuth(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json(
          createErrorResponse('Token no proporcionado')
        );
      }

      const validation = await this.authService.validateToken(token);

      if (validation.valid) {
        res.status(200).json({
          success: true,
          message: 'Token válido',
          user: validation.user
        });
      } else {
        res.status(401).json(
          createErrorResponse('Token inválido')
        );
      }

    } catch (error) {
      logger.error('Error verificando autenticación:', error.message);
      next(error);
    }
  }

  /**
   * Obtener información pública (sin autenticación)
   * GET /api/auth/info
   */
  async getPublicInfo(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: 'Sistema de gestión de libros',
        version: '1.0.0',
        features: [
          'Autenticación JWT',
          'Gestión de libros',
          'Sistema de reservas',
          'Búsqueda avanzada'
        ],
        endpoints: {
          auth: '/api/auth',
          books: '/api/books',
          docs: '/api-docs'
        }
      });
    } catch (error) {
      logger.error('Error obteniendo información pública:', error.message);
      res.status(500).json(
        createErrorResponse('Error interno del servidor')
      );
    }
  }
}

module.exports = AuthController;
