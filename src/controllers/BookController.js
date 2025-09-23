/**
 * Controlador de Libros
 * Implementa el patrón MVC - Capa de Controlador
 * Maneja las peticiones HTTP relacionadas con libros
 */

const BookService = require('../services/BookService');
const { createErrorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class BookController {
  constructor() {
    // Inyección de dependencias
    this.bookService = new BookService();
    
    // Bind de métodos para mantener contexto
    this.getAllBooks = this.getAllBooks.bind(this);
    this.getBookById = this.getBookById.bind(this);
    this.searchBooks = this.searchBooks.bind(this);
    this.createBook = this.createBook.bind(this);
    this.updateBook = this.updateBook.bind(this);
    this.deleteBook = this.deleteBook.bind(this);
    this.reserveBook = this.reserveBook.bind(this);
    this.releaseReservation = this.releaseReservation.bind(this);
    this.changeBookStatus = this.changeBookStatus.bind(this);
    this.getBooksByStatus = this.getBooksByStatus.bind(this);
    this.getMyBooks = this.getMyBooks.bind(this);
    this.getMyReservations = this.getMyReservations.bind(this);
    this.getBookStats = this.getBookStats.bind(this);
    this.getBooksByAuthor = this.getBooksByAuthor.bind(this);
    this.checkAvailability = this.checkAvailability.bind(this);
  }

  /**
   * Obtener todos los libros con paginación y filtros
   * GET /api/books
   */
  async getAllBooks(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        estado,
        autor,
        genero,
        anoDesde,
        anoHasta
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        estado,
        autor,
        genero,
        anoDesde,
        anoHasta
      };

      let result;
      if (search && search.trim()) {
        // Si hay término de búsqueda, usar searchBooks
        result = await this.bookService.searchBooks(search.trim(), options);
      } else {
        // Si no hay búsqueda, obtener todos
        result = await this.bookService.getAllBooks(options);
      }

      logger.info(`Consulta de libros realizada`, {
        page,
        limit,
        search: search || 'ninguna',
        totalFound: result.books?.length || 0,
        user: req.user?.email || 'anónimo'
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo libros:', {
        error: error.message,
        query: req.query,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Obtener libro por ID
   * GET /api/books/:id
   */
  async getBookById(req, res, next) {
    try {
      const { id } = req.params;

      const result = await this.bookService.getBookById(id);

      logger.info(`Libro consultado: ${id}`, {
        user: req.user?.email || 'anónimo'
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo libro por ID:', {
        error: error.message,
        bookId: req.params.id,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Buscar libros (endpoint específico de búsqueda)
   * POST /api/books/search
   */
  async searchBooks(req, res, next) {
    try {
      const { query, options = {} } = req.body;

      const result = await this.bookService.searchBooks(query, options);

      logger.info(`Búsqueda realizada: "${query}"`, {
        resultsFound: result.books?.length || 0,
        user: req.user?.email || 'anónimo'
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error en búsqueda de libros:', {
        error: error.message,
        searchQuery: req.body.query,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Crear nuevo libro (requiere autenticación)
   * POST /api/books
   */
  async createBook(req, res, next) {
    try {
      const bookData = req.body;
      const userId = req.user.id;

      const result = await this.bookService.createBook(bookData, userId);

      logger.info(`Libro creado: "${bookData.titulo}"`, {
        createdBy: req.user.email,
        bookId: result.book._id
      });

      res.status(201).json(result);

    } catch (error) {
      logger.error('Error creando libro:', {
        error: error.message,
        bookData: { titulo: req.body.titulo, autor: req.body.autor },
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Actualizar libro (requiere autenticación y autorización)
   * PUT /api/books/:id
   */
  async updateBook(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const result = await this.bookService.updateBook(id, updateData, userId);

      logger.info(`Libro actualizado: ${id}`, {
        updatedBy: req.user.email,
        fieldsUpdated: Object.keys(updateData)
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error actualizando libro:', {
        error: error.message,
        bookId: req.params.id,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Eliminar libro (requiere autenticación y autorización)
   * DELETE /api/books/:id
   */
  async deleteBook(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await this.bookService.deleteBook(id, userId);

      logger.info(`Libro eliminado: ${id}`, {
        deletedBy: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error eliminando libro:', {
        error: error.message,
        bookId: req.params.id,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Reservar libro (requiere autenticación)
   * POST /api/books/:id/reserve
   */
  async reserveBook(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await this.bookService.reserveBook(id, userId);

      logger.info(`Libro reservado: ${id}`, {
        reservedBy: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error reservando libro:', {
        error: error.message,
        bookId: req.params.id,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Liberar reserva de libro (requiere autenticación)
   * DELETE /api/books/:id/reserve
   */
  async releaseReservation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await this.bookService.releaseReservation(id, userId);

      logger.info(`Reserva liberada: ${id}`, {
        releasedBy: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error liberando reserva:', {
        error: error.message,
        bookId: req.params.id,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Cambiar estado de libro (solo administradores)
   * PATCH /api/books/:id/status
   */
  async changeBookStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      if (!status) {
        return res.status(400).json(
          createErrorResponse('El nuevo estado es requerido')
        );
      }

      const result = await this.bookService.changeBookStatus(id, status, userId);

      logger.info(`Estado de libro cambiado: ${id}`, {
        newStatus: status,
        changedBy: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error cambiando estado de libro:', {
        error: error.message,
        bookId: req.params.id,
        newStatus: req.body.status,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Obtener libros por estado
   * GET /api/books/status/:status
   */
  async getBooksByStatus(req, res, next) {
    try {
      const { status } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await this.bookService.getBooksByStatus(status, options);

      logger.info(`Consulta de libros por estado: ${status}`, {
        found: result.books?.length || 0,
        user: req.user?.email || 'anónimo'
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo libros por estado:', {
        error: error.message,
        status: req.params.status,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Obtener libros creados por el usuario autenticado
   * GET /api/books/my-books
   */
  async getMyBooks(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await this.bookService.getBooksByCreator(userId, options);

      logger.info(`Consulta de libros propios`, {
        found: result.books?.length || 0,
        user: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo libros propios:', {
        error: error.message,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Obtener reservas del usuario autenticado
   * GET /api/books/my-reservations
   */
  async getMyReservations(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await this.bookService.getUserReservations(userId);

      logger.info(`Consulta de reservas propias`, {
        found: result.books?.length || 0,
        user: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo reservas propias:', {
        error: error.message,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Obtener estadísticas de libros (solo administradores)
   * GET /api/books/stats
   */
  async getBookStats(req, res, next) {
    try {
      // Verificar si es administrador
      if (req.user.role !== 'admin') {
        return res.status(403).json(
          createErrorResponse('Solo los administradores pueden ver estadísticas')
        );
      }

      const result = await this.bookService.getBookStats();

      logger.info('Estadísticas de libros consultadas', {
        by: req.user.email
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo estadísticas:', {
        error: error.message,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Obtener libros por autor
   * GET /api/books/author/:author
   */
  async getBooksByAuthor(req, res, next) {
    try {
      const { author } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'titulo',
        sortOrder = 'asc'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await this.bookService.getBooksByAuthor(author, options);

      logger.info(`Consulta de libros por autor: ${author}`, {
        found: result.books?.length || 0,
        user: req.user?.email || 'anónimo'
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error obteniendo libros por autor:', {
        error: error.message,
        author: req.params.author,
        user: req.user?.email
      });

      next(error);
    }
  }

  /**
   * Endpoint de información sobre disponibilidad
   * GET /api/books/:id/availability
   */
  async checkAvailability(req, res, next) {
    try {
      const { id } = req.params;

      // Obtener libro para verificar disponibilidad
      const result = await this.bookService.getBookById(id);
      const book = result.book;

      const availability = {
        bookId: book._id,
        title: book.titulo,
        available: book.estaDisponible,
        status: book.estado,
        reservedBy: book.reservadoPor || null,
        reservationDate: book.fechaReserva || null
      };

      res.status(200).json({
        success: true,
        availability
      });

    } catch (error) {
      logger.error('Error verificando disponibilidad:', {
        error: error.message,
        bookId: req.params.id,
        user: req.user?.email || 'anónimo'
      });

      next(error);
    }
  }
}

module.exports = BookController;