const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
  console.log('🔐 [Auth] Middleware authenticateToken appelé');
  console.log('🔐 [Auth] Path:', req.path);
  console.log('🔐 [Auth] Method:', req.method);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('🔐 [Auth] Auth header présent:', !!authHeader);
  console.log('🔐 [Auth] Token présent:', !!token);

  if (!token) {
    console.log('❌ [Auth] Token manquant');
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      console.log('❌ [Auth] Token invalide:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('✅ [Auth] Token valide pour user:', user.email);
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  console.log('🔐 [Auth] Middleware requireAdmin appelé');
  console.log('🔐 [Auth] User role:', req.user?.role);
  console.log('🔐 [Auth] User email:', req.user?.email);
  
  if (req.user.role !== 'admin') {
    console.log('❌ [Auth] Accès refusé - rôle non admin:', req.user?.role);
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log('✅ [Auth] Accès admin autorisé');
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin
};
