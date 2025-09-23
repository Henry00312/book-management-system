/**
 * Servicio de Libros
 * Implementa el patrón Service Layer para encapsular la lógica de negocio de libros
 */

const BookRepository = require('../repositories/BookRepository');
const UserRepository = require('../repositories/UserRepository');
const logger = require('../utils/logger');
const { createSuccessResponse, createErrorResponse } = require('../utils/response');

class BookService {
  constructor() {
    // Inyección de dependencias - Patrón Dependency Injection
    this.bookRepository = new BookRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Crear un nuevo libro
   */
  async createBook(bookData, userId) {
    try {
      // Validaciones de negocio
      await this.validateBookData(bookData);

      // Verificar que el usuario existe y está activo
      const user = await this.userRepository.findById(userId);
      if (!user || !user.isActive) {
        throw new Error('Usuario no válido para crear libros');
      }

      // Verificar ISBN único si se proporciona
      if (bookData.isbn) {
        const existingBook = await this.bookRepository.findByISBN(bookData.isbn);
        if (existingBook) {
          throw new Error('Ya existe un libro con ese ISBN');
        }
      }

      // Crear libro
      const book = await this.bookRepository.create(bookData, userId);

      logger.info(`Libro creado: "${book.titulo}" por ${user.username}`);

      return createSuccessResponse({
        message: 'Libro creado exitosamente',
        book
      });

    } catch (error) {
      logger.error('Error creando libro:', error);
      throw error;
    }
  }

  /**
   * Obtener libro por ID
   */
async getBookById(bookId) {
  try {
    const book = await this.bookRepository.findById(bookId)
      .populate('createdBy', 'username email')
      .populate('reservadoPor', 'username email');
    
    if (!book) {
      throw new Error('Libro no encontrado');
    }

    return createSuccessResponse({ book });
  } catch (error) {
    logger.error('Error obteniendo libro:', error);
    throw error;
  }
}

  /**
   * Buscar libros con criterios avanzados
   */
  async searchBooks(searchQuery, options = {}) {
    try {
      const result = await this.bookRepository.search(searchQuery, options);

      return createSuccessResponse({
        message: `${result.books.length} libros encontrados`,
        books: result.books,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error buscando libros:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los libros con paginación
   */
  async getAllBooks(options = {}) {
    try {
      const result = await this.bookRepository.findAll(options);

      return createSuccessResponse({
        message: `${result.books.length} libros obtenidos`,
        books: result.books,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error obteniendo todos los libros:', error);
      throw error;
    }
  }

  /**
   * Obtener libros por estado
   */
  async getBooksByStatus(estado, options = {}) {
    try {
      // Validar estado
      const estadosValidos = ['disponible', 'reservado', 'prestado', 'mantenimiento'];
      if (!estadosValidos.includes(estado)) {
        throw new Error('Estado de libro inválido');
      }

      const result = await this.bookRepository.findByStatus(estado, options);

      return createSuccessResponse({
        message: `${result.books.length} libros con estado "${estado}" encontrados`,
        books: result.books,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error obteniendo libros por estado:', error);
      throw error;
    }
  }

  /**
   * Actualizar libro
   */
  async updateBook(bookId, updateData, userId) {
    try {
      // Verificar que el libro existe
      const existingBook = await this.bookRepository.findById(bookId);
      if (!existingBook) {
        throw new Error('Libro no encontrado');
      }

      // Verificar autorización (solo el creador o admin pueden editar)
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no válido');
      }

      const canEdit = user.role === 'admin' || 
                     existingBook.createdBy._id.toString() === userId.toString();
      
      if (!canEdit) {
        throw new Error('No tienes permisos para editar este libro');
      }

      // Validar datos de actualización
      if (Object.keys(updateData).length === 0) {
        throw new Error('No se proporcionaron datos para actualizar');
      }

      // Validaciones específicas para campos que se están actualizando
      this.validatePartialBookData(updateData);

      // Verificar ISBN único si se está actualizando
      if (updateData.isbn && updateData.isbn !== existingBook.isbn) {
        const bookWithISBN = await this.bookRepository.findByISBN(updateData.isbn);
        if (bookWithISBN && bookWithISBN._id.toString() !== bookId) {
          throw new Error('Ya existe otro libro con ese ISBN');
        }
      }

      // Actualizar libro
      const updatedBook = await this.bookRepository.update(bookId, updateData, userId);

      logger.info(`Libro actualizado: "${updatedBook.titulo}" por ${user.username}`);

      return createSuccessResponse({
        message: 'Libro actualizado exitosamente',
        book: updatedBook
      });

    } catch (error) {
      logger.error('Error actualizando libro:', error);
      throw error;
    }
  }

  /**
   * Eliminar libro
   */
  async deleteBook(bookId, userId) {
    try {
      // Verificar que el libro existe
      const existingBook = await this.bookRepository.findById(bookId);
      if (!existingBook) {
        throw new Error('Libro no encontrado');
      }

      // Verificar autorización
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no válido');
      }

      const canDelete = user.role === 'admin' || 
                       existingBook.createdBy._id.toString() === userId.toString();
      
      if (!canDelete) {
        throw new Error('No tienes permisos para eliminar este libro');
      }

      // Verificar que el libro no esté prestado
      if (existingBook.estado === 'prestado') {
        throw new Error('No se puede eliminar un libro que está prestado');
      }

      // Eliminar libro
      await this.bookRepository.delete(bookId);

      logger.info(`Libro eliminado: "${existingBook.titulo}" por ${user.username}`);

      return createSuccessResponse({
        message: 'Libro eliminado exitosamente'
      });

    } catch (error) {
      logger.error('Error eliminando libro:', error);
      throw error;
    }
  }

  /**
   * Reservar libro
   */
  async reserveBook(bookId, userId) {
    try {
      // Verificar que el usuario existe
      const user = await this.userRepository.findById(userId);
      if (!user || !user.isActive) {
        throw new Error('Usuario no válido para reservar libros');
      }

      // Verificar disponibilidad del libro
      const availability = await this.bookRepository.checkAvailability(bookId);
      if (!availability.available) {
        throw new Error(`El libro no está disponible: ${availability.reason || availability.status}`);
      }

      // Verificar que el usuario no tenga demasiadas reservas
      const userReservations = await this.bookRepository.findReservedByUser(userId);
      const maxReservations = user.role === 'admin' ? 10 : 3;
      
      if (userReservations.length >= maxReservations) {
        throw new Error(`Has alcanzado el límite máximo de ${maxReservations} reservas`);
      }

      // Reservar libro
      const reservedBook = await this.bookRepository.reserveBook(bookId, userId);

      logger.info(`Libro reservado: "${reservedBook.titulo}" por ${user.username}`);

      return createSuccessResponse({
        message: 'Libro reservado exitosamente',
        book: reservedBook
      });

    } catch (error) {
      logger.error('Error reservando libro:', error);
      throw error;
    }
  }

  /**
   * Liberar reserva de libro
   */
  async releaseReservation(bookId, userId) {
    try {
      // Verificar que el libro existe y está reservado
      const book = await this.bookRepository.findById(bookId);
      if (!book) {
        throw new Error('Libro no encontrado');
      }

      if (book.estado !== 'reservado') {
        throw new Error('El libro no está reservado');
      }

      // Verificar autorización (solo quien reservó o admin pueden liberar)
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no válido');
      }

      const canRelease = user.role === 'admin' || 
                        book.reservadoPor._id.toString() === userId.toString();
      
      if (!canRelease) {
        throw new Error('No tienes permisos para liberar esta reserva');
      }

      // Liberar reserva
      const releasedBook = await this.bookRepository.releaseReservation(bookId);

      logger.info(`Reserva liberada: "${releasedBook.titulo}" por ${user.username}`);

      return createSuccessResponse({
        message: 'Reserva liberada exitosamente',
        book: releasedBook
      });

    } catch (error) {
      logger.error('Error liberando reserva:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado de libro
   */
  async changeBookStatus(bookId, newStatus, userId) {
    try {
      // Verificar autorización (solo admin puede cambiar estados)
      const user = await this.userRepository.findById(userId);
      if (!user || user.role !== 'admin') {
        throw new Error('Solo los administradores pueden cambiar el estado de los libros');
      }

      // Cambiar estado
      const result = await this.bookRepository.changeStatus(bookId, newStatus, userId);

      logger.info(`Estado cambiado: "${result.libro.titulo}" de ${result.estadoAnterior} a ${result.estadoNuevo} por ${user.username}`);

      return createSuccessResponse({
        message: `Estado del libro cambiado exitosamente de "${result.estadoAnterior}" a "${result.estadoNuevo}"`,
        book: result.libro,
        previousStatus: result.estadoAnterior,
        newStatus: result.estadoNuevo
      });

    } catch (error) {
      logger.error('Error cambiando estado de libro:', error);
      throw error;
    }
  }

  /**
   * Obtener libros creados por un usuario
   */
  async getBooksByCreator(userId, options = {}) {
    try {
      const result = await this.bookRepository.findByCreator(userId, options);

      return createSuccessResponse({
        message: `${result.books.length} libros encontrados`,
        books: result.books,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Error obteniendo libros por creador:', error);
      throw error;
    }
  }

  /**
   * Obtener libros reservados por un usuario
   */
  async getUserReservations(userId) {
    try {
      const books = await this.bookRepository.findReservedByUser(userId);

      return createSuccessResponse({
        message: `${books.length} libros reservados encontrados`,
        books
      });

    } catch (error) {
      logger.error('Error obteniendo reservas de usuario:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de libros
   */
  async getBookStats() {
    try {
      const stats = await this.bookRepository.getStats();
      const popularAuthors = await this.bookRepository.getPopularAuthors(5);
      const popularGenres = await this.bookRepository.getPopularGenres();

      return createSuccessResponse({
        statistics: stats,
        popularAuthors,
        popularGenres: popularGenres.slice(0, 10)
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de libros:', error);
      throw error;
    }
  }

  /**
   * Buscar libros por autor
   */
  async getBooksByAuthor(autor, options = {}) {
    try {
      const books = await this.bookRepository.findByAuthor(autor, options);

      return createSuccessResponse({
        message: `${books.length} libros del autor "${autor}" encontrados`,
        books
      });

    } catch (error) {
      logger.error('Error buscando libros por autor:', error);
      throw error;
    }
  }

  /**
   * Validaciones privadas
   */
  validateBookData(bookData) {
    const { titulo, autor, anoPublicacion, estado, isbn } = bookData;

    // Campos requeridos
    if (!titulo || !autor || !anoPublicacion) {
      throw new Error('Título, autor y año de publicación son requeridos');
    }

    // Validaciones específicas
    this.validateTitulo(titulo);
    this.validateAutor(autor);
    this.validateAnoPublicacion(anoPublicacion);
    
    if (estado) this.validateEstado(estado);
    if (isbn) this.validateISBN(isbn);
  }

  validatePartialBookData(updateData) {
    // Validar solo los campos que se están actualizando
    if (updateData.titulo !== undefined) this.validateTitulo(updateData.titulo);
    if (updateData.autor !== undefined) this.validateAutor(updateData.autor);
    if (updateData.anoPublicacion !== undefined) this.validateAnoPublicacion(updateData.anoPublicacion);
    if (updateData.estado !== undefined) this.validateEstado(updateData.estado);
    if (updateData.isbn !== undefined) this.validateISBN(updateData.isbn);
  }

  validateTitulo(titulo) {
    if (typeof titulo !== 'string' || titulo.trim().length === 0) {
      throw new Error('El título es requerido y debe ser un texto válido');
    }
    if (titulo.length > 200) {
      throw new Error('El título no puede exceder 200 caracteres');
    }
  }

  validateAutor(autor) {
    if (typeof autor !== 'string' || autor.trim().length === 0) {
      throw new Error('El autor es requerido y debe ser un texto válido');
    }
    if (autor.length > 100) {
      throw new Error('El autor no puede exceder 100 caracteres');
    }
  }

  validateAnoPublicacion(ano) {
    const currentYear = new Date().getFullYear();
    
    if (!Number.isInteger(ano)) {
      throw new Error('El año de publicación debe ser un número entero');
    }
    
    if (ano < 1000 || ano > currentYear) {
      throw new Error(`El año de publicación debe estar entre 1000 y ${currentYear}`);
    }
  }

  validateEstado(estado) {
    const estadosValidos = ['disponible', 'reservado', 'prestado', 'mantenimiento'];
    if (!estadosValidos.includes(estado)) {
      throw new Error('Estado debe ser: disponible, reservado, prestado o mantenimiento');
    }
  }

  validateISBN(isbn) {
    if (isbn && typeof isbn === 'string') {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      const isbn10Regex = /^(?:\d{9}[\dX]|\d{10})$/;
      const isbn13Regex = /^(?:97[89]\d{10})$/;
      
      if (!isbn10Regex.test(cleanIsbn) && !isbn13Regex.test(cleanIsbn)) {
        throw new Error('Formato de ISBN inválido (debe ser ISBN-10 o ISBN-13)');
      }
    }
  }
}

module.exports = BookService;