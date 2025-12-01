// Code corrigé pour le nœud "Code in JavaScript" du workflow PDF Analysis
// Ce code transforme les fichiers PDF reçus en items binaires n8n

// Debug: Afficher la structure des données reçues (limité à 1000 caractères pour éviter les problèmes)
try {
  const debugStr = JSON.stringify($json, null, 2);
  console.log('🔍 [PDF Transform] Données reçues (premiers 1000 chars):', debugStr.substring(0, 1000));
  console.log('🔍 [PDF Transform] Clés principales:', Object.keys($json || {}));
} catch (e) {
  console.log('⚠️ [PDF Transform] Impossible de sérialiser les données pour debug');
}

// Récupérer les fichiers depuis différentes structures possibles
// Le backend envoie: { body: { files: [...] } }
// n8n peut recevoir: $json.body.body.files (double body) ou $json.body.files
let files = [];

// Essayer différentes structures
if ($json.body?.body?.files && Array.isArray($json.body.body.files)) {
  files = $json.body.body.files;
  console.log(`✅ [PDF Transform] ${files.length} fichier(s) trouvé(s) dans body.body.files`);
} else if ($json.body?.files && Array.isArray($json.body.files)) {
  files = $json.body.files;
  console.log(`✅ [PDF Transform] ${files.length} fichier(s) trouvé(s) dans body.files`);
} else if ($json.files && Array.isArray($json.files)) {
  files = $json.files;
  console.log(`✅ [PDF Transform] ${files.length} fichier(s) trouvé(s) dans files`);
} else if ($json.body?.file && Array.isArray($json.body.file)) {
  files = $json.body.file;
  console.log(`✅ [PDF Transform] ${files.length} fichier(s) trouvé(s) dans body.file`);
} else if (Array.isArray($json.body)) {
  files = $json.body;
  console.log(`✅ [PDF Transform] Body est un tableau de ${files.length} fichier(s)`);
} else {
  console.error('❌ [PDF Transform] Aucun fichier trouvé dans les données');
  console.error('📦 [PDF Transform] Structure reçue:', Object.keys($json || {}));
  if ($json.body) {
    console.error('📦 [PDF Transform] Clés dans body:', Object.keys($json.body || {}));
    if ($json.body.body) {
      console.error('📦 [PDF Transform] Clés dans body.body:', Object.keys($json.body.body || {}));
    }
  }
  throw new Error('Aucun fichier PDF trouvé dans les données reçues');
}

if (files.length === 0) {
  console.error('❌ [PDF Transform] Tableau de fichiers vide');
  throw new Error('Aucun fichier PDF fourni');
}

// Préparer les items pour n8n
let items = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  
  // Vérifier que le fichier a les propriétés nécessaires
  if (!file.fileName && !file.name) {
    console.warn(`⚠️ [PDF Transform] Fichier ${i + 1} sans nom, utilisation d'un nom par défaut`);
  }
  
  if (!file.fileData && !file.data && !file.base64) {
    console.error(`❌ [PDF Transform] Fichier ${i + 1} sans données`);
    continue; // Ignorer ce fichier et continuer avec les autres
  }
  
  // Extraire les données du fichier
  const fileName = file.fileName || file.name || `document_${i + 1}.pdf`;
  const fileData = file.fileData || file.data || file.base64;
  
  // Nettoyer le base64 si c'est une data URL
  let cleanBase64 = fileData;
  if (typeof fileData === 'string' && fileData.startsWith('data:')) {
    const match = fileData.match(/^data:[^;]+;base64,(.+)$/);
    if (match) {
      cleanBase64 = match[1];
      console.log(`🧹 [PDF Transform] Fichier ${i + 1}: Data URL nettoyée`);
    }
  }
  
  console.log(`📄 [PDF Transform] Fichier ${i + 1}: ${fileName} (${cleanBase64.length} caractères base64)`);
  
  // Récupérer les métadonnées depuis différentes structures
  const sessionId = $json.body?.body?.sessionId || $json.body?.sessionId || $json.sessionId || '';
  const clientName = $json.body?.body?.clientName || $json.body?.clientName || $json.clientName || '';
  const clientEmail = $json.body?.body?.clientEmail || $json.body?.clientEmail || $json.clientEmail || '';
  
  // Créer l'item pour n8n
  items.push({
    json: {
      sessionId: sessionId,
      clientName: clientName,
      clientEmail: clientEmail,
      fileName: fileName
    },
    binary: {
      data: {
        data: cleanBase64, // n8n accepte le base64 directement
        mimeType: file.mimeType || 'application/pdf',
        fileName: fileName
      }
    }
  });
}

if (items.length === 0) {
  console.error('❌ [PDF Transform] Aucun item valide créé');
  throw new Error('Impossible de créer des items à partir des fichiers reçus');
}

console.log(`✅ [PDF Transform] ${items.length} item(s) créé(s) avec succès`);

return items;

