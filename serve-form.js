// Serveur simple pour servir le formulaire d'upload
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005; // Port différent pour éviter les conflits

// Servir les fichiers statiques
app.use(express.static(__dirname));

// Route pour le formulaire personnalisé
app.get('/upload-form-personalized.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload-form-personalized.html'));
});

// Route pour le formulaire PDF simple
app.get('/pdf-upload-form.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pdf-upload-form.html'));
});

// Route de test
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Serveur de formulaires actif',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de formulaires démarré sur http://localhost:${PORT}`);
  console.log(`📋 Formulaire personnalisé: http://localhost:${PORT}/upload-form-personalized.html`);
  console.log(`📄 Formulaire PDF simple: http://localhost:${PORT}/pdf-upload-form.html`);
});
