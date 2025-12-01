/**
 * Utilitaires pour standardiser les réponses API
 */

/**
 * Format de réponse standardisé pour succès
 * @param {Object} res - Objet response Express
 * @param {*} data - Données à retourner
 * @param {Object} metadata - Métadonnées optionnelles
 * @param {number} statusCode - Code de statut HTTP (défaut: 200)
 */
function sendSuccess(res, data, metadata = {}, statusCode = 200) {
  const response = {
    success: true,
    data: data
  };
  
  if (Object.keys(metadata).length > 0) {
    response.metadata = metadata;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Format de réponse standardisé pour erreur
 * @param {Object} res - Objet response Express
 * @param {string} error - Message d'erreur
 * @param {string} details - Détails optionnels de l'erreur
 * @param {Object} context - Contexte optionnel (templateId, workflowId, etc.)
 * @param {number} statusCode - Code de statut HTTP (défaut: 500)
 */
function sendError(res, error, details = null, context = {}, statusCode = 500) {
  const response = {
    success: false,
    error: error
  };
  
  if (details) {
    response.details = details;
  }
  
  if (Object.keys(context).length > 0) {
    response.context = context;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Format de réponse standardisé pour erreur de validation (400)
 * @param {Object} res - Objet response Express
 * @param {string} error - Message d'erreur
 * @param {string} details - Détails optionnels de l'erreur
 * @param {Object} context - Contexte optionnel
 */
function sendValidationError(res, error, details = null, context = {}) {
  return sendError(res, error, details, context, 400);
}

/**
 * Format de réponse standardisé pour ressource non trouvée (404)
 * @param {Object} res - Objet response Express
 * @param {string} error - Message d'erreur
 * @param {Object} context - Contexte optionnel
 */
function sendNotFound(res, error, context = {}) {
  return sendError(res, error, null, context, 404);
}

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound
};

