/**
 * Routes pour le traitement FFmpeg
 * 
 * Endpoint API pour le montage vidéo avec FFmpeg
 * Utilisé par les workflows n8n qui ne peuvent pas exécuter FFmpeg directement
 * (car le nœud Code n8n bloque les modules natifs comme child_process)
 */

const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

/**
 * POST /api/ffmpeg/merge
 * 
 * Fusionne un fichier audio et un fichier média (image/vidéo) en une vidéo MP4
 * 
 * Body (JSON):
 * - audio: { data: string (base64), mimeType: string, fileName: string }
 * - media: { data: string (base64), mimeType: string, fileName: string } (optionnel)
 * - options: { duration?: number, outputFormat?: string }
 * 
 * Response:
 * - { success: true, video: { data: string (base64), mimeType: string, fileName: string, fileSize: number } }
 */
router.post('/merge', async (req, res) => {
  const startTime = Date.now();
  logger.info('🎬 [FFmpeg] Requête de montage vidéo reçue');
  
  const tempFiles = [];
  
  try {
    const { audio, media, options = {} } = req.body;
    
    // Validation
    if (!audio || !audio.data) {
      return res.status(400).json({
        success: false,
        error: 'Fichier audio requis (audio.data en base64)'
      });
    }
    
    // Créer le répertoire temporaire
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const sessionId = Math.random().toString(36).substring(7);
    
    // Écrire le fichier audio
    const audioExt = getExtensionFromMimeType(audio.mimeType) || '.mp3';
    const audioPath = path.join(tempDir, `audio_${timestamp}_${sessionId}${audioExt}`);
    const audioBuffer = Buffer.from(audio.data, 'base64');
    fs.writeFileSync(audioPath, audioBuffer);
    tempFiles.push(audioPath);
    logger.debug(`📁 [FFmpeg] Audio écrit: ${audioPath} (${audioBuffer.length} bytes)`);
    
    // Fichier de sortie
    const outputPath = path.join(tempDir, `output_${timestamp}_${sessionId}.mp4`);
    tempFiles.push(outputPath);
    
    let ffmpegCommand;
    
    if (media && media.data) {
      // Écrire le fichier média
      const mediaExt = getExtensionFromMimeType(media.mimeType) || '.mp4';
      const mediaPath = path.join(tempDir, `media_${timestamp}_${sessionId}${mediaExt}`);
      const mediaBuffer = Buffer.from(media.data, 'base64');
      fs.writeFileSync(mediaPath, mediaBuffer);
      tempFiles.push(mediaPath);
      logger.debug(`📁 [FFmpeg] Média écrit: ${mediaPath} (${mediaBuffer.length} bytes)`);
      
      // Déterminer si c'est une image ou une vidéo
      const isImage = media.mimeType?.startsWith('image/');
      
      if (isImage) {
        // Image + Audio → Vidéo avec image fixe
        const duration = options.duration || Math.ceil(audioBuffer.length / 16000); // Estimation de la durée
        ffmpegCommand = `ffmpeg -y -loop 1 -i "${mediaPath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -t ${duration} "${outputPath}"`;
      } else {
        // Vidéo + Audio → Vidéo combinée
        ffmpegCommand = `ffmpeg -y -i "${mediaPath}" -i "${audioPath}" -c:v copy -c:a aac -strict experimental -shortest "${outputPath}"`;
      }
    } else {
      // Audio seul → Vidéo avec fond noir
      const duration = options.duration || Math.ceil(audioBuffer.length / 16000);
      ffmpegCommand = `ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=${duration} -i "${audioPath}" -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`;
    }
    
    logger.info(`🎬 [FFmpeg] Exécution: ${ffmpegCommand.substring(0, 100)}...`);
    
    // Exécuter FFmpeg
    try {
      execSync(ffmpegCommand, { 
        timeout: 300000, // 5 minutes max
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (ffmpegError) {
      logger.error(`❌ [FFmpeg] Erreur d'exécution:`, ffmpegError.message);
      throw new Error(`FFmpeg error: ${ffmpegError.stderr?.toString() || ffmpegError.message}`);
    }
    
    // Vérifier que le fichier de sortie existe
    if (!fs.existsSync(outputPath)) {
      throw new Error('Le fichier de sortie n\'a pas été créé');
    }
    
    // Lire le fichier de sortie
    const outputBuffer = fs.readFileSync(outputPath);
    logger.info(`✅ [FFmpeg] Vidéo créée: ${outputBuffer.length} bytes`);
    
    // Calculer le temps de traitement
    const processingTime = Date.now() - startTime;
    
    // Retourner le résultat
    res.json({
      success: true,
      video: {
        data: outputBuffer.toString('base64'),
        mimeType: 'video/mp4',
        fileName: 'output.mp4',
        fileExtension: '.mp4',
        fileSize: outputBuffer.length
      },
      processingTime: processingTime
    });
    
  } catch (error) {
    logger.error(`❌ [FFmpeg] Erreur:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    // Nettoyer les fichiers temporaires
    for (const filePath of tempFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug(`🗑️ [FFmpeg] Fichier supprimé: ${filePath}`);
        }
      } catch (cleanupError) {
        logger.warn(`⚠️ [FFmpeg] Impossible de supprimer ${filePath}:`, cleanupError.message);
      }
    }
  }
});

/**
 * GET /api/ffmpeg/health
 * Vérifie que FFmpeg est disponible sur le serveur
 */
router.get('/health', (req, res) => {
  try {
    const version = execSync('ffmpeg -version', { timeout: 5000 }).toString().split('\n')[0];
    res.json({
      success: true,
      ffmpeg: version,
      available: true
    });
  } catch (error) {
    res.json({
      success: false,
      ffmpeg: null,
      available: false,
      error: error.message
    });
  }
});

/**
 * Utilitaire: Obtenir l'extension de fichier depuis le type MIME
 */
function getExtensionFromMimeType(mimeType) {
  if (!mimeType) return null;
  
  const mimeToExt = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    'audio/x-m4a': '.m4a',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
  };
  
  return mimeToExt[mimeType] || null;
}

module.exports = router;

