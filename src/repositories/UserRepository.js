/**
 * Repositorio de Usuarios
 * Implementa el patrón Repository para abstraer el acceso a datos de usuarios
 * Facilita testing y cambios de implementación de persistencia
 */

const User = require('../models/User');
const logger = require('../utils/logger');

class UserRepository {
  /**
   * Crear un nuevo usuario
   */
  async create(userData) {
    try {
      const user = new User(userData);
      await user.save();
      logger.info(`Usuario creado: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error creando usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar usuario por ID
   */
  async findById(userId) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      logger.error('Error buscando usuario por ID:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email) {
    try {
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      });
      return user;
    } catch (error) {
      logger.error('Error buscando usuario por email:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar usuario por username
   */
  async findByUsername(username) {
    try {
      const user = await User.findOne({ 
        username: username,
        isActive: true 
      });
      return user;
    } catch (error) {
      logger.error('Error buscando usuario por username:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar usuario por credenciales (email y password)
   */
  async findByCredentials(email, password) {
    try {
      const user = await User.findByCredentials(email, password);
      return user;
    } catch (error) {
      logger.error('Error validando credenciales:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verificar si existe un usuario con email o username
   */
  async existsByEmailOrUsername(email, username) {
    try {
      const user = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username }
        ],
        isActive: true
      });
      return !!user;
    } catch (error) {
      logger.error('Error verificando existencia de usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar usuario
   */
  async update(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { 
          new: true, 
          runValidators: true,
          select: '-password' 
        }
      );
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      logger.info(`Usuario actualizado: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error actualizando usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivate(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          isActive: false,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      logger.info(`Usuario desactivado: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error desactivando usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reactivar usuario
   */
  async reactivate(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          isActive: true,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      logger.info(`Usuario reactivado: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error reactivando usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Eliminar usuario permanentemente
   */
  async delete(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      logger.info(`Usuario eliminado permanentemente: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error eliminando usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Listar usuarios con paginación y filtros
   */
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        role,
        isActive = true,
        search
      } = options;

      const query = {};
      
      // Filtro por estado activo
      if (typeof isActive === 'boolean') {
        query.isActive = isActive;
      }
      
      // Filtro por rol
      if (role) {
        query.role = role;
      }

      // Búsqueda por texto
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const users = await User.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-password -loginAttempts -lockUntil');

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error listando usuarios:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar usuarios por rol
   */
  async findByRole(role) {
    try {
      const users = await User.find({ 
        role: role,
        isActive: true 
      }).select('-password -loginAttempts -lockUntil');
      
      return users;
    } catch (error) {
      logger.error('Error buscando usuarios por rol:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Contar usuarios por diferentes criterios
   */
  async countUsers(criteria = {}) {
    try {
      return await User.countDocuments({
        isActive: true,
        ...criteria
      });
    } catch (error) {
      logger.error('Error contando usuarios:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getStats() {
    try {
      return await User.getUserStats();
    } catch (error) {
      logger.error('Error obteniendo estadísticas de usuarios:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar último login de usuario
   */
  async updateLastLogin(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          lastLogin: new Date(),
          $unset: { loginAttempts: 1, lockUntil: 1 }
        },
        { new: true }
      );

      return user;
    } catch (error) {
      logger.error('Error actualizando último login:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Incrementar intentos de login fallidos
   */
  async incrementLoginAttempts(userId) {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.incLoginAttempts();
      }
      return user;
    } catch (error) {
      logger.error('Error incrementando intentos de login:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verificar si un usuario está bloqueado
   */
  async isUserLocked(userId) {
    try {
      const user = await User.findById(userId);
      return user ? user.isLocked : false;
    } catch (error) {
      logger.error('Error verificando bloqueo de usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Desbloquear usuario manualmente
   */
  async unlockUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $unset: {
            loginAttempts: 1,
            lockUntil: 1
          }
        },
        { new: true }
      );

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      logger.info(`Usuario desbloqueado: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Error desbloqueando usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Manejo centralizado de errores
   */
  handleError(error) {
    // Errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return new Error(`Error de validación: ${errors.join(', ')}`);
    }

    // Error de duplicado (email o username)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return new Error(`Ya existe un usuario con ese ${field}`);
    }

    // Error de cast (ID inválido)
    if (error.name === 'CastError') {
      return new Error('ID de usuario inválido');
    }

    // Otros errores
    return error;
  }
}

module.exports = UserRepository;