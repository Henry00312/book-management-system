/**
 * Servicio de Autenticación
 * Implementa el patrón Service Layer para encapsular la lógica de negocio
 * de autenticación y autorización
 */

const UserRepository = require('../repositories/UserRepository');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');
const logger = require('../utils/logger');
const { createSuccessResponse, createErrorResponse } = require('../utils/response');

class AuthService {
  constructor() {
    // Inyección de dependencias - Patrón Dependency Injection
    this.userRepository = new UserRepository();
  }

  /**
   * Registrar nuevo usuario
   * Implementa validaciones de negocio específicas
   */
  async register(userData) {
    try {
      const { username, email, password, role } = userData;

      // Validaciones de negocio
      await this.validateRegistrationData({ username, email, password, role });

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.existsByEmailOrUsername(email, username);
      if (existingUser) {
        throw new Error('Ya existe un usuario con ese email o nombre de usuario');
      }

      // Crear usuario
      const user = await this.userRepository.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: role || 'user'
      });

      // Generar token JWT
      const token = user.generateAuthToken();

      // Registrar evento de registro
      logger.info(`Nuevo usuario registrado: ${user.email} (${user.role})`);

      return createSuccessResponse({
        message: 'Usuario registrado exitosamente',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      logger.error('Error en registro de usuario:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión
   */
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Validaciones básicas
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      // Buscar usuario por credenciales (incluye validación de password)
      const user = await this.userRepository.findByCredentials(email, password);

      // Generar nuevo token
      const token = user.generateAuthToken();

      // Actualizar último login
      await this.userRepository.updateLastLogin(user._id);

      // Registrar evento de login
      logger.info(`Usuario inició sesión: ${user.email}`);

      return createSuccessResponse({
        message: 'Login exitoso',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          lastLogin: new Date()
        }
      });

    } catch (error) {
      logger.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Validar token JWT y obtener usuario
   */
  async validateToken(token) {
    try {
      if (!token) {
        throw new Error('Token no proporcionado');
      }

      // Verificar token JWT
      const decoded = jwt.verify(token, JWT_SECRET);

      // Buscar usuario en base de datos
      const user = await this.userRepository.findById(decoded.userId);

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.isActive) {
        throw new Error('Usuario desactivado');
      }

      return {
        valid: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      }
      throw error;
    }
  }

  /**
   * Renovar token JWT
   */
  async refreshToken(currentToken) {
    try {
      const validation = await this.validateToken(currentToken);
      
      if (!validation.valid) {
        throw new Error('Token inválido para renovación');
      }

      const user = await this.userRepository.findById(validation.user.id);
      const newToken = user.generateAuthToken();

      logger.info(`Token renovado para usuario: ${user.email}`);

      return createSuccessResponse({
        message: 'Token renovado exitosamente',
        token: newToken,
        user: validation.user
      });

    } catch (error) {
      logger.error('Error renovando token:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión (invalidar token)
   * Nota: Con JWT stateless, esto requeriría una blacklist en producción
   */
  async logout(token) {
    try {
      const validation = await this.validateToken(token);
      
      if (validation.valid) {
        logger.info(`Usuario cerró sesión: ${validation.user.email}`);
      }

      return createSuccessResponse({
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      // Incluso si el token es inválido, consideramos el logout exitoso
      logger.info('Intento de logout con token inválido');
      return createSuccessResponse({
        message: 'Sesión cerrada'
      });
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId, passwordData) {
    try {
      const { currentPassword, newPassword } = passwordData;

      // Validaciones
      if (!currentPassword || !newPassword) {
        throw new Error('Contraseña actual y nueva contraseña son requeridas');
      }

      if (currentPassword === newPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual');
      }

      // Buscar usuario con password
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const userWithPassword = await this.userRepository.findByCredentials(user.email, currentPassword);

      // Validar nueva contraseña
      this.validatePassword(newPassword);

      // Actualizar contraseña
      await this.userRepository.update(userId, { password: newPassword });

      logger.info(`Contraseña cambiada para usuario: ${user.email}`);

      return createSuccessResponse({
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      logger.error('Error cambiando contraseña:', error);
      throw error;
    }
  }

  /**
   * Obtener perfil de usuario
   */
  async getProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return createSuccessResponse({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      logger.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil de usuario
   */
  async updateProfile(userId, updateData) {
    try {
      const { username, email } = updateData;

      // Validaciones de negocio
      if (username) {
        this.validateUsername(username);
      }

      if (email) {
        this.validateEmail(email);
        
        // Verificar que el email no esté en uso por otro usuario
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser && existingUser._id.toString() !== userId) {
          throw new Error('El email ya está en uso por otro usuario');
        }
      }

      // Actualizar usuario
      const updatedUser = await this.userRepository.update(userId, {
        ...(username && { username: username.trim() }),
        ...(email && { email: email.toLowerCase().trim() })
      });

      logger.info(`Perfil actualizado para usuario: ${updatedUser.email}`);

      return createSuccessResponse({
        message: 'Perfil actualizado exitosamente',
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: updatedUser.updatedAt
        }
      });

    } catch (error) {
      logger.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  /**
   * Buscar usuario por email (para verificaciones)
   */
  async findUserByEmail(email) {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      logger.error('Error buscando usuario por email:', error);
      throw error;
    }
  }

  /**
   * Verificar autorización para operaciones específicas
   */
  async checkAuthorization(userId, requiredRole = null, resourceOwnerId = null) {
    try {
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.isActive) {
        throw new Error('Usuario desactivado');
      }

      // Verificar rol requerido
      if (requiredRole) {
        const roleHierarchy = { 'admin': 2, 'user': 1 };
        const userLevel = roleHierarchy[user.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        if (userLevel < requiredLevel) {
          throw new Error('Permisos insuficientes');
        }
      }

      // Verificar propiedad del recurso
      if (resourceOwnerId) {
        if (user.role !== 'admin' && user._id.toString() !== resourceOwnerId.toString()) {
          throw new Error('No autorizado para acceder a este recurso');
        }
      }

      return {
        authorized: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      logger.error('Error verificando autorización:', error);
      throw error;
    }
  }

  /**
   * Validaciones privadas
   */
  async validateRegistrationData({ username, email, password, role }) {
    if (!username || !email || !password) {
      throw new Error('Username, email y password son requeridos');
    }

    this.validateUsername(username);
    this.validateEmail(email);
    this.validatePassword(password);
    
    if (role && !['admin', 'user'].includes(role)) {
      throw new Error('Rol inválido');
    }
  }

  validateUsername(username) {
    if (typeof username !== 'string' || username.trim().length < 3) {
      throw new Error('El username debe tener al menos 3 caracteres');
    }

    if (username.length > 30) {
      throw new Error('El username no puede exceder 30 caracteres');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('El username solo puede contener letras, números y guiones bajos');
    }
  }

  validateEmail(email) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Formato de email inválido');
    }
  }

  validatePassword(password) {
    if (typeof password !== 'string' || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    if (password.length > 128) {
      throw new Error('La contraseña no puede exceder 128 caracteres');
    }

    // Opcional: validaciones adicionales de complejidad
    // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    //   throw new Error('La contraseña debe contener al menos una minúscula, una mayúscula y un número');
    // }
  }
}

module.exports = AuthService;