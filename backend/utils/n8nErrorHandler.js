/**
 * Gestionnaire d'erreurs n8n avec parsing et messages clairs
 */

const logger = require('./logger');

/**
 * Parse une erreur n8n et retourne un message clair
 * @param {Error|Response} error - Erreur ou réponse HTTP
 * @param {string} operation - Opération en cours (create, update, activate, etc.)
 * @returns {Object} Objet avec message, code, et détails
 */
async function parseN8nError(error, operation = 'unknown') {
  // Si c'est une réponse HTTP
  if (error && typeof error.text === 'function') {
    const status = error.status || error.statusCode || 500;
    let errorText;
    try {
      errorText = await error.text();
    } catch (e) {
      errorText = error.statusText || 'Erreur inconnue';
    }
    
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch (e) {
      // Pas du JSON, utiliser le texte brut
      errorJson = { message: errorText };
    }
    
    return {
      message: getErrorMessage(errorJson, status, operation),
      code: status,
      details: errorJson,
      originalError: errorText
    };
  }
  
  // Si c'est une Error
  if (error instanceof Error) {
    // Essayer de parser le message si c'est une erreur n8n
    const n8nMatch = error.message.match(/n8n API error \((\d+)\): (.+)/);
    if (n8nMatch) {
      const status = parseInt(n8nMatch[1]);
      const errorText = n8nMatch[2];
      
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        errorJson = { message: errorText };
      }
      
      return {
        message: getErrorMessage(errorJson, status, operation),
        code: status,
        details: errorJson,
        originalError: errorText
      };
    }
    
    // Erreur générique
    return {
      message: `Erreur lors de l'opération ${operation}: ${error.message}`,
      code: 500,
      details: { message: error.message },
      originalError: error.message
    };
  }
  
  // Erreur inconnue
  return {
    message: `Erreur inconnue lors de l'opération ${operation}`,
    code: 500,
    details: { error: String(error) },
    originalError: String(error)
  };
}

/**
 * Génère un message d'erreur clair selon le code HTTP et l'opération
 */
function getErrorMessage(errorJson, statusCode, operation) {
  const operationNames = {
    create: 'création du workflow',
    update: 'mise à jour du workflow',
    activate: 'activation du workflow',
    delete: 'suppression du workflow',
    get: 'récupération du workflow',
    credential: 'création du credential'
  };
  
  const operationName = operationNames[operation] || operation;
  
  // Messages selon le code HTTP
  switch (statusCode) {
    case 400:
      return `Erreur de validation lors de la ${operationName}. ${errorJson.message || 'Données invalides'}`;
    
    case 401:
      return `Erreur d'authentification n8n. Vérifiez la clé API.`;
    
    case 403:
      return `Accès refusé à l'API n8n. Vérifiez les permissions.`;
    
    case 404:
      return `Ressource n8n non trouvée lors de la ${operationName}.`;
    
    case 409:
      return `Conflit lors de la ${operationName}. La ressource existe peut-être déjà.`;
    
    case 422:
      return `Erreur de validation n8n lors de la ${operationName}. ${errorJson.message || 'Workflow ou credential invalide'}`;
    
    case 429:
      return `Trop de requêtes vers n8n. Veuillez réessayer plus tard.`;
    
    case 500:
    case 502:
    case 503:
      return `Erreur serveur n8n lors de la ${operationName}. ${errorJson.message || 'Le service n8n est peut-être indisponible'}`;
    
    default:
      return `Erreur n8n (${statusCode}) lors de la ${operationName}. ${errorJson.message || 'Erreur inconnue'}`;
  }
}

/**
 * Wrapper pour les appels API n8n avec gestion d'erreurs améliorée
 * @param {Function} apiCall - Fonction async qui fait l'appel API
 * @param {string} operation - Nom de l'opération
 * @returns {Promise} Résultat de l'appel API
 */
async function handleN8nApiCall(apiCall, operation = 'unknown') {
  try {
    return await apiCall();
  } catch (error) {
    const parsedError = await parseN8nError(error, operation);
    
    logger.error('Erreur API n8n', {
      operation,
      code: parsedError.code,
      message: parsedError.message,
      details: parsedError.details
    });
    
    // Créer une nouvelle erreur avec le message parsé
    const enhancedError = new Error(parsedError.message);
    enhancedError.code = parsedError.code;
    enhancedError.details = parsedError.details;
    enhancedError.originalError = parsedError.originalError;
    enhancedError.operation = operation;
    
    throw enhancedError;
  }
}

module.exports = {
  parseN8nError,
  getErrorMessage,
  handleN8nApiCall
};

