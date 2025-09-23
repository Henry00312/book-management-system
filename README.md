# 📚 Sistema de Gestión de Libros

Sistema de gestión de libros desarrollado con **Node.js**, **Express** y **MongoDB**. Implementa una API REST completa con autenticación JWT y interfaz web.

## Características

- **API REST completa** con documentación Swagger
- **Autenticación JWT** con roles (admin/user)
- **CRUD de libros** (crear, leer, actualizar, eliminar)
- **Sistema de reservas** de libros
- **Búsqueda y filtros** avanzados
- **Validación de datos** con Joi
- **Manejo de errores** centralizado
- **Logging** con Winston
- **Interfaz web** incluida
- **Base de datos MongoDB** con Mongoose

## Arquitectura

### Patrones Implementados
- **MVC Pattern** - Separación en Modelos, Vistas y Controladores
- **Repository Pattern** - Abstracción del acceso a datos
- **Service Layer** - Lógica de negocio encapsulada
- **Singleton Pattern** - Conexión BD y configuración JWT
- **Factory Pattern** - Respuestas HTTP estandarizadas
- **Middleware Pattern** - Procesamiento modular de requests

### Estructura del Proyecto
```
book-management-system/
├── src/
│   ├── config/              # Configuración
│   ├── controllers/         # Controladores MVC
│   ├── services/            # Lógica de negocio
│   ├── repositories/        # Acceso a datos
│   ├── models/              # Modelos Mongoose
│   ├── routes/              # Definición de rutas
│   ├── middleware/          # Middleware personalizado
│   └── utils/               # Utilidades
├── public/                  # Frontend
├── server.js                # Punto de entrada
├── .env.example             # Template de variables de entorno
└── package.json
```

## ⚙️ Instalación y Configuración

### Prerrequisitos
- **Node.js** (v14 o superior)
- **MongoDB** (v4.0 o superior) - Local o MongoDB Atlas
- **npm** o **yarn**
- **Git**

### Paso a Paso

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/Henry00312/book-management-system.git
   cd book-management-system
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Copiar template de configuración
   cp .env.example .env
   ```
   
   **Editar el archivo `.env` con tus valores:**
   
   - **MongoDB URI**: 
     - **Local**: `mongodb://localhost:27017/bookstore`
     - **Atlas**: `mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/bookstore`
   
   - **JWT Secret**: Genera una clave segura:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     ```
   
   - **Configuración mínima requerida**:
     ```env
     NODE_ENV=development
     PORT=3000
     MONGODB_URI=mongodb://localhost:27017/bookstore
     JWT_SECRET=tu_clave_secreta_super_segura_de_64_caracteres
     JWT_EXPIRES_IN=24h
     ```

4. **Iniciar la aplicación**
   ```bash
   # Desarrollo (con nodemon)
   npm run dev
   
   # Producción
   npm start
   ```

5. **Verificar instalación**
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:3000/api
   - **Health Check**: http://localhost:3000/health
   - **Swagger Docs**: http://localhost:3000/api-docs (solo en desarrollo)

### Scripts Disponibles

```bash
npm start          # Ejecutar en producción
npm run dev        # Ejecutar en desarrollo con nodemon
npm test           # Ejecutar pruebas (si las tienes)
npm run lint       # Verificar código con ESLint
```

## Credenciales de Prueba

El sistema crea automáticamente un usuario administrador:

- **Email**: admin@bookstore.com
- **Contraseña**: admin123
- **Rol**: admin

## API Endpoints

### Autenticación
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/profile` | Obtener perfil | Sí |
| PUT | `/api/auth/profile` | Actualizar perfil | Sí |
| POST | `/api/auth/change-password` | Cambiar contraseña | Sí |

