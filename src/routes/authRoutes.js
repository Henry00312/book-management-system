/**
 * Rutas de Autenticación
 * Implementa el patrón Router para organización de rutas
 * Define todos los endpoints relacionados con autenticación
 */

const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const { validateRegistration, validateLogin, validatePasswordChange, validateProfileUpdate } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Crear router
const router = express.Router();

// Crear instancia del controlador
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: ID único del usuario
 *         username:
 *           type: string
 *           description: Nombre de usuario único
 *           minLength: 3
 *           maxLength: 30
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         password:
 *           type: string
 *           description: Contraseña del usuario
 *           minLength: 6
 *         role:
 *           type: string
 *           enum: [admin, user]
 *           description: Rol del usuario
 *           default: user
 *         isActive:
 *           type: boolean
 *           description: Estado activo del usuario
 *           default: true
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Fecha del último login
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         token:
 *           type: string
 *           description: JWT token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             code:
 *               type: string
 *             details:
 *               type: object
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   name: Autenticación
 *   description: Endpoints para gestión de usuarios y autenticación
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: 'usuario123'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'usuario@example.com'
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: 'password123'
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 default: user
 *                 example: 'user'
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Usuario ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', 
  validateRegistration, 
  asyncHandler(authController.register)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'admin@bookstore.com'
 *               password:
 *                 type: string
 *                 example: 'admin123'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       423:
 *         description: Usuario bloqueado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', 
  validateLogin, 
  asyncHandler(authController.login)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
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
 *                   example: 'Sesión cerrada exitosamente'
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', 
  authenticate, 
  asyncHandler(authController.logout)
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', 
  authenticate, 
  asyncHandler(authController.getProfile)
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: 'nuevo_username'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'nuevo@email.com'
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
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
 *                   example: 'Perfil actualizado exitosamente'
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', 
  authenticate, 
  validateProfileUpdate, 
  asyncHandler(authController.updateProfile)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Cambiar contraseña del usuario
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: 'password_actual'
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: 'nueva_password123'
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
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
 *                   example: 'Contraseña actualizada exitosamente'
 *       400:
 *         description: Error de validación o contraseña actual incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/change-password', 
  authenticate, 
  validatePasswordChange, 
  asyncHandler(authController.changePassword)
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token JWT
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', 
  asyncHandler(authController.refreshToken)
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar validez del token
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
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
 *                   example: 'Token válido'
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/verify', 
  asyncHandler(authController.verifyAuth)
);

/**
 * @swagger
 * /api/auth/info:
 *   get:
 *     summary: Obtener información pública del sistema
 *     tags: [Autenticación]
 *     responses:
 *       200:
 *         description: Información del sistema
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
 *                   example: 'Sistema de gestión de libros'
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ['Autenticación JWT', 'Gestión de libros', 'Sistema de reservas']
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     auth:
 *                       type: string
 *                       example: '/api/auth'
 *                     books:
 *                       type: string
 *                       example: '/api/books'
 *                     docs:
 *                       type: string
 *                       example: '/api-docs'
 */
router.get('/info', 
  asyncHandler(authController.getPublicInfo)
);

module.exports = router;