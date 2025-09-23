/**
 * Utilidades de Respuesta
 * Implementa el patrón Factory para crear respuestas HTTP estandarizadas
 * Garantiza consistencia en el formato de respuestas de la API
 */

/**
 * Factory para crear respuestas de éxito estandarizadas
 * @param {Object} data - Datos a incluir en la respuesta
 * @param {string} message - Mensaje descriptivo
 * @param {Object} metadata - Metadatos adicionales
 * @returns {Object} Respuesta estandarizada de éxito
 */
function createSuccessResponse(data = {}, message = 'Operación exitosa', metadata = {}) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...data
  };

  // Agregar metadatos si existen
  if (Object.keys(metadata).length > 0) {
    response.metadata = metadata;
  }

  return response;
}

/**
 * Factory para crear respuestas de error estandarizadas
 * @param {string} message - Mensaje de error
 * @param {*} details - Detalles adicionales del error
 * @param {string} code - Código de error específico
 * @param {Object} metadata - Metadatos adicionales
 * @returns {Object} Respuesta estandarizada de error
 */
function createErrorResponse(message = 'Error interno del servidor', details = null, code = null, metadata = {}) {
  const response = {
    success: false,
    error: {
      message,
      timestamp: new Date().toISOString()
    }
  };

  // Agregar código de error si se proporciona
  if (code) {
    response.error.code = code;
  }

  // Agregar detalles si se proporcionan
  if (details !== null && details !== undefined) {
    response.error.details = details;
  }

  // Agregar metadatos si existen
  if (Object.keys(metadata).length > 0) {
    response.metadata = metadata;
  }

  return response;
}

/**
 * Factory para crear respuestas de validación
 * @param {Object} validationErrors - Errores de validación por campo
 * @param {string} message - Mensaje principal
 * @returns {Object} Respuesta de error de validación
 */
function createValidationErrorResponse(validationErrors, message = 'Error de validación') {
  return createErrorResponse(
    message,
    validationErrors,
    'VALIDATION_ERROR',
    {
      fieldCount: Object.keys(validationErrors).length,
      fields: Object.keys(validationErrors)
    }
  );
}

/**
 * Factory para crear respuestas paginadas
 * @param {Array} items - Array de elementos
 * @param {Object} paginationInfo - Información de paginación
 * @param {string} message - Mensaje descriptivo
 * @returns {Object} Respuesta paginada estandarizada
 */
function createPaginatedResponse(items, paginationInfo, message = 'Datos obtenidos exitosamente') {
  const {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNext,
    hasPrev
  } = paginationInfo;

  return createSuccessResponse({
    data: items,
    pagination: {
      currentPage: parseInt(currentPage),
      totalPages: parseInt(totalPages),
      totalItems: parseInt(totalItems),
      itemsPerPage: parseInt(itemsPerPage),
      hasNext: Boolean(hasNext),
      hasPrev: Boolean(hasPrev),
      itemsInCurrentPage: items.length
    }
  }, message);
}

/**
 * Factory para crear respuestas de creación de recursos
 * @param {Object} resource - Recurso creado
 * @param {string} resourceType - Tipo de recurso (ej: 'usuario', 'libro')
 * @param {string} location - URL del recurso creado (opcional)
 * @returns {Object} Respuesta de creación exitosa
 */
function createCreatedResponse(resource, resourceType = 'recurso', location = null) {
  const response = createSuccessResponse(
    { [resourceType]: resource },
    `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} creado exitosamente`
  );

  if (location) {
    response.location = location;
  }

  return response;
}

/**
 * Factory para crear respuestas de actualización de recursos
 * @param {Object} resource - Recurso actualizado
 * @param {string} resourceType - Tipo de recurso
 * @param {Array} updatedFields - Campos que fueron actualizados
 * @returns {Object} Respuesta de actualización exitosa
 */
function createUpdatedResponse(resource, resourceType = 'recurso', updatedFields = []) {
  return createSuccessResponse(
    { [resourceType]: resource },
    `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} actualizado exitosamente`,
    {
      updatedFields,
      fieldCount: updatedFields.length
    }
  );
}

/**
 * Factory para crear respuestas de eliminación
 * @param {string} resourceType - Tipo de recurso eliminado
 * @param {string} resourceId - ID del recurso eliminado
 * @returns {Object} Respuesta de eliminación exitosa
 */
function createDeletedResponse(resourceType = 'recurso', resourceId = null) {
  const response = createSuccessResponse(
    {},
    `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} eliminado exitosamente`
  );

  if (resourceId) {
    response.deletedId = resourceId;
  }

  return response;
}

