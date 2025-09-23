/**
 * Configuración principal de la aplicación Express
 * Implementa el patrón de configuración centralizada
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');

// Importar middleware personalizado
const { 
  errorHandler, 
  notFoundHandler, 
  validateContentType, 
  requestLogger 
} = require('./middleware/errorHandler');

// Importar configuración de Swagger
const { swaggerSpec, swaggerUi } = require('./config/swagger');

// Importar logger
const logger = require('./utils/logger');

class AppConfig {
  constructor() {
    this.app = express();
    this.setupSecurity();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupSecurity() {
    // Helmet para headers de seguridad
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : true,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100,
      message: { error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.' },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Rate limiting específico para autenticación
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { error: 'Demasiados intentos de autenticación, intenta de nuevo más tarde.' }
    });
    this.app.use('/api/auth/', authLimiter);
  }

  setupMiddleware() {
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging de requests
    this.app.use(requestLogger);

    // Validar Content-Type en POST/PUT
    this.app.use(validateContentType);

    // Archivos estáticos
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Documentación Swagger
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // API Routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/books', bookRoutes);

    // Rutas no encontradas en la API
    this.app.use('/api/*', notFoundHandler);

    // Ruta frontend
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });

    // Fallback 404 frontend
    this.app.use('*', (req, res) => {
      res.status(404).sendFile(path.join(__dirname, '../public', 'index.html'));
    });
  }

  setupErrorHandling() {
    // Middleware de manejo de errores (al final SIEMPRE)
    this.app.use(errorHandler);
  }

  getApp() {
    return this.app;
  }
}

module.exports = new AppConfig().getApp();
