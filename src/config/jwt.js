const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } = process.env;

/**
 * Configuración y utilidades JWT
 * Implementa el patrón Singleton para manejo centralizado de JWT
 */
class JWTManager {
  constructor() {
    this.validateConfig();
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET es requerido en variables de entorno');
    }
    
    this.secret = JWT_SECRET;
    this.expiresIn = JWT_EXPIRES_IN || '24h';
    this.algorithm = JWT_ALGORITHM || 'HS256';
    this.issuer = JWT_ISSUER || 'book-management-system';
    this.audience = JWT_AUDIENCE || 'book-management-users';
  }

  validateConfig() {
  const requiredEnvVars = ['JWT_SECRET'];
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    throw new Error(`Variables de entorno requeridas faltantes: ${missing.join(', ')}`);
  }
  
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET debería tener al menos 32 caracteres para mayor seguridad');
  }
}
  /**
   * Generar token JWT
   */
  generateToken(payload) {
    const tokenPayload = {
      userId: payload.userId || payload.id,
      email: payload.email,
      role: payload.role,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.expiresIn,
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  /**
   * Verificar token JWT
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
        audience: this.audience
      });
    } catch (error) {
      throw new Error('Token inválido: ' + error.message);
    }
  }

  /**
   * Decodificar token sin verificar
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Generar refresh token (vida más larga)
   */
  generateRefreshToken(payload) {
    const tokenPayload = {
      userId: payload.userId || payload.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: '7d',
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  /**
   * Extraer información del token sin verificar completamente
   */
  extractTokenInfo(token) {
    try {
      const decoded = this.decodeToken(token);
      return {
        valid: true,
        expired: decoded.payload.exp ? decoded.payload.exp * 1000 < Date.now() : false,
        payload: decoded.payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar si un token está expirado
   */
  isTokenExpired(token) {
    try {
      const info = this.extractTokenInfo(token);
      return info.expired;
    } catch (error) {
      return true;
    }
  }
}

// Singleton instance
const jwtManager = new JWTManager();

module.exports = {
  generateToken: jwtManager.generateToken.bind(jwtManager),
  verifyToken: jwtManager.verifyToken.bind(jwtManager),
  decodeToken: jwtManager.decodeToken.bind(jwtManager),
  generateRefreshToken: jwtManager.generateRefreshToken.bind(jwtManager),
  extractTokenInfo: jwtManager.extractTokenInfo.bind(jwtManager),
  isTokenExpired: jwtManager.isTokenExpired.bind(jwtManager),
  JWT_SECRET,
  JWT_EXPIRES_IN
};