/**
 * Factory para crear respuestas de autorización denegada
 * @param {string} resource - Recurso al que se intentó acceder
 * @param {string} action - Acción que se intentó realizar
 * @returns {Object} Respuesta de error de autorización
 */
function createUnauthorizedResponse(resource = 'recurso', action = 'acceder') {
  return createErrorResponse(
    'Acceso denegado',
    `No tienes permisos para ${action} a este ${resource}`,
    'UNAUTHORIZED_ACCESS'
  );
}

/**
 * Factory para crear respuestas de recurso no encontrado
 * @param {string} resourceType - Tipo de recurso
 * @param {string} identifier - Identificador usado en la búsqueda
 * @returns {Object} Respuesta de error de recurso no encontrado
 */
function createNotFoundResponse(resourceType = 'recurso', identifier = null) {
  let message = `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} no encontrado`;
  
  if (identifier) {
    message += ` con identificador: ${identifier}`;
  }

  return createErrorResponse(
    message,
    null,
    'RESOURCE_NOT_FOUND'
  );
}

/**
 * Factory para crear respuestas de rate limiting
 * @param {number} retryAfter - Segundos hasta el próximo intento permitido
 * @returns {Object} Respuesta de rate limit
 */
function createRateLimitResponse(retryAfter = 60) {
  return createErrorResponse(
    'Demasiadas solicitudes',
    `Intenta de nuevo en ${retryAfter} segundos`,
    'RATE_LIMIT_EXCEEDED',
    {
      retryAfter
    }
  );
}

/**
 * Factory para crear respuestas de mantenimiento
 * @param {string} estimatedDuration - Duración estimada del mantenimiento
 * @returns {Object} Respuesta de mantenimiento
 */
function createMaintenanceResponse(estimatedDuration = 'desconocida') {
  return createErrorResponse(
    'Servicio en mantenimiento',
    `El servicio está temporalmente no disponible. Duración estimada: ${estimatedDuration}`,
    'SERVICE_MAINTENANCE'
  );
}

/**
 * Factory para crear respuestas de health check
 * @param {Object} healthStatus - Estado de salud de los servicios
 * @returns {Object} Respuesta de health check
 */
function createHealthCheckResponse(healthStatus) {
  const isHealthy = Object.values(healthStatus).every(status => 
    status.status === 'healthy' || status.status === 'ok'
  );

  return {
    success: true,
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: healthStatus,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };
}

/**
 * Factory para crear respuestas de búsqueda
 * @param {Array} results - Resultados de la búsqueda
 * @param {string} query - Término de búsqueda
 * @param {Object} searchMetadata - Metadatos de la búsqueda
 * @returns {Object} Respuesta de búsqueda
 */
function createSearchResponse(results, query, searchMetadata = {}) {
  const {
    totalResults = results.length,
    searchTime,
    appliedFilters = {},
    suggestions = []
  } = searchMetadata;

  return createSuccessResponse({
    results,
    query,
    totalResults,
    searchMetadata: {
      searchTime,
      appliedFilters,
      suggestions,
      hasResults: results.length > 0
    }
  }, `${totalResults} resultados encontrados para "${query}"`);
}

/**
 * Middleware para inyectar utilidades de respuesta en el objeto res
 */
function injectResponseHelpers(req, res, next) {
  // Agregar métodos helper al objeto response
  res.success = (data, message, metadata) => {
    return res.json(createSuccessResponse(data, message, metadata));
  };

  res.error = (message, details, code, statusCode = 400) => {
    return res.status(statusCode).json(createErrorResponse(message, details, code));
  };

  res.created = (resource, resourceType, location) => {
    return res.status(201).json(createCreatedResponse(resource, resourceType, location));
  };

  res.updated = (resource, resourceType, updatedFields) => {
    return res.json(createUpdatedResponse(resource, resourceType, updatedFields));
  };

  res.deleted = (resourceType, resourceId) => {
    return res.json(createDeletedResponse(resourceType, resourceId));
  };

  res.notFound = (resourceType, identifier) => {
    return res.status(404).json(createNotFoundResponse(resourceType, identifier));
  };

  res.unauthorized = (resource, action) => {
    return res.status(403).json(createUnauthorizedResponse(resource, action));
  };

  res.paginated = (items, paginationInfo, message) => {
    return res.json(createPaginatedResponse(items, paginationInfo, message));
  };

  next();
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
  createCreatedResponse,
  createUpdatedResponse,
  createDeletedResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createRateLimitResponse,
  createMaintenanceResponse,
  createHealthCheckResponse,
  createSearchResponse,
  injectResponseHelpers
};