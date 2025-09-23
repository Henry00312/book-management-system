/**
 * Punto de entrada principal de la aplicación
 * Aplica el patrón de inicialización y manejo de errores globales
 */

require('dotenv').config();
const app = require('./src/app');
const DatabaseConnection = require('./src/config/database');
const logger = require('./src/utils/logger');
const { PORT } = require('./src/utils/constants');

class Server {
  constructor() {
    this.app = app;
    this.port = PORT;
  }

  async start() {
    try {
      // Debug de variables de entorno
      console.log('=== DEBUG DE CONEXIÓN ===');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('PORT:', this.port);
      console.log('MONGODB_URI presente:', !!process.env.MONGODB_URI);
      
      if (process.env.MONGODB_URI) {
        // Mostrar URI censurada para debug
        const censuredUri = process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log('URI censurada:', censuredUri);
      } else {
        console.error('MONGODB_URI no encontrada en variables de entorno');
        throw new Error('MONGODB_URI es requerida');
      }

      // Conectar a la base de datos usando Singleton
      console.log('Intentando conectar a base de datos...');
      await DatabaseConnection.getInstance().connect();
      console.log('Conexión a base de datos exitosa');
      
      // Inicializar datos de prueba
      await this.initializeTestData();
      
      // Iniciar servidor
      this.server = this.app.listen(this.port, () => {
        logger.info(`Servidor ejecutándose en puerto ${this.port}`);
        logger.info(`API disponible en: http://localhost:${this.port}/api`);
        logger.info(`Documentación: http://localhost:${this.port}/api-docs`);
        logger.info(`Frontend: http://localhost:${this.port}`);
        console.log('=== FIN DEBUG - SERVIDOR INICIADO ===');
      });

      // Manejo de cierre graceful
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('=== ERROR DETALLADO ===');
      console.error('Mensaje:', error.message);
      console.error('Código:', error.code);
      console.error('Nombre:', error.name);
      console.error('Stack:', error.stack);
      
      // Diagnósticos específicos
      if (error.code === 'ENOTFOUND') {
        console.error('Error de DNS - verifica tu conexión a internet');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('Conexión rechazada - verifica que MongoDB esté corriendo');
      } else if (error.message.includes('Authentication failed')) {
        console.error('Fallo de autenticación - verifica usuario/contraseña');
      } else if (error.message.includes('timeout')) {
        console.error('Timeout de conexión - verifica firewall/VPN');
      } else if (error.message.includes('MONGODB_URI')) {
        console.error('Error de configuración - verifica el archivo .env');
      }
      
      logger.error('Error iniciando servidor:', error);
      process.exit(1);
    }
  }

  async initializeTestData() {
    try {
      console.log('🔍 Inicializando datos de prueba...');
      
      const AuthService = require('./src/services/AuthService');
      const BookService = require('./src/services/BookService');
      
      const authService = new AuthService();
      const bookService = new BookService();

      // Crear usuario admin si no existe
      const adminExists = await authService.findUserByEmail('admin@bookstore.com');
      if (!adminExists) {
        console.log('Creando usuario admin...');
        
        const adminUser = await authService.register({
          username: 'admin',
          email: 'admin@bookstore.com',
          password: 'admin123',
          role: 'admin'
        });

        // Crear libros de ejemplo
        console.log('🔍 Creando libros de ejemplo...');
        
        const sampleBooks = [
          {
            titulo: 'Cien años de soledad',
            autor: 'Gabriel García Márquez',
            anoPublicacion: 1967,
            estado: 'disponible',
            isbn: '978-84-376-0494-7',
            descripcion: 'Una obra maestra del realismo mágico'
          },
          {
            titulo: 'Don Quijote de la Mancha',
            autor: 'Miguel de Cervantes',
            anoPublicacion: 1605,
            estado: 'disponible',
            isbn: '978-84-376-0495-4',
            descripcion: 'La novela más importante de la literatura española'
          }
        ];

        for (const bookData of sampleBooks) {
          await bookService.createBook(bookData, adminUser.user.id);
        }

        logger.info('Datos de prueba inicializados');
        logger.info('Usuario admin: admin@bookstore.com / admin123');
      } else {
        console.log('Usuario admin ya existe, omitiendo inicialización');
      }
    } catch (error) {
      console.error('Error inicializando datos de prueba:', error.message);
      logger.warn('Advertencia inicializando datos de prueba:', error.message);
      // No fallar el servidor por esto, solo advertir
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Recibida señal ${signal}. Cerrando servidor gracefully...`);
      
      if (this.server) {
        this.server.close(async () => {
          logger.info('Servidor HTTP cerrado');
          
          try {
            await DatabaseConnection.getInstance().disconnect();
            logger.info('Base de datos desconectada');
            process.exit(0);
          } catch (error) {
            logger.error('Error cerrando base de datos:', error);
            process.exit(1);
          }
        });
      }
    };

    // Manejo de señales del sistema
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Manejo de errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('Excepción no capturada:', error);
      logger.error('Excepción no capturada:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Promesa rechazada no manejada:', reason);
      logger.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
      process.exit(1);
    });
  }
}

// Iniciar la aplicación
const server = new Server();
server.start();