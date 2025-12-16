#!/usr/bin/env node

/**
 * Script pour vérifier les fichiers uploads manquants
 * Usage: node backend/scripts/check-missing-uploads.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uploadsDir = path.join(__dirname, '../public/uploads');

// Fichiers demandés par le frontend (depuis les logs)
const requestedFiles = [
  'media-1763447744222-285086997.png',
  'media-1763448151605-841854033.png',
  'media-1763448155362-953480651.png',
  'media-1763448158840-90191985.png',
  'media-1763448162373-301805816.png',
  'media-1763448166385-375248340.png',
  'media-1763448169986-747563311.png'
];

async function checkFiles() {
  console.log('🔍 Vérification des fichiers uploads manquants...\n');
  
  // Vérifier le répertoire
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Le répertoire uploads n\'existe pas:', uploadsDir);
    return;
  }
  
  console.log('📁 Répertoire uploads:', uploadsDir);
  console.log('📊 Fichiers présents:', fs.readdirSync(uploadsDir).length, '\n');
  
  // Vérifier chaque fichier demandé
  console.log('🔍 Fichiers demandés par le frontend:');
  const missingFiles = [];
  const existingFiles = [];
  
  for (const filename of requestedFiles) {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  ✅ ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
      existingFiles.push(filename);
    } else {
      console.log(`  ❌ ${filename} - MANQUANT`);
      missingFiles.push(filename);
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`  ✅ Fichiers présents: ${existingFiles.length}`);
  console.log(`  ❌ Fichiers manquants: ${missingFiles.length}`);
  
  if (missingFiles.length > 0) {
    console.log('\n❌ Fichiers manquants:');
    missingFiles.forEach(f => console.log(`  - ${f}`));
    
    // Chercher dans la base de données
    console.log('\n🔍 Recherche dans la base de données...');
    try {
      const pool = new Pool({
        host: process.env.DB_HOST || '147.93.58.155',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'automivy',
        user: process.env.DB_USER || 'fethi',
        password: process.env.DB_PASSWORD
      });
      
      for (const filename of missingFiles) {
        const result = await pool.query(
          `SELECT * FROM landing_content 
           WHERE content::text LIKE $1 
           LIMIT 5`,
          [`%${filename}%`]
        );
        
        if (result.rows.length > 0) {
          console.log(`\n  📄 ${filename} trouvé dans la base de données:`);
          result.rows.forEach(row => {
            console.log(`    - Section: ${row.section}`);
            console.log(`    - ID: ${row.id}`);
          });
        }
      }
      
      await pool.end();
    } catch (error) {
      console.error('❌ Erreur lors de la recherche dans la base de données:', error.message);
    }
  }
  
  // Lister tous les fichiers présents (pour comparaison)
  console.log('\n📁 Tous les fichiers présents dans uploads:');
  const allFiles = fs.readdirSync(uploadsDir).filter(f => f.startsWith('media-'));
  allFiles.sort().slice(0, 10).forEach(f => {
    const stats = fs.statSync(path.join(uploadsDir, f));
    console.log(`  - ${f} (${(stats.size / 1024).toFixed(2)} KB, ${new Date(stats.mtime).toLocaleString()})`);
  });
  if (allFiles.length > 10) {
    console.log(`  ... et ${allFiles.length - 10} autres fichiers`);
  }
}

checkFiles().catch(console.error);