### Libros
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/books` | Listar libros | No |
| GET | `/api/books/:id` | Obtener libro | No |
| POST | `/api/books` | Crear libro | Sí |
| PUT | `/api/books/:id` | Actualizar libro | Sí |
| DELETE | `/api/books/:id` | Eliminar libro | Sí |
| POST | `/api/books/:id/reserve` | Reservar libro | Sí |
| DELETE | `/api/books/:id/reserve` | Liberar reserva | Sí |
| GET | `/api/books/my-books` | Mis libros | Sí |
| GET | `/api/books/my-reservations` | Mis reservas | Sí |

## Ejemplos de Uso

### Iniciar Sesión
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bookstore.com",
    "password": "admin123"
  }'
```

### Crear un Libro
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "titulo": "Cien años de soledad",
    "autor": "Gabriel García Márquez", 
    "anoPublicacion": 1967,
    "estado": "disponible"
  }'
```

### Buscar Libros
```bash
curl "http://localhost:3000/api/books?search=García&estado=disponible&page=1&limit=10"
```

## Tecnologías Utilizadas

### Backend
- **Node.js** - Entorno de ejecución
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación
- **Joi** - Validación de datos
- **Winston** - Sistema de logging
- **Helmet** - Seguridad HTTP
- **CORS** - Control de acceso

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos
- **JavaScript** - Interactividad
- **Fetch API** - Comunicación con API

## Seguridad

- **JWT** para autenticación stateless
- **Bcrypt** para hash de contraseñas
- **Helmet** para headers de seguridad
- **Rate Limiting** para prevenir abuso
- **Validación** exhaustiva con Joi
- **CORS** configurado apropiadamente

## Estados de Libros

- `disponible` - Libro disponible para reserva
- `reservado` - Libro reservado por un usuario
- `prestado` - Libro prestado (fuera de biblioteca)
- `mantenimiento` - Libro en reparación

## Roles de Usuario

- **admin** - Acceso completo, puede gestionar todos los libros
- **user** - Puede crear libros y gestionar sus propios libros

## Variables de Entorno

```env
# ==============================================
# CONFIGURACIÓN BÁSICA - SISTEMA DE GESTIÓN DE LIBROS
# ==============================================

# Entorno de ejecución
NODE_ENV=development
PORT=3000

# ----------------------------------------------
# BASE DE DATOS
# ----------------------------------------------
# MongoDB URI
MONGODB_URI=mongodb://localhost:27017/bookstore

# ----------------------------------------------
# AUTENTICACIÓN JWT
# ----------------------------------------------
# Clave secreta JWT (mínimo 64 caracteres)
JWT_SECRET=tu_jwt_secret_super_seguro_de_al_menos_64_caracteres_aqui
JWT_EXPIRES_IN=24h
JWT_ALGORITHM=HS256
JWT_ISSUER=book-management-system
JWT_AUDIENCE=book-management-users

# ----------------------------------------------
# DESARROLLO
# ----------------------------------------------
DEV_AUTO_SEED=true
DEV_ENABLE_SWAGGER=true
```

> **📝 Nota**: Copia `.env.example` a `.env` y configura tus propios valores. Nunca subas el archivo `.env` a GitHub.

## Solución de Problemas

### MongoDB no conecta
```bash
# Linux/Mac - Verificar que MongoDB esté ejecutándose
sudo systemctl status mongodb

# Windows
net start MongoDB

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Puerto ocupado
```bash
# Cambiar puerto en .env
PORT=3001
```

### Error de token JWT
- Verificar que `JWT_SECRET` esté configurado en `.env`
- Asegurarse de incluir `Bearer ` antes del token en el header
- Verificar que el token no haya expirado (24h por defecto)
- Comprobar que el formato sea: `Authorization: Bearer tu_token_aqui`

### Error de dependencias
```bash
# Limpiar cache e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Contacto

- **Autor**: Henry Barrera
- **Email**: henrybarreraosorio@gmail.com
- **GitHub**: [Henry00312](https://github.com/Henry00312)
- **Repositorio**: [book-management-system](https://github.com/Henry00312/book-management-system)

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

**Sistema desarrollado como ejercicio de Node.js con arquitectura limpia y buenas prácticas.**