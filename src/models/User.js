/**
 * Modelo de Usuario
 * Implementa el patrón Active Record con métodos de instancia
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [30, 'El nombre de usuario no puede exceder 30 caracteres'],
    match: [/^[a-zA-Z0-9_]+$/, 'El nombre de usuario solo puede contener letras, números y guiones bajos']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Formato de email inválido'
    ]
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir password en queries por defecto
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'user'],
      message: 'El rol debe ser admin o user'
    },
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.__v;
      return ret;
    }
  }
});

userSchema.index({ email: 1, isActive: 1 });


// Índices para mejorar rendimiento
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual para verificar si la cuenta está bloqueada
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pre-save para hashear password
userSchema.pre('save', async function(next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified('password')) return next();

  try {
    // Hashear password con salt de 12 rounds
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware pre-save para convertir email a lowercase
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Método de instancia para comparar password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) {
      throw new Error('Password no disponible para comparación');
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error al comparar contraseñas');
  }
};

// Método de instancia para generar JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id,
    username: this.username,
    email: this.email,
    role: this.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'book-management-system',
    audience: 'book-management-users'
  });
};

// Método de instancia para incrementar intentos de login
userSchema.methods.incLoginAttempts = function() {
  // Si ya tenemos un tiempo de bloqueo y ha expirado, resetear
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  // Si llegamos al máximo de intentos y no estamos bloqueados, bloquear cuenta
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + lockTime
    };
  }

  return this.updateOne(updates);
};

// Método de instancia para actualizar último login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: { lastLogin: new Date() },
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Método estático para encontrar usuario por credenciales
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  }).select('+password').lean(false);

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Verificar si la cuenta está bloqueada
  if (user.isLocked) {
    throw new Error('Cuenta bloqueada temporalmente por múltiples intentos fallidos');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    // Incrementar intentos fallidos
    await user.incLoginAttempts();
    throw new Error('Credenciales inválidas');
  }

  // Login exitoso, actualizar último login
  await user.updateLastLogin();
  
  return user;
};

// Método estático para búsqueda avanzada
userSchema.statics.searchUsers = function(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    role,
    isActive
  } = options;

  const searchQuery = {};

  // Búsqueda por texto en username o email
  if (query) {
    searchQuery.$or = [
      { username: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
    ];
  }

  // Filtros adicionales
  if (role) searchQuery.role = role;
  if (typeof isActive === 'boolean') searchQuery.isActive = isActive;

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(searchQuery)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-loginAttempts -lockUntil');
};

// Método estático para obtener estadísticas de usuarios
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        adminUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
        },
        regularUsers: {
          $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    regularUsers: 0
  };
};

module.exports = mongoose.model('User', userSchema);