/**
 * Repositorio de Libros
 * Implementa el patrón Repository para abstraer el acceso a datos de libros
 */

const Book = require('../models/Book');
const logger = require('../utils/logger');

class BookRepository {
  /**
   * Crear un nuevo libro
   */
  async create(bookData, userId) {
    try {
      const book = new Book({
        ...bookData,
        createdBy: userId
      });
      
      await book.save();
      
      // Poblar referencias para retornar datos completos
      await book.populate('createdBy', 'username email');
      
      logger.info(`Libro creado: "${book.titulo}" por ${book.createdBy.username}`);
      return book;
    } catch (error) {
      logger.error('Error creando libro:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libro por ID
   */
  async findById(bookId) {
    try {
      const book = await Book.findById(bookId)
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .populate('reservadoPor', 'username email');
      
      return book;
    } catch (error) {
      logger.error('Error buscando libro por ID:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libro por ISBN
   */
  async findByISBN(isbn) {
    try {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      const book = await Book.findOne({ isbn: cleanIsbn })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .populate('reservadoPor', 'username email');
      
      return book;
    } catch (error) {
      logger.error('Error buscando libro por ISBN:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros con criterios avanzados
   */
  async search(searchQuery, options = {}) {
    try {
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

      const query = {};

      // Búsqueda por texto en título, autor o descripción
      if (searchQuery && searchQuery.trim()) {
        query.$or = [
          { titulo: { $regex: searchQuery, $options: 'i' } },
          { autor: { $regex: searchQuery, $options: 'i' } },
          { descripcion: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      // Filtros específicos
      if (estado) query.estado = estado;
      if (autor) query.autor = { $regex: autor, $options: 'i' };
      if (genero) query.genero = { $in: [genero] };
      
      // Filtro por rango de años
      if (anoDesde || anoHasta) {
        query.anoPublicacion = {};
        if (anoDesde) query.anoPublicacion.$gte = parseInt(anoDesde);
        if (anoHasta) query.anoPublicacion.$lte = parseInt(anoHasta);
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const books = await Book.find(query)
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .populate('reservadoPor', 'username email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Book.countDocuments(query);

      return {
        books,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalBooks: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error buscando libros:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener todos los libros con paginación
   */
  async findAll(options = {}) {
    try {
      return await this.search('', options);
    } catch (error) {
      logger.error('Error obteniendo todos los libros:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros por estado
   */
  async findByStatus(estado, options = {}) {
    try {
      return await this.search('', { ...options, estado });
    } catch (error) {
      logger.error('Error buscando libros por estado:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros por autor
   */
  async findByAuthor(autor, options = {}) {
    try {
      const books = await Book.find({ 
        autor: { $regex: autor, $options: 'i' } 
      })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .populate('reservadoPor', 'username email')
        .sort({ titulo: 1 });

      return books;
    } catch (error) {
      logger.error('Error buscando libros por autor:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros por género
   */
  async findByGenre(genero, options = {}) {
    try {
      return await this.search('', { ...options, genero });
    } catch (error) {
      logger.error('Error buscando libros por género:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros por año de publicación
   */
  async findByYear(ano, options = {}) {
    try {
      const books = await Book.find({ anoPublicacion: ano })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .populate('reservadoPor', 'username email')
        .sort({ titulo: 1 });

      return books;
    } catch (error) {
      logger.error('Error buscando libros por año:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Actualizar libro
   */
  async update(bookId, updateData, userId) {
    try {
      const book = await Book.findByIdAndUpdate(
        bookId,
        { 
          ...updateData, 
          updatedBy: userId,
          updatedAt: new Date()
        },
        { 
          new: true, 
          runValidators: true 
        }
      )
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .populate('reservadoPor', 'username email');

      if (!book) {
        throw new Error('Libro no encontrado');
      }

      logger.info(`Libro actualizado: "${book.titulo}"`);
      return book;
    } catch (error) {
      logger.error('Error actualizando libro:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Eliminar libro
   */
  async delete(bookId) {
    try {
      const book = await Book.findByIdAndDelete(bookId);
      
      if (!book) {
        throw new Error('Libro no encontrado');
      }

      logger.info(`Libro eliminado: "${book.titulo}"`);
      return book;
    } catch (error) {
      logger.error('Error eliminando libro:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reservar libro
   */
  async reserveBook(bookId, userId) {
    try {
      const book = await Book.findById(bookId);
      
      if (!book) {
        throw new Error('Libro no encontrado');
      }

      const reservedBook = await book.reservar(userId);
      await reservedBook.populate('reservadoPor', 'username email');
      
      logger.info(`Libro reservado: "${book.titulo}" por usuario ${userId}`);
      return reservedBook;
    } catch (error) {
      logger.error('Error reservando libro:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Liberar reserva de libro
   */
  async releaseReservation(bookId) {
    try {
      const book = await Book.findById(bookId);
      
      if (!book) {
        throw new Error('Libro no encontrado');
      }

      const releasedBook = await book.liberarReserva();
      
      logger.info(`Reserva liberada: "${book.titulo}"`);
      return releasedBook;
    } catch (error) {
      logger.error('Error liberando reserva:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cambiar estado de libro
   */
  async changeStatus(bookId, newStatus, userId) {
    try {
      const book = await Book.findById(bookId);
      
      if (!book) {
        throw new Error('Libro no encontrado');
      }

      const result = await book.cambiarEstado(newStatus, userId);
      await result.libro.populate('updatedBy', 'username email');
      
      logger.info(`Estado cambiado: "${book.titulo}" de ${result.estadoAnterior} a ${result.estadoNuevo}`);
      return result;
    } catch (error) {
      logger.error('Error cambiando estado de libro:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros creados por un usuario
   */
  async findByCreator(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const books = await Book.find({ createdBy: userId })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Book.countDocuments({ createdBy: userId });

      return {
        books,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalBooks: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error buscando libros por creador:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Buscar libros reservados por un usuario
   */
  async findReservedByUser(userId) {
    try {
      const books = await Book.find({ 
        reservadoPor: userId,
        estado: 'reservado'
      })
        .populate('createdBy', 'username email')
        .sort({ fechaReserva: -1 });

      return books;
    } catch (error) {
      logger.error('Error buscando libros reservados por usuario:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener estadísticas de libros
   */
  async getStats() {
    try {
      return await Book.obtenerEstadisticas();
    } catch (error) {
      logger.error('Error obteniendo estadísticas de libros:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener autores más populares
   */
  async getPopularAuthors(limit = 10) {
    try {
      return await Book.obtenerAutoresPopulares(limit);
    } catch (error) {
      logger.error('Error obteniendo autores populares:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Obtener géneros más comunes
   */
  async getPopularGenres() {
    try {
      return await Book.obtenerGenerosPopulares();
    } catch (error) {
      logger.error('Error obteniendo géneros populares:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Contar libros por criterios
   */
  async count(criteria = {}) {
    try {
      return await Book.countDocuments(criteria);
    } catch (error) {
      logger.error('Error contando libros:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verificar disponibilidad de libro
   */
  async checkAvailability(bookId) {
    try {
      const book = await Book.findById(bookId);
      
      if (!book) {
        return { available: false, reason: 'Libro no encontrado' };
      }

      return {
        available: book.estaDisponible,
        status: book.estado,
        reservedBy: book.reservadoPor,
        reservationDate: book.fechaReserva
      };
    } catch (error) {
      logger.error('Error verificando disponibilidad:', error);
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

    // Error de duplicado (ISBN)
    if (error.code === 11000) {
      return new Error('Ya existe un libro con ese ISBN');
    }

    // Error de cast (ID inválido)
    if (error.name === 'CastError') {
      return new Error('ID de libro inválido');
    }

    // Otros errores
    return error;
  }
}

module.exports = BookRepository;