const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configuration multer pour l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|mp4|webm|mov|avi)$/i;
    const allowedMimeTypes = /^(image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|webm|mov|avi))$/;
    
    const extname = allowedExtensions.test(path.extname(file.originalname));
    const mimetype = allowedMimeTypes.test(file.mimetype);

    console.log('🔍 [Media] Fichier reçu:', file.originalname);
    console.log('🔍 [Media] MIME type:', file.mimetype);
    console.log('🔍 [Media] Extension valide:', extname);
    console.log('🔍 [Media] MIME type valide:', mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      console.log('❌ [Media] Type de fichier rejeté:', file.originalname, file.mimetype);
      cb(new Error('Type de fichier non autorisé. Seuls les images (JPEG, PNG, GIF, WebP) et vidéos (MP4, WebM, MOV, AVI) sont acceptés.'));
    }
  }
});

// POST /api/media/upload - Upload d'un fichier média
router.post('/upload', (req, res, next) => {
  console.log('🚨 [Media] Route /upload appelée');
  console.log('🚨 [Media] Headers:', req.headers);
  console.log('🚨 [Media] Content-Type:', req.headers['content-type']);
  console.log('🚨 [Media] Content-Length:', req.headers['content-length']);
  next();
}, authenticateToken, (req, res, next) => {
  console.log('🚨 [Media] Après authenticateToken');
  next();
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ [Media] Erreur Multer:', err.code, err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Fichier trop volumineux. Taille maximale: 50MB' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    console.error('❌ [Media] Erreur générale:', err.message);
    return res.status(500).json({ error: err.message });
  }
  next();
}, upload.single('media'), async (req, res) => {
  try {
    console.log('🚨 [Media] Dans la route upload');
    console.log('🚨 [Media] req.file:', req.file);
    console.log('🚨 [Media] req.body:', req.body);
    
    if (!req.file) {
      console.log('❌ [Media] Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    console.log('🔍 [Media] Upload de fichier:', req.file.filename);
    console.log('🔍 [Media] Type:', req.file.mimetype);
    console.log('🔍 [Media] Taille:', req.file.size);

    const fileUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ [Media] Fichier uploadé avec succès:', fileUrl);
    
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      url: fileUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('❌ [Media] Erreur lors de l\'upload:', error);
    console.error('❌ [Media] Stack:', error.stack);
    res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
  }
});

// GET /api/media/list - Lister les fichiers uploadés
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../public/uploads');
    
    if (!fs.existsSync(uploadDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        url: `/uploads/${filename}`,
        size: stats.size,
        created: stats.birthtime,
        isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(filename),
        isVideo: /\.(mp4|webm|mov|avi)$/i.test(filename)
      };
    });

    console.log('✅ [Media] Liste des fichiers récupérée:', files.length);
    res.json(files);
  } catch (error) {
    console.error('❌ [Media] Erreur lors de la récupération de la liste:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers' });
  }
});

// DELETE /api/media/:filename - Supprimer un fichier
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../public/uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ [Media] Fichier supprimé:', filename);
      res.json({ success: true, message: 'Fichier supprimé avec succès' });
    } else {
      res.status(404).json({ error: 'Fichier non trouvé' });
    }
  } catch (error) {
    console.error('❌ [Media] Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
});

module.exports = router;
