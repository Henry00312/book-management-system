/**
 * Configuración de conexión a base de datos
 * Implementa el patrón Singleton para una única instancia de conexión
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { MONGODB_URI, NODE_ENV } = require('../utils/constants');

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Implementación del patrón Singleton
   * Garantiza una única instancia de la conexión a BD
   */
  static getInstance() {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Configura las opciones de conexión según el entorno
   */
  getConnectionOptions() {
    const baseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Máximo 10 conexiones en el pool
      serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
      socketTimeoutMS: 45000, // Timeout de socket de 45 segundos
      bufferCommands: false, // Deshabilitar buffering de Mongoose
    };

    // Opciones específicas para producción
    if (NODE_ENV === 'production') {
      return {
        ...baseOptions,
        retryWrites: true,
        w: 'majority',
        readPreference: 'primary',
        authSource: 'admin'
      };
    }

    // Opciones para desarrollo
    return {
      ...baseOptions,
      autoIndex: true, // Auto-crear índices en desarrollo
    };
  }

  /**
   * Establece la conexión a la base de datos
   */
  async connect() {
    if (this.isConnected) {
      logger.info('Base de datos ya conectada');
      return this.connection;
    }

    try {
      logger.info('Conectando a base de datos...');
      
      const options = this.getConnectionOptions();
      this.connection = await mongoose.connect(MONGODB_URI, options);
      
      this.isConnected = true;
      this.setupEventListeners();
      
      logger.info('Base de datos conectada exitosamente');
      logger.info(`BD: ${this.connection.connection.name}`);
      logger.info(`Host: ${this.connection.connection.host}:${this.connection.connection.port}`);
      
      return this.connection;
    } catch (error) {
      logger.error('Error conectando a base de datos:', error);
      throw new Error(`Error de conexión a BD: ${error.message}`);
    }
  }

  /**
   * Configura los listeners de eventos de la conexión
   */
  setupEventListeners() {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      logger.info('Mongoose conectado a MongoDB');
    });

    connection.on('error', (error) => {
      logger.error('Error en conexión Mongoose:', error);
    });

    connection.on('disconnected', () => {
      logger.warn('Mongoose desconectado de MongoDB');
      this.isConnected = false;
    });

    connection.on('reconnected', () => {
      logger.info('Mongoose reconectado a MongoDB');
      this.isConnected = true;
    });

    // Manejo de eventos específicos de MongoDB
    connection.on('fullsetup', () => {
      logger.info('Replica set completamente configurado');
    });

    connection.on('all', () => {
      logger.info('Conexión a todos los servidores del replica set establecida');
    });
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async disconnect() {
    if (!this.isConnected) {
      logger.info('Base de datos ya desconectada');
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      this.connection = null;
      logger.info('Base de datos desconectada exitosamente');
    } catch (error) {
      logger.error('Error desconectando base de datos:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado de la conexión
   */
  getConnectionStatus() {
    const states = {
      0: 'desconectado',
      1: 'conectado',
      2: 'conectando',
      3: 'desconectando'
    };

    const readyState = mongoose.connection.readyState;
    return {
      isConnected: this.isConnected,
      state: states[readyState] || 'desconocido',
      readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Reconecta a la base de datos
   */
  async reconnect() {
    logger.info('Intentando reconexión...');
    await this.disconnect();
    return await this.connect();
  }

  /**
   * Realiza un health check de la conexión
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error('Base de datos no conectada');
      }

      // Ejecutar un comando simple para verificar conectividad
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Base de datos respondiendo correctamente',
        ...this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        ...this.getConnectionStatus()
      };
    }
  }
}

module.exports = DatabaseConnection;