// Générer un token JWT valide pour le test
const jwt = require('jsonwebtoken');

// Clé secrète (doit correspondre à celle du backend)
const JWT_SECRET = 'your-secret-key-change-in-production';

// Données utilisateur
const user = {
  id: '8c210030-7d0a-48ee-97d2-b74564b1efef',
  email: 'user@heleam.com',
  role: 'user'
};

// Générer le token
const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

console.log('🔑 [Token] Token généré:');
console.log(token);

console.log('\n📋 [Token] Détails:');
console.log('User ID:', user.id);
console.log('Email:', user.email);
console.log('Role:', user.role);
console.log('Expires in: 24h');
