/**
 * Modelo de Libro
 * Implementa el patrón Active Record con métodos de instancia y estáticos
 */

const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    minlength: [1, 'El título debe tener al menos 1 caracter'],
    maxlength: [200, 'El título no puede exceder 200 caracteres'],
    index: true // Índice para búsquedas
  },
  autor: {
    type: String,
    required: [true, 'El autor es requerido'],
    trim: true,
    minlength: [1, 'El autor debe tener al menos 1 caracter'],
    maxlength: [100, 'El autor no puede exceder 100 caracteres'],
    index: true // Índice para búsquedas
  },
  anoPublicacion: {
    type: Number,
    required: [true, 'El año de publicación es requerido'],
    min: [1000, 'El año de publicación debe ser mayor a 1000'],
    max: [new Date().getFullYear(), 'El año de publicación no puede ser futuro'],
    validate: {
      validator: Number.isInteger,
      message: 'El año de publicación debe ser un número entero'
    }
  },
  estado: {
    type: String,
    enum: {
      values: ['disponible', 'reservado', 'prestado', 'mantenimiento'],
      message: 'Estado debe ser: disponible, reservado, prestado o mantenimiento'
    },
    default: 'disponible',
    index: true // Índice para filtros
  },
  isbn: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Permite múltiples documentos con valor null
    validate: {
      validator: function(isbn) {
        if (!isbn) return true; // ISBN es opcional
        // Validar formato ISBN-10 o ISBN-13
        const isbn10Regex = /^(?:\d{9}[\dX]|\d{10})$/;
        const isbn13Regex = /^(?:97[89]\d{10})$/;
        const cleanIsbn = isbn.replace(/[-\s]/g, '');
        return isbn10Regex.test(cleanIsbn) || isbn13Regex.test(cleanIsbn);
      },
      message: 'Formato de ISBN inválido (debe ser ISBN-10 o ISBN-13)'
    }
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  genero: {
    type: [String],
    validate: {
      validator: function(generos) {
        return generos.length <= 5;
      },
      message: 'No puede tener más de 5 géneros'
    }
  },
  editorial: {
    type: String,
    trim: true,
    maxlength: [100, 'El nombre de la editorial no puede exceder 100 caracteres']
  },
  idioma: {
    type: String,
    trim: true,
    default: 'Español',
    maxlength: [50, 'El idioma no puede exceder 50 caracteres']
  },
  numeroPaginas: {
    type: Number,
    min: [1, 'El número de páginas debe ser mayor a 0'],
    validate: {
      validator: Number.isInteger,
      message: 'El número de páginas debe ser un número entero'
    }
  },
  fechaAdquisicion: {
    type: Date,
    default: Date.now
  },
  precio: {
    type: Number,
    min: [0, 'El precio no puede ser negativo'],
    validate: {
      validator: function(precio) {
        if (precio === undefined || precio === null) return true;
        return Number.isFinite(precio) && precio >= 0;
      },
      message: 'El precio debe ser un número válido mayor o igual a 0'
    }
  },
  ubicacion: {
    estanteria: {
      type: String,
      trim: true,
      maxlength: [10, 'La estantería no puede exceder 10 caracteres']
    },
    seccion: {
      type: String,
      trim: true,
      maxlength: [10, 'La sección no puede exceder 10 caracteres']
    },
    nivel: {
      type: Number,
      min: [1, 'El nivel debe ser mayor a 0']
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario creador es requerido']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reservadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaReserva: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices compuestos para optimizar búsquedas
bookSchema.index({ titulo: 'text', autor: 'text', descripcion: 'text' });
bookSchema.index({ autor: 1, anoPublicacion: -1 });
bookSchema.index({ estado: 1, createdAt: -1 });
bookSchema.index({ genero: 1 });
bookSchema.index({ anoPublicacion: 1 });

// Virtual para obtener la edad del libro
bookSchema.virtual('antiguedad').get(function() {
  return new Date().getFullYear() - this.anoPublicacion;
});

// Virtual para verificar si está disponible
bookSchema.virtual('estaDisponible').get(function() {
  return this.estado === 'disponible';
});

// Virtual para obtener información completa de ubicación
bookSchema.virtual('ubicacionCompleta').get(function() {
  if (!this.ubicacion || !this.ubicacion.estanteria) {
    return 'Sin ubicación asignada';
  }
  
  let ubicacion = `Estantería: ${this.ubicacion.estanteria}`;
  if (this.ubicacion.seccion) ubicacion += `, Sección: ${this.ubicacion.seccion}`;
  if (this.ubicacion.nivel) ubicacion += `, Nivel: ${this.ubicacion.nivel}`;
  
  return ubicacion;
});

// Middleware pre-save para limpiar ISBN
bookSchema.pre('save', function(next) {
  if (this.isbn) {
    this.isbn = this.isbn.replace(/[-\s]/g, '');
  }
  next();
});

// Middleware pre-save para validar reserva
bookSchema.pre('save', function(next) {
  // Si el estado es reservado, debe tener reservadoPor y fechaReserva
  if (this.estado === 'reservado') {
    if (!this.reservadoPor) {
      return next(new Error('Para reservar un libro debe especificar quién lo reserva'));
    }
    if (!this.fechaReserva) {
      this.fechaReserva = new Date();
    }
  } else {
    // Si no está reservado, limpiar campos de reserva
    this.reservadoPor = undefined;
    this.fechaReserva = undefined;
  }
  next();
});

// Método de instancia para reservar libro
bookSchema.methods.reservar = async function(userId) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      if (this.estado !== 'disponible') {
        throw new Error('El libro no está disponible para reserva');
      }

      this.estado = 'reservado';
      this.reservadoPor = userId;
      this.fechaReserva = new Date();
      
      await this.save({ session });
    });
  } finally {
    await session.endSession();
  }
  
  return this;
};

