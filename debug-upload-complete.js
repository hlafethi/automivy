const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 [DEBUG] Début du test complet d\'upload...');

// 1. Vérifier la base de données
async function testDatabase() {
  try {
    console.log('📊 [DEBUG] Test de la base de données...');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ [DEBUG] Base de données connectée:', result.rows[0].now);
    await pool.end();
  } catch (error) {
    console.error('❌ [DEBUG] Erreur base de données:', error.message);
  }
}

// 2. Vérifier le répertoire uploads
function testUploadDirectory() {
  console.log('📁 [DEBUG] Test du répertoire uploads...');
  const uploadDir = path.join(__dirname, 'backend/public/uploads');
  console.log('📁 [DEBUG] Chemin uploads:', uploadDir);
  
  if (!fs.existsSync(uploadDir)) {
    console.log('📁 [DEBUG] Création du répertoire...');
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Test d'écriture
  try {
    const testFile = path.join(uploadDir, 'test-write.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ [DEBUG] Répertoire uploads OK');
  } catch (error) {
    console.error('❌ [DEBUG] Erreur répertoire uploads:', error.message);
  }
}

// 3. Tester Multer
function testMulter() {
  console.log('🔧 [DEBUG] Test de Multer...');
  try {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'backend/public/uploads');
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        cb(null, 'test-' + Date.now() + '.txt');
      }
    });
    
    const upload = multer({ storage });
    console.log('✅ [DEBUG] Multer configuré');
  } catch (error) {
    console.error('❌ [DEBUG] Erreur Multer:', error.message);
  }
}

// 4. Créer un serveur de test
function createTestServer() {
  console.log('🌐 [DEBUG] Création du serveur de test...');
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Configuration Multer pour le test
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'backend/public/uploads');
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, 'test-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      console.log('🔍 [DEBUG] Fichier reçu:', file.originalname, 'Type:', file.mimetype);
      cb(null, true);
    }
  });
  
  // Route de test
  app.post('/test-upload', upload.single('media'), (req, res) => {
    console.log('🔍 [DEBUG] Upload reçu:', req.file);
    res.json({ success: true, file: req.file });
  });
  
  const server = app.listen(3005, () => {
    console.log('✅ [DEBUG] Serveur de test démarré sur port 3005');
    console.log('🔗 [DEBUG] Testez avec: curl -X POST -F "media=@test.txt" http://localhost:3005/test-upload');
  });
  
  return server;
}

// 5. Exécuter tous les tests
async function runAllTests() {
  await testDatabase();
  testUploadDirectory();
  testMulter();
  
  const server = createTestServer();
  
  // Arrêter après 10 secondes
  setTimeout(() => {
    console.log('🛑 [DEBUG] Arrêt du serveur de test...');
    server.close();
    process.exit(0);
  }, 10000);
}

runAllTests().catch(console.error);
