/**
 * Service pour gérer les tables NocoDB par utilisateur
 * Crée automatiquement les tables isolées pour chaque utilisateur
 */

const db = require('../database');
const logger = require('../utils/logger');
const fetch = require('node-fetch');

/**
 * Crée les tables NocoDB pour un utilisateur (posts et users)
 * @param {string} userId - ID de l'utilisateur
 * @param {string} userEmail - Email de l'utilisateur (pour logging)
 * @returns {Promise<{postsTable: object, usersTable: object}>}
 */
async function createUserTables(userId, userEmail = '') {
  logger.info('📊 [NocoDB] Création des tables pour l\'utilisateur', { userId, userEmail });
  
  // ⚠️ CRITIQUE: Calculer userIdShort au début pour qu'il soit accessible partout
  const userIdShort = userId ? userId.substring(0, 8).replace(/-/g, '') : '';
  
  // Récupérer les credentials NocoDB
  let nocoDbApiToken = null;
  let nocoDbBaseUrl = null;
  let nocoDbBaseId = null;
  
  try {
    // Récupérer depuis admin_api_keys (sans additional_data car la colonne peut ne pas exister)
    const nocoDbCreds = await db.query(
      'SELECT api_key FROM admin_api_keys WHERE service_name = $1 AND is_active = true LIMIT 1',
      ['nocodb_api_token']
    );
    
    if (nocoDbCreds.rows.length > 0) {
      nocoDbApiToken = nocoDbCreds.rows[0].api_key;
      logger.info('✅ [NocoDB] Token récupéré depuis admin_api_keys');
    }
  } catch (dbError) {
    logger.warn('⚠️ [NocoDB] Erreur récupération credentials depuis BDD:', dbError.message);
  }
  
  // Fallback vers .env
  if (!nocoDbApiToken) {
    nocoDbApiToken = process.env.NOCODB_API_TOKEN;
  }
  if (!nocoDbBaseUrl) {
    nocoDbBaseUrl = process.env.NOCODB_BASE_URL;
  }
  if (!nocoDbBaseId) {
    nocoDbBaseId = process.env.NOCODB_BASE_ID;
  }
  
  // Vérifications
  if (!nocoDbApiToken) {
    throw new Error('NOCODB_API_TOKEN non configuré. L\'administrateur doit configurer le token NocoDB.');
  }
  if (!nocoDbBaseUrl) {
    throw new Error('NOCODB_BASE_URL non configuré. L\'administrateur doit configurer l\'URL NocoDB.');
  }
  if (!nocoDbBaseId) {
    throw new Error('NOCODB_BASE_ID non configuré. L\'administrateur doit configurer l\'ID de la base NocoDB.');
  }
  
  // Générer les noms de tables isolés par utilisateur (userIdShort déjà calculé au début)
  const postsTableName = `posts_user_${userIdShort}`;
  const usersTableName = `users_user_${userIdShort}`;
  
  logger.info('📊 [NocoDB] Tables à créer', {
    postsTable: postsTableName,
    usersTable: usersTableName,
    baseUrl: nocoDbBaseUrl,
    baseId: nocoDbBaseId
  });
  
  const results = {
    postsTable: null,
    usersTable: null
  };
  
  // 1. Créer la table posts
  try {
    const postsTable = await createTable(nocoDbBaseUrl, nocoDbBaseId, nocoDbApiToken, {
      table_name: postsTableName,
      title: `Posts LinkedIn - ${userEmail || userIdShort}`,
      columns: [
        {
          column_name: 'theme',
          title: 'Thème',
          dt: 'varchar',
          rqd: false
        },
        {
          column_name: 'content',
          title: 'Contenu',
          dt: 'text',
          rqd: false
        },
        {
          column_name: 'status',
          title: 'Statut',
          dt: 'varchar',
          rqd: false,
          cdf: "'pending'"
        },
        {
          column_name: 'userId',
          title: 'User ID',
          dt: 'varchar',
          rqd: true
        },
        {
          column_name: 'linkedinPostId',
          title: 'LinkedIn Post ID',
          dt: 'varchar',
          rqd: false
        },
        {
          column_name: 'createdAt',
          title: 'Créé le',
          dt: 'timestamp',
          rqd: false
        },
        {
          column_name: 'publishedAt',
          title: 'Publié le',
          dt: 'timestamp',
          rqd: false
        }
      ]
    });
    
    results.postsTable = postsTable;
    logger.info('✅ [NocoDB] Table posts créée:', postsTableName);
  } catch (error) {
    // Si la table existe déjà (plusieurs formats d'erreur possibles), essayer de la récupérer
    const errorMessage = error.message || '';
    const errorText = error.error || '';
    const isDuplicateError = errorMessage.includes('already exists') || 
                             errorMessage.includes('DUPLICATE_ALIAS') ||
                             errorMessage.includes('duplicate') ||
                             errorText.includes('DUPLICATE_ALIAS') ||
                             errorText.includes('already exists');
    
    if (isDuplicateError) {
      logger.info('ℹ️ [NocoDB] Table posts existe déjà, récupération...', { tableName: postsTableName });
      try {
        const existingTable = await getTableByName(nocoDbBaseUrl, nocoDbBaseId, nocoDbApiToken, postsTableName);
        if (existingTable) {
          results.postsTable = existingTable;
          logger.info('✅ [NocoDB] Table posts récupérée:', postsTableName, { tableId: existingTable.id || existingTable.fk_model_id || existingTable.table_id });
        } else {
          logger.warn('⚠️ [NocoDB] Table posts signalée comme existante mais non trouvée lors de la récupération');
        }
      } catch (getError) {
        logger.warn('⚠️ [NocoDB] Impossible de récupérer la table posts existante:', getError.message);
      }
    } else {
      logger.error('❌ [NocoDB] Erreur création table posts:', error);
      // Ne pas bloquer le déploiement si la table ne peut pas être créée
      // Les tables pourront être créées manuellement ou lors de la première utilisation
      logger.warn('⚠️ [NocoDB] Le déploiement continuera sans la table posts. Créez-la manuellement dans NocoDB si nécessaire.');
    }
  }
  
  // 2. Créer la table users
  try {
    const usersTable = await createTable(nocoDbBaseUrl, nocoDbBaseId, nocoDbApiToken, {
      table_name: usersTableName,
      title: `Users LinkedIn - ${userEmail || userIdShort}`,
      columns: [
        {
          column_name: 'userId',
          title: 'User ID',
          dt: 'varchar',
          rqd: true
        },
        {
          column_name: 'email',
          title: 'Email',
          dt: 'varchar',
          rqd: false
        },
        {
          column_name: 'linkedinAccessToken',
          title: 'LinkedIn Access Token',
          dt: 'text',
          rqd: false
        },
        {
          column_name: 'linkedinRefreshToken',
          title: 'LinkedIn Refresh Token',
          dt: 'text',
          rqd: false
        },
        {
          column_name: 'tokenExpiresAt',
          title: 'Token Expires At',
          dt: 'timestamp',
          rqd: false
        },
        {
          column_name: 'createdAt',
          title: 'Créé le',
          dt: 'timestamp',
          rqd: false
        },
        {
          column_name: 'updatedAt',
          title: 'Mis à jour le',
          dt: 'timestamp',
          rqd: false
        }
      ]
    });
    
    results.usersTable = usersTable;
    logger.info('✅ [NocoDB] Table users créée:', usersTableName);
  } catch (error) {
    // Si la table existe déjà (plusieurs formats d'erreur possibles), essayer de la récupérer
    const errorMessage = error.message || '';
    const errorText = error.error || '';
    const isDuplicateError = errorMessage.includes('already exists') || 
                             errorMessage.includes('DUPLICATE_ALIAS') ||
                             errorMessage.includes('duplicate') ||
                             errorText.includes('DUPLICATE_ALIAS') ||
                             errorText.includes('already exists');
    
    if (isDuplicateError) {
      logger.info('ℹ️ [NocoDB] Table users existe déjà, récupération...', { tableName: usersTableName });
      try {
        const existingTable = await getTableByName(nocoDbBaseUrl, nocoDbBaseId, nocoDbApiToken, usersTableName);
        if (existingTable) {
          results.usersTable = existingTable;
          logger.info('✅ [NocoDB] Table users récupérée:', usersTableName, { tableId: existingTable.id || existingTable.fk_model_id || existingTable.table_id });
        } else {
          logger.warn('⚠️ [NocoDB] Table users signalée comme existante mais non trouvée lors de la récupération');
        }
      } catch (getError) {
        logger.warn('⚠️ [NocoDB] Impossible de récupérer la table users existante:', getError.message);
      }
    } else {
      logger.error('❌ [NocoDB] Erreur création table users:', error);
      // Ne pas bloquer le déploiement si la table ne peut pas être créée
      // Les tables pourront être créées manuellement ou lors de la première utilisation
      logger.warn('⚠️ [NocoDB] Le déploiement continuera sans la table users. Créez-la manuellement dans NocoDB si nécessaire.');
    }
  }
  
  logger.info('✅ [NocoDB] Tables créées/récupérées avec succès', {
    postsTable: results.postsTable?.table_name || results.postsTable?.title,
    usersTable: results.usersTable?.table_name || results.usersTable?.title
  });
  
  return results;
}