// Método de instancia para liberar reserva
bookSchema.methods.liberarReserva = async function() {
  if (this.estado !== 'reservado') {
    throw new Error('El libro no está reservado');
  }

  this.estado = 'disponible';
  this.reservadoPor = undefined;
  this.fechaReserva = undefined;
  
  return await this.save();
};

// Método de instancia para cambiar estado
bookSchema.methods.cambiarEstado = async function(nuevoEstado, userId) {
  const estadosValidos = ['disponible', 'reservado', 'prestado', 'mantenimiento'];
  
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error('Estado inválido');
  }

  const estadoAnterior = this.estado;
  this.estado = nuevoEstado;
  this.updatedBy = userId;

  // Lógica específica según el estado
  if (nuevoEstado === 'disponible') {
    this.reservadoPor = undefined;
    this.fechaReserva = undefined;
  }

  await this.save();
  
  return {
    libro: this,
    estadoAnterior,
    estadoNuevo: nuevoEstado
  };
};

// Método estático para búsqueda avanzada
bookSchema.statics.buscarLibros = function(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    estado,
    autor,
    genero,
    anoDesde,
    anoHasta
  } = options;

  const searchQuery = {};

  // Búsqueda por texto en título, autor o descripción
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Filtros específicos
  if (estado) searchQuery.estado = estado;
  if (autor) searchQuery.autor = { $regex: autor, $options: 'i' };
  if (genero) searchQuery.genero = { $in: [genero] };
  
  // Filtro por rango de años
  if (anoDesde || anoHasta) {
    searchQuery.anoPublicacion = {};
    if (anoDesde) searchQuery.anoPublicacion.$gte = parseInt(anoDesde);
    if (anoHasta) searchQuery.anoPublicacion.$lte = parseInt(anoHasta);
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(searchQuery)
    .populate('createdBy', 'username email')
    .populate('updatedBy', 'username email')
    .populate('reservadoPor', 'username email')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Método estático para obtener estadísticas
bookSchema.statics.obtenerEstadisticas = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalLibros: { $sum: 1 },
        disponibles: {
          $sum: { $cond: [{ $eq: ['$estado', 'disponible'] }, 1, 0] }
        },
        reservados: {
          $sum: { $cond: [{ $eq: ['$estado', 'reservado'] }, 1, 0] }
        },
        prestados: {
          $sum: { $cond: [{ $eq: ['$estado', 'prestado'] }, 1, 0] }
        },
        mantenimiento: {
          $sum: { $cond: [{ $eq: ['$estado', 'mantenimiento'] }, 1, 0] }
        },
        anoMasAntiguo: { $min: '$anoPublicacion' },
        anoMasReciente: { $max: '$anoPublicacion' },
        promedioAno: { $avg: '$anoPublicacion' }
      }
    }
  ]);

  return stats[0] || {
    totalLibros: 0,
    disponibles: 0,
    reservados: 0,
    prestados: 0,
    mantenimiento: 0,
    anoMasAntiguo: null,
    anoMasReciente: null,
    promedioAno: null
  };
};

// Método estático para obtener autores más populares
bookSchema.statics.obtenerAutoresPopulares = async function(limit = 10) {
  return await this.aggregate([
    {
      $group: {
        _id: '$autor',
        cantidadLibros: { $sum: 1 },
        libros: { $push: { titulo: '$titulo', estado: '$estado' } }
      }
    },
    { $sort: { cantidadLibros: -1 } },
    { $limit: limit }
  ]);
};

// Método estático para obtener géneros más comunes
bookSchema.statics.obtenerGenerosPopulares = async function() {
  return await this.aggregate([
    { $unwind: '$genero' },
    {
      $group: {
        _id: '$genero',
        cantidadLibros: { $sum: 1 }
      }
    },
    { $sort: { cantidadLibros: -1 } }
  ]);
};

module.exports = mongoose.model('Book', bookSchema);