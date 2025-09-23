/**
 * Rutas de Libros
 * Implementa el patrón Router para organización de rutas de libros
 * Define todos los endpoints relacionados con gestión de libros
 * 
 * ORDEN CRÍTICO: Las rutas específicas DEBEN ir ANTES que las rutas con parámetros dinámicos
 */

const express = require('express');
const BookController = require('../controllers/BookController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateBook, validateBookUpdate, validateBookStatus, validatePagination } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Crear router
const router = express.Router();

// Crear instancia del controlador
const bookController = new BookController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required:
 *         - titulo
 *         - autor
 *         - anoPublicacion
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del libro
 *         titulo:
 *           type: string
 *           description: Título del libro
 *           minLength: 1
 *           maxLength: 200
 *           example: "Cien años de soledad"
 *         autor:
 *           type: string
 *           description: Autor del libro
 *           minLength: 1
 *           maxLength: 100
 *           example: "Gabriel García Márquez"
 *         anoPublicacion:
 *           type: number
 *           description: Año de publicación
 *           minimum: 1000
 *           maximum: 2025
 *           example: 1967
 *         estado:
 *           type: string
 *           enum: [disponible, reservado, prestado, mantenimiento]
 *           description: Estado actual del libro
 *           default: disponible
 *           example: "disponible"
 *         isbn:
 *           type: string
 *           description: ISBN del libro (opcional)
 *           example: "9780060883287"
 *         descripcion:
 *           type: string
 *           description: Descripción del libro
 *           maxLength: 1000
 *           example: "Una obra maestra del realismo mágico"
 *         genero:
 *           type: array
 *           items:
 *             type: string
 *           description: Géneros del libro
 *           example: ["Realismo mágico", "Literatura latinoamericana"]
 *         editorial:
 *           type: string
 *           description: Editorial del libro
 *           maxLength: 100
 *           example: "Editorial Sudamericana"
 *         idioma:
 *           type: string
 *           description: Idioma del libro
 *           default: "Español"
 *           example: "Español"
 *         numeroPaginas:
 *           type: number
 *           description: Número de páginas
 *           minimum: 1
 *           example: 432
 *         precio:
 *           type: number
 *           description: Precio del libro
 *           minimum: 0
 *           example: 25.99
 *         ubicacion:
 *           type: object
 *           properties:
 *             estanteria:
 *               type: string
 *               example: "A1"
 *             seccion:
 *               type: string
 *               example: "FIC"
 *             nivel:
 *               type: number
 *               example: 3
 *         createdBy:
 *           $ref: '#/components/schemas/User'
 *         updatedBy:
 *           $ref: '#/components/schemas/User'
 *         reservadoPor:
 *           $ref: '#/components/schemas/User'
 *         fechaReserva:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     BookResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         book:
 *           $ref: '#/components/schemas/Book'
 *     
 *     BooksListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         books:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Book'
 *         pagination:
 *           type: object
 *           properties:
 *             currentPage:
 *               type: number
 *               example: 1
 *             totalPages:
 *               type: number
 *               example: 5
 *             totalBooks:
 *               type: number
 *               example: 50
 *             hasNext:
 *               type: boolean
 *               example: true
 *             hasPrev:
 *               type: boolean
 *               example: false
 *             itemsInCurrentPage:
 *               type: number
 *               example: 10
 * 
 * tags:
 *   name: Libros
 *   description: Endpoints para gestión de libros
 */

// ==========================================
// RUTAS ESPECÍFICAS SIN PARÁMETROS PRIMERO
// ==========================================

/**
 * @swagger
 * /api/books/my-books:
 *   get:
 *     summary: Obtener libros creados por el usuario autenticado
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Libros del usuario obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksListResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/my-books', 
  authenticate, 
  validatePagination,
  asyncHandler(bookController.getMyBooks)
);

/**
 * @swagger
 * /api/books/my-reservations:
 *   get:
 *     summary: Obtener reservas del usuario autenticado
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reservas del usuario obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksListResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/my-reservations', 
  authenticate, 
  asyncHandler(bookController.getMyReservations)
);

/**
 * @swagger
 * /api/books/stats:
 *   get:
 *     summary: Obtener estadísticas de libros (solo administradores)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalLibros:
 *                       type: number
 *                       example: 150
 *                     disponibles:
 *                       type: number
 *                       example: 120
 *                     reservados:
 *                       type: number
 *                       example: 20
 *                     prestados:
 *                       type: number
 *                       example: 8
 *                     mantenimiento:
 *                       type: number
 *                       example: 2
 *                 popularAuthors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "Gabriel García Márquez"
 *                       cantidadLibros:
 *                         type: number
 *                         example: 5
 *                 popularGenres:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "Ficción"
 *                       cantidadLibros:
 *                         type: number
 *                         example: 45
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Solo administradores pueden ver estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', 
  authenticate, 
  authorize(['admin']), 
  asyncHandler(bookController.getBookStats)
);

/**
 * @swagger
 * /api/books/search:
 *   post:
 *     summary: Búsqueda avanzada de libros
 *     tags: [Libros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Término de búsqueda
 *                 example: "García Márquez"
 *               options:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: number
 *                     default: 1
 *                   limit:
 *                     type: number
 *                     default: 10
 *                   estado:
 *                     type: string
 *                     enum: [disponible, reservado, prestado, mantenimiento]
 *                   autor:
 *                     type: string
 *                   genero:
 *                     type: string
 *                   anoDesde:
 *                     type: number
 *                   anoHasta:
 *                     type: number
 *     responses:
 *       200:
 *         description: Resultados de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksListResponse'
 *       400:
 *         description: Parámetros de búsqueda inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/search', 
  asyncHandler(bookController.searchBooks)
);

// ==========================================
// RUTAS CON PARÁMETROS FIJOS
// ==========================================

/**
 * @swagger
 * /api/books/status/{status}:
 *   get:
 *     summary: Obtener libros por estado
 *     tags: [Libros]
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [disponible, reservado, prestado, mantenimiento]
 *         description: Estado de los libros a buscar
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Libros por estado obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksListResponse'
 *       400:
 *         description: Estado inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status/:status', 
  validatePagination,
  asyncHandler(bookController.getBooksByStatus)
);

/**
 * @swagger
 * /api/books/author/{author}:
 *   get:
 *     summary: Obtener libros por autor
 *     tags: [Libros]
 *     parameters:
 *       - in: path
 *         name: author
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del autor
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Libros del autor obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksListResponse'
 */
router.get('/author/:author', 
  validatePagination,
  asyncHandler(bookController.getBooksByAuthor)
);

// ==========================================
// RUTAS BASE (COLECCIÓN PRINCIPAL)
// ==========================================

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Obtener lista de libros con paginación y filtros
 *     tags: [Libros]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en título, autor o descripción
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [disponible, reservado, prestado, mantenimiento]
 *         description: Filtrar por estado
 *       - in: query
 *         name: autor
 *         schema:
 *           type: string
 *         description: Filtrar por autor
 *       - in: query
 *         name: genero
 *         schema:
 *           type: string
 *         description: Filtrar por género
 *       - in: query
 *         name: anoDesde
 *         schema:
 *           type: number
 *         description: Año desde (rango de años)
 *       - in: query
 *         name: anoHasta
 *         schema:
 *           type: number
 *         description: Año hasta (rango de años)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [titulo, autor, anoPublicacion, createdAt]
 *           default: createdAt
 *         description: Campo para ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de libros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BooksListResponse'
 *       400:
 *         description: Parámetros de consulta inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', 
  validatePagination,
  asyncHandler(bookController.getAllBooks)
);

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Crear nuevo libro (requiere autenticación)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - autor
 *               - anoPublicacion
 *             properties:
 *               titulo:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "El Quijote"
 *               autor:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Miguel de Cervantes"
 *               anoPublicacion:
 *                 type: number
 *                 minimum: 1000
 *                 maximum: 2025
 *                 example: 1605
 *               estado:
 *                 type: string
 *                 enum: [disponible, reservado, prestado, mantenimiento]
 *                 default: disponible
 *               isbn:
 *                 type: string
 *                 example: "978-84-376-0495-4"
 *               descripcion:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "La novela más importante de la literatura española"
 *               genero:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Novela", "Literatura clásica"]
 *               editorial:
 *                 type: string
 *                 example: "Editorial Planeta"
 *               idioma:
 *                 type: string
 *                 example: "Español"
 *               numeroPaginas:
 *                 type: number
 *                 example: 863
 *               precio:
 *                 type: number
 *                 example: 29.99
 *               ubicacion:
 *                 type: object
 *                 properties:
 *                   estanteria:
 *                     type: string
 *                     example: "B2"
 *                   seccion:
 *                     type: string
 *                     example: "CLA"
 *                   nivel:
 *                     type: number
 *                     example: 2
 *     responses:
 *       201:
 *         description: Libro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Libro con ISBN ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', 
  authenticate, 
  validateBook, 
  asyncHandler(bookController.createBook)
);

// ==========================================
// RUTAS CON PARÁMETROS DINÁMICOS (AL FINAL)
// ==========================================

/**
 * @swagger
 * /api/books/{id}/availability:
 *   get:
 *     summary: Verificar disponibilidad de un libro
 *     tags: [Libros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     responses:
 *       200:
 *         description: Estado de disponibilidad del libro
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 availability:
 *                   type: object
 *                   properties:
 *                     bookId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     title:
 *                       type: string
 *                       example: "Cien años de soledad"
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: "disponible"
 *                     reservedBy:
 *                       type: object
 *                       nullable: true
 *                     reservationDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/availability', 
  asyncHandler(bookController.checkAvailability)
);

/**
 * @swagger
 * /api/books/{id}/reserve:
 *   post:
 *     summary: Reservar libro (requiere autenticación)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     responses:
 *       200:
 *         description: Libro reservado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookResponse'
 *       400:
 *         description: Libro no disponible o límite de reservas alcanzado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/reserve', 
  authenticate, 
  asyncHandler(bookController.reserveBook)
);

/**
 * @swagger
 * /api/books/{id}/reserve:
 *   delete:
 *     summary: Liberar reserva de libro (requiere autenticación)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     responses:
 *       200:
 *         description: Reserva liberada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookResponse'
 *       400:
 *         description: El libro no está reservado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para liberar esta reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id/reserve', 
  authenticate, 
  asyncHandler(bookController.releaseReservation)
);

/**
 * @swagger
 * /api/books/{id}/status:
 *   patch:
 *     summary: Cambiar estado de libro (solo administradores)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [disponible, reservado, prestado, mantenimiento]
 *                 example: "prestado"
 *     responses:
 *       200:
 *         description: Estado del libro cambiado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookResponse'
 *       400:
 *         description: Estado inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Solo administradores pueden cambiar estados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/status', 
  authenticate, 
  authorize(['admin']), 
  validateBookStatus, 
  asyncHandler(bookController.changeBookStatus)
);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Obtener libro por ID
 *     tags: [Libros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     responses:
 *       200:
 *         description: Libro encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookResponse'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', 
  asyncHandler(bookController.getBookById)
);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Actualizar libro (requiere autenticación y autorización)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               autor:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               anoPublicacion:
 *                 type: number
 *                 minimum: 1000
 *                 maximum: 2025
 *               estado:
 *                 type: string
 *                 enum: [disponible, reservado, prestado, mantenimiento]
 *               isbn:
 *                 type: string
 *               descripcion:
 *                 type: string
 *                 maxLength: 1000
 *               genero:
 *                 type: array
 *                 items:
 *                   type: string
 *               editorial:
 *                 type: string
 *               idioma:
 *                 type: string
 *               numeroPaginas:
 *                 type: number
 *               precio:
 *                 type: number
 *               ubicacion:
 *                 type: object
 *                 properties:
 *                   estanteria:
 *                     type: string
 *                   seccion:
 *                     type: string
 *                   nivel:
 *                     type: number
 *     responses:
 *       200:
 *         description: Libro actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para editar este libro
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', 
  authenticate, 
  validateBookUpdate, 
  asyncHandler(bookController.updateBook)
);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Eliminar libro (requiere autenticación y autorización)
 *     tags: [Libros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del libro
 *     responses:
 *       200:
 *         description: Libro eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Libro eliminado exitosamente"
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos para eliminar este libro
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Libro no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', 
  authenticate, 
  asyncHandler(bookController.deleteBook)
);

module.exports = router;