/**
 * Crée une table dans NocoDB
 * @param {string} baseUrl - URL de base NocoDB
 * @param {string} baseId - ID de la base
 * @param {string} apiToken - Token API NocoDB
 * @param {object} tableData - Données de la table à créer
 * @returns {Promise<object>}
 */
async function createTable(baseUrl, baseId, apiToken, tableData) {
  const url = `${baseUrl}/api/v2/meta/bases/${baseId}/tables`;
  
  logger.debug('📊 [NocoDB] Création table:', {
    url,
    tableName: tableData.table_name,
    columnsCount: tableData.columns?.length || 0
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xc-token': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tableData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    logger.error('❌ [NocoDB] Erreur création table:', {
      status: response.status,
      error: errorText,
      tableName: tableData.table_name
    });
    
    // Vérifier si la table existe déjà (plusieurs formats d'erreur possibles)
    const isDuplicateError = errorText.includes('already exists') || 
                             errorText.includes('DUPLICATE_ALIAS') ||
                             errorText.includes('duplicate') ||
                             errorText.toLowerCase().includes('duplicate');
    
    if (isDuplicateError) {
      const duplicateError = new Error(`Table ${tableData.table_name} existe déjà`);
      duplicateError.error = errorText; // Ajouter l'erreur complète pour la détection
      duplicateError.message = errorText; // S'assurer que message contient aussi l'erreur
      throw duplicateError;
    }
    
    throw new Error(`Erreur création table NocoDB: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  logger.debug('✅ [NocoDB] Table créée:', result);
  return result;
}

/**
 * Récupère une table par son nom
 * @param {string} baseUrl - URL de base NocoDB
 * @param {string} baseId - ID de la base
 * @param {string} apiToken - Token API NocoDB
 * @param {string} tableName - Nom de la table
 * @returns {Promise<object|null>}
 */
async function getTableByName(baseUrl, baseId, apiToken, tableName) {
  const url = `${baseUrl}/api/v2/meta/bases/${baseId}/tables`;
  
  logger.debug('🔍 [NocoDB] Recherche table par nom:', { tableName, baseId });
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xc-token': apiToken,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    logger.error('❌ [NocoDB] Erreur récupération tables:', {
      status: response.status,
      error: errorText
    });
    throw new Error(`Erreur récupération tables: ${response.status} - ${errorText}`);
  }
  
  const responseData = await response.json();
  
  logger.debug('🔍 [NocoDB] Structure de la réponse API:', {
    isArray: Array.isArray(responseData),
    type: typeof responseData,
    keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
    sample: JSON.stringify(responseData).substring(0, 500)
  });
  
  // ⚠️ CRITIQUE: L'API NocoDB peut retourner un tableau directement ou un objet avec une propriété 'list'
  let tables = null;
  if (Array.isArray(responseData)) {
    tables = responseData;
    logger.debug('✅ [NocoDB] Réponse est un tableau direct');
  } else if (responseData && Array.isArray(responseData.list)) {
    tables = responseData.list;
    logger.debug('✅ [NocoDB] Réponse contient un tableau dans .list');
  } else if (responseData && typeof responseData === 'object') {
    // Essayer de trouver un tableau dans l'objet
    const arrayKey = Object.keys(responseData).find(key => Array.isArray(responseData[key]));
    if (arrayKey) {
      tables = responseData[arrayKey];
      logger.debug(`✅ [NocoDB] Réponse contient un tableau dans .${arrayKey}`);
    } else {
      // Peut-être que l'API retourne un objet avec les tables directement
      // Vérifier si c'est un objet avec des propriétés qui ressemblent à des tables
      logger.debug('⚠️ [NocoDB] Aucun tableau trouvé dans la réponse, vérification de la structure...');
    }
  }
  
  if (!Array.isArray(tables)) {
    logger.warn('⚠️ [NocoDB] Réponse inattendue lors de la récupération des tables:', {
      type: typeof responseData,
      keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : null,
      sample: JSON.stringify(responseData).substring(0, 500)
    });
    return null;
  }
  
  logger.debug('🔍 [NocoDB] Tables disponibles:', {
    count: tables.length,
    tableNames: tables.map(t => ({ 
      table_name: t.table_name, 
      title: t.title, 
      id: t.id || t.fk_model_id || t.table_id,
      alias: t.alias
    }))
  });
  
  // Chercher la table par son nom (table_name) ou par son titre ou alias
  // Essayer plusieurs variantes : table_name exact, title exact, alias exact, ou partie du nom
  const table = tables.find(t => {
    const tName = t.table_name?.toLowerCase() || '';
    const tTitle = t.title?.toLowerCase() || '';
    const tAlias = t.alias?.toLowerCase() || '';
    const searchName = tableName.toLowerCase();
    
    return t.table_name === tableName || 
           tName === searchName ||
           t.title === tableName ||
           tTitle === searchName ||
           t.alias === tableName ||
           tAlias === searchName ||
           (t.table_name && tName.includes(searchName)) ||
           (t.title && tTitle.includes(searchName)) ||
           (t.alias && tAlias.includes(searchName));
  });
  
  if (table) {
    logger.info('✅ [NocoDB] Table trouvée:', { 
      searchedName: tableName,
      foundTableName: table.table_name,
      foundTitle: table.title,
      tableId: table.id || table.fk_model_id || table.table_id 
    });
    return table;
  }
  
  logger.warn('⚠️ [NocoDB] Table non trouvée:', {
    searchedName: tableName,
    availableTables: tables.map(t => ({ table_name: t.table_name, title: t.title }))
  });
  return null;
}

module.exports = {
  createUserTables,
  createTable,
  getTableByName
};

