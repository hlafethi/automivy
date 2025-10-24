const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

// Middleware pour logger les requêtes API
const logApiRequest = async (req, res, next) => {
  const startTime = Date.now();
  
  // Intercepter la réponse pour calculer la durée
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Logger la requête (de manière asynchrone pour ne pas bloquer)
    logSystemEvent({
      level: res.statusCode >= 400 ? 'ERROR' : 'INFO',
      category: 'API',
      message: `${req.method} ${req.path} - ${res.statusCode}`,
      details: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration_ms: duration,
        userAgent: req.get('User-Agent')
      },
      user_id: req.user?.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      request_id: req.headers['x-request-id'],
      duration_ms: duration
    }).catch(console.error);
    
    originalSend.call(this, data);
  };
  
  next();
};

// Fonction pour logger un événement système
const logSystemEvent = async (logData) => {
  try {
    const query = `
      INSERT INTO system_logs (level, category, message, details, user_id, session_id, ip_address, user_agent, request_id, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    await pool.query(query, [
      logData.level,
      logData.category,
      logData.message,
      JSON.stringify(logData.details),
      logData.user_id,
      logData.session_id,
      logData.ip_address,
      logData.user_agent,
      logData.request_id,
      logData.duration_ms
    ]);
  } catch (error) {
    console.error('Erreur lors du logging système:', error);
  }
};

// Fonction pour logger une action d'audit
const logAuditEvent = async (auditData) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, session_id, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    
    await pool.query(query, [
      auditData.user_id,
      auditData.action,
      auditData.resource_type,
      auditData.resource_id,
      auditData.old_values ? JSON.stringify(auditData.old_values) : null,
      auditData.new_values ? JSON.stringify(auditData.new_values) : null,
      auditData.ip_address,
      auditData.user_agent,
      auditData.session_id,
      auditData.success,
      auditData.error_message
    ]);
  } catch (error) {
    console.error('Erreur lors du logging d\'audit:', error);
  }
};

// Fonction pour logger une erreur
const logError = async (errorData) => {
  try {
    const query = `
      INSERT INTO error_logs (level, error_type, message, stack_trace, context, user_id, session_id, ip_address, user_agent, request_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    await pool.query(query, [
      errorData.level,
      errorData.error_type,
      errorData.message,
      errorData.stack_trace,
      errorData.context ? JSON.stringify(errorData.context) : null,
      errorData.user_id,
      errorData.session_id,
      errorData.ip_address,
      errorData.user_agent,
      errorData.request_id
    ]);
  } catch (error) {
    console.error('Erreur lors du logging d\'erreur:', error);
  }
};

// Fonction pour logger les performances
const logPerformance = async (perfData) => {
  try {
    const query = `
      INSERT INTO performance_logs (operation, duration_ms, memory_usage_mb, cpu_usage_percent, endpoint, method, status_code, user_id, request_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await pool.query(query, [
      perfData.operation,
      perfData.duration_ms,
      perfData.memory_usage_mb,
      perfData.cpu_usage_percent,
      perfData.endpoint,
      perfData.method,
      perfData.status_code,
      perfData.user_id,
      perfData.request_id
    ]);
  } catch (error) {
    console.error('Erreur lors du logging de performance:', error);
  }
};

module.exports = {
  logApiRequest,
  logSystemEvent,
  logAuditEvent,
  logError,
  logPerformance
};
