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
└── package.json
```

## Instalación

### Prerrequisitos
- Node.js (v14+)
- MongoDB (v4.0+)
- npm

### Configuración

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
# Crear archivo .env (ver .env.example)
cp .env.example .env
```

**Configuración mínima en `.env`:**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bookstore
JWT_SECRET=tu-clave-secreta-aqui
JWT_EXPIRES_IN=24h
```

4. **Iniciar la aplicación**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Acceso

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Documentación**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## redenciales de Prueba

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
# Básicas
NODE_ENV=development
PORT=3000

# Base de datos
MONGODB_URI=mongodb://localhost:27017/bookstore

# JWT
JWT_SECRET=clave-secreta-segura
JWT_EXPIRES_IN=24h
JWT_ALGORITHM=HS256
JWT_ISSUER=book-management-system
JWT_AUDIENCE=book-management-users

# Desarrollo
DEV_AUTO_SEED=true
DEV_ENABLE_SWAGGER=true
```

## Solución de Problemas

### MongoDB no conecta
```bash
# Verificar que MongoDB esté ejecutándose
sudo systemctl status mongodb
# o en Windows
net start MongoDB
```

### Puerto ocupado
```bash
# Cambiar puerto en .env
PORT=3001
```

### Error de token
- Verificar que `JWT_SECRET` esté configurado en `.env`
- Asegurarse de incluir `Bearer ` antes del token
- Verificar que el token no haya expirado

## Contacto

- **Autor**: Henry Barrera
- **Email**: henrybarreraosorio@gmail.com
- **GitHub**: [Henry00312](https://github.com/Henry00312)
- **Repositorio**: [book-management-system](https://github.com/Henry00312/book-management-system)

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

**Sistema desarrollado como ejercicio de Node.js con arquitectura limpia y buenas prácticas.**