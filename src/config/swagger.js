/**
 * Configuración de Swagger
 * Define la documentación automática de la API usando OpenAPI 3.0
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { PORT, NODE_ENV } = require('../utils/constants');

// Configuración base de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Gestión de Libros',
      version: '1.0.0',
      description: `
        ## Sistema completo de gestión de biblioteca en línea
        
        Esta API REST permite gestionar una biblioteca digital con las siguientes características:
        
        ### 🚀 Funcionalidades Principales
        - **Autenticación JWT** - Sistema seguro de autenticación y autorización
        - **Gestión de Usuarios** - Registro, login, perfil y roles
        - **CRUD de Libros** - Crear, leer, actualizar y eliminar libros
        - **Sistema de Reservas** - Reservar y liberar libros
        - **Búsqueda Avanzada** - Filtros por múltiples criterios
        - **Estados de Libros** - Disponible, reservado, prestado, mantenimiento
        - **Roles de Usuario** - Admin y usuario regular con permisos diferenciados
        
        ### 🔒 Seguridad
        - Autenticación mediante JWT (JSON Web Tokens)
        - Validación de datos con Joi
        - Rate limiting para prevenir abuso
        - Sanitización de entradas
        - Logging de seguridad
        
        ### 📊 Arquitectura
        - **Patrón MVC** - Separación clara de responsabilidades
        - **Repository Pattern** - Abstracción de acceso a datos
        - **Service Layer** - Lógica de negocio centralizada
        - **Middleware Pattern** - Procesamiento modular de requests
        - **Factory Pattern** - Creación de respuestas estandarizadas
        - **Dependency Injection** - Inversión de dependencias
        
        ### 🎯 Casos de Uso
        - Bibliotecas públicas y privadas
        - Sistemas de gestión académica
        - Librerías digitales
        - Clubes de lectura
        - Inventario de colecciones personales
        
        ### 📝 Autenticación
        Para usar los endpoints protegidos, incluye el token JWT en el header:
        \`\`\`
        Authorization: Bearer YOUR_JWT_TOKEN
        \`\`\`
        
        ### 🧪 Credenciales de Prueba
        - **Email**: admin@bookstore.com
        - **Contraseña**: admin123
        - **Rol**: Administrador
      `,
      contact: {
        name: 'Soporte API',
        email: 'soporte@bookstore.com',
        url: 'https://github.com/tu-usuario/book-management-system'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      termsOfService: 'https://bookstore.com/terms'
    },
    
    servers: [
      {
        url: NODE_ENV === 'production' 
          ? 'https://your-domain.com' 
          : `http://localhost:${PORT}`,
        description: NODE_ENV === 'production' 
          ? 'Servidor de Producción' 
          : 'Servidor de Desarrollo'
      }
    ],
    
    // Configuración de seguridad
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `
            **Autenticación JWT**
            
            Obtén un token usando el endpoint \`POST /api/auth/login\` y úsalo en el header Authorization:
            
            \`Authorization: Bearer YOUR_JWT_TOKEN\`
            
            El token expira en 24 horas.
          `
        }
      },
      
      // Esquemas reutilizables
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Indica si la operación fue exitosa'
            },
            error: {
              type: 'object',
              required: ['message', 'timestamp'],
              properties: {
                message: {
                  type: 'string',
                  description: 'Mensaje descriptivo del error'
                },
                code: {
                  type: 'string',
                  description: 'Código específico del error',
                  example: 'VALIDATION_ERROR'
                },
                details: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'object' },
                    { type: 'array' }
                  ],
                  description: 'Detalles adicionales del error'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Momento en que ocurrió el error'
                }
              }
            },
            metadata: {
              type: 'object',
              description: 'Metadatos adicionales'
            }
          }
        },
        
        Success: {
          type: 'object',
          required: ['success', 'message', 'timestamp'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indica si la operación fue exitosa'
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo del resultado'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Momento de la respuesta'
            }
          }
        },
        
        Pagination: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              minimum: 1,
              description: 'Página actual'
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total de páginas disponibles'
            },
            totalItems: {
              type: 'integer',
              minimum: 0,
              description: 'Total de elementos'
            },
            itemsPerPage: {
              type: 'integer',
              minimum: 1,
              description: 'Elementos por página'
            },
            hasNext: {
              type: 'boolean',
              description: 'Indica si hay página siguiente'
            },
            hasPrev: {
              type: 'boolean',
              description: 'Indica si hay página anterior'
            },
            itemsInCurrentPage: {
              type: 'integer',
              minimum: 0,
              description: 'Elementos en la página actual'
            }
          }
        },
        
        BookStatus: {
          type: 'string',
          enum: ['disponible', 'reservado', 'prestado', 'mantenimiento'],
          description: `Estado del libro:
            - **disponible**: Libro disponible para reserva
            - **reservado**: Libro reservado por un usuario
            - **prestado**: Libro prestado (fuera de la biblioteca)
            - **mantenimiento**: Libro en reparación o mantenimiento`
        },
        
        UserRole: {
          type: 'string',
          enum: ['admin', 'user'],
          description: `Rol del usuario:
            - **admin**: Administrador con permisos completos
            - **user**: Usuario regular con permisos limitados`
        }
      },
      
      // Parámetros reutilizables
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Número de página para paginación',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Número de elementos por página',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          }
        },
        
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Término de búsqueda para filtrar resultados',
          required: false,
          schema: {
            type: 'string'
          }
        },
        
        SortByParam: {
          name: 'sortBy',
          in: 'query',
          description: 'Campo por el cual ordenar los resultados',
          required: false,
          schema: {
            type: 'string',
            enum: ['titulo', 'autor', 'anoPublicacion', 'createdAt', 'updatedAt'],
            default: 'createdAt'
          }
        },
        
        SortOrderParam: {
          name: 'sortOrder',
          in: 'query',
          description: 'Orden de clasificación',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        },
        
        BookIdParam: {
          name: 'id',
          in: 'path',
          description: 'ID único del libro',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{24}$'
          },
          example: '507f1f77bcf86cd799439011'
        }
      },
      
      // Respuestas reutilizables
      responses: {
        UnauthorizedError: {
          description: 'Token de autenticación faltante o inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  message: 'Token de acceso requerido',
                  code: 'UNAUTHORIZED',
                  timestamp: '2025-01-20T10:30:00Z'
                }
              }
            }
          }
        },
        
        ForbiddenError: {
          description: 'Permisos insuficientes para realizar la operación',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  message: 'Permisos insuficientes para esta operación',
                  code: 'FORBIDDEN',
                  timestamp: '2025-01-20T10:30:00Z'
                }
              }
            }
          }
        },
        
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  message: 'Recurso no encontrado',
                  code: 'RESOURCE_NOT_FOUND',
                  timestamp: '2025-01-20T10:30:00Z'
                }
              }
            }
          }
        },
        
        ValidationError: {
          description: 'Error de validación en los datos proporcionados',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  message: 'Error de validación',
                  code: 'VALIDATION_ERROR',
                  details: {
                    titulo: 'El título es requerido',
                    anoPublicacion: 'El año debe ser mayor a 1000'
                  },
                  timestamp: '2025-01-20T10:30:00Z'
                }
              }
            }
          }
        },
        
        InternalServerError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  message: 'Error interno del servidor',
                  code: 'INTERNAL_SERVER_ERROR',
                  timestamp: '2025-01-20T10:30:00Z'
                }
              }
            }
          }
        }
      }
    },
    
    // Tags para organizar endpoints
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para autenticación, registro y gestión de usuarios',
        externalDocs: {
          description: 'Más información sobre autenticación JWT',
          url: 'https://jwt.io/introduction/'
        }
      },
      {
        name: 'Libros',
        description: 'Endpoints para gestión completa de libros (CRUD)',
        externalDocs: {
          description: 'Guía de uso de la API de libros',
          url: 'https://docs.bookstore.com/books'
        }
      },
      {
        name: 'Sistema',
        description: 'Endpoints del sistema (health check, métricas)',
        externalDocs: {
          description: 'Monitoreo y salud del sistema',
          url: 'https://docs.bookstore.com/monitoring'
        }
      }
    ],
    
    // Paths adicionales para endpoints del sistema
    paths: {
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Health check del sistema',
          description: 'Verifica el estado de salud de la aplicación y sus dependencias',
          responses: {
            '200': {
              description: 'Sistema saludable',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'OK'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time'
                      },
                      uptime: {
                        type: 'number',
                        description: 'Tiempo de funcionamiento en segundos'
                      },
                      environment: {
                        type: 'string',
                        example: 'development'
                      }
                    }
                  }
                }
              }
            },
            '503': {
              description: 'Sistema no disponible',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  
  // Archivos donde buscar documentación
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ],
};

// Generar especificación de Swagger
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuración personalizada de Swagger UI
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none', // No expandir secciones por defecto
    filter: true, // Habilitar filtro de búsqueda
    showRequestDuration: true, // Mostrar duración de requests
    tryItOutEnabled: true, // Habilitar "Try it out"
    requestInterceptor: (req) => {
      // Interceptor para agregar headers personalizados
      req.headers['User-Agent'] = 'BookStore-API-Docs/1.0.0';
      return req;
    },
    responseInterceptor: (res) => {
      // Interceptor para procesar respuestas
      return res;
    }
  },
  customCss: `
    .swagger-ui .topbar { 
      background-color: #667eea; 
      background-image: linear-gradient(45deg, #667eea, #764ba2);
    }
    .swagger-ui .topbar .download-url-wrapper .select-label {
      color: white;
    }
    .swagger-ui .topbar .download-url-wrapper input[type=text] {
      border: 2px solid #ffffff;
    }
    .swagger-ui .info .title {
      color: #2c3e50;
    }
    .swagger-ui .info .description p {
      color: #34495e;
    }
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      padding: 10px;
      border-left: 4px solid #667eea;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #28a745;
      background: rgba(40, 167, 69, 0.1);
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #007bff;
      background: rgba(0, 123, 255, 0.1);
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #ffc107;
      background: rgba(255, 193, 7, 0.1);
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #dc3545;
      background: rgba(220, 53, 69, 0.1);
    }
    .swagger-ui .opblock.opblock-patch {
      border-color: #6f42c1;
      background: rgba(111, 66, 193, 0.1);
    }
  `,
  customSiteTitle: 'API de Gestión de Libros - Documentación',
  customfavIcon: '/favicon.ico',
  customJs: [
    // JavaScript personalizado para mejorar la experiencia
    `
      // Función para agregar funcionalidad personalizada
      window.onload = function() {
        // Agregar información de versión
        const version = document.createElement('div');
        version.innerHTML = '<small style="color: #666;">Última actualización: ${new Date().toLocaleDateString()}</small>';
        version.style.textAlign = 'center';
        version.style.padding = '10px';
        document.querySelector('.swagger-ui').appendChild(version);
      };
    `
  ]
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};