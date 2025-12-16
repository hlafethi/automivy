require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password
});

const TEMPLATE_ID = '072a5103-ce01-44b8-b2da-fe9ba9637f6e';

// Template complet corrigé
const correctedWorkflow = {
  "name": "Nextcloud File Sorting Automation",
  "nodes": [
    // 1. WEBHOOK TRIGGER
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "webhookId": "WEBHOOK_ID_PLACEHOLDER",
      "parameters": {
        "path": "WEBHOOK_PATH_PLACEHOLDER",
        "httpMethod": "POST",
        "responseMode": "onReceived",
        "responseCode": 200,
        "responseData": "allEntries"
      }
    },
    // 2. SET TARGET FOLDER
    {
      "name": "Set Target Folder",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "jsCode": `// Extraire le dossier cible du webhook
const body = $input.first().json.body || $input.first().json;
const folders = body.folders || [];
const targetFolder = folders[0] || '/';

return [{
  json: {
    targetFolder: targetFolder,
    triggeredBy: body.triggeredBy || body.userEmail || 'unknown',
    timestamp: new Date().toISOString()
  }
}];`
      }
    },
    // 3. LIST FILES NEXTCLOUD
    {
      "name": "List Files Nextcloud",
      "type": "n8n-nodes-base.nextCloud",
      "typeVersion": 1,
      "position": [650, 300],
      "credentials": {
        "nextCloudApi": {
          "id": "USER_NEXTCLOUD_CREDENTIAL_ID",
          "name": "USER_NEXTCLOUD_CREDENTIAL_NAME"
        }
      },
      "parameters": {
        "resource": "folder",
        "operation": "list",
        "path": "={{ $json.targetFolder || '/' }}"
      }
    },
    // 4. FILTER FILES ONLY (Code)
    {
      "name": "Filter Files Only",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [850, 300],
      "parameters": {
        "jsCode": `// Filtrer uniquement les fichiers (ignorer les dossiers)
const items = $input.all();
const files = [];

for (const item of items) {
  const data = item.json;
  const filename = data.filename || data.path || data.basename || '';
  
  // Décoder le chemin URL-encodé (%20 -> espace, etc.)
  const decodedFilename = decodeURIComponent(filename);
  
  // Ignorer les entrées vides, la racine, ou les dossiers
  if (!decodedFilename || decodedFilename === '/' || decodedFilename === '.') {
    continue;
  }
  
  // Ignorer les dossiers (type=folder ou se termine par /)
  if (data.type === 'folder' || data.type === 'directory' || decodedFilename.endsWith('/')) {
    continue;
  }
  
  // Ignorer les fichiers sans extension (probablement des dossiers)
  if (!decodedFilename.includes('.')) {
    continue;
  }
  
  // Ignorer les fichiers cachés
  const baseName = decodedFilename.split('/').filter(p => p).pop();
  if (baseName && baseName.startsWith('.')) {
    continue;
  }
  
  files.push({
    json: {
      ...data,
      filename: decodedFilename,
      path: decodedFilename,
      basename: baseName
    }
  });
}

// Retourner les fichiers ou arrêter si aucun
if (files.length === 0) {
  return [];
}

return files;`
      }
    },
    // 5. LOOP OVER FILES
    {
      "name": "Loop Over Files",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "position": [1050, 300],
      "parameters": {
        "batchSize": 1,
        "options": {}
      }
    },
    // 6. DOWNLOAD FILE NEXTCLOUD
    {
      "name": "Download File Nextcloud",
      "type": "n8n-nodes-base.nextCloud",
      "typeVersion": 1,
      "position": [1250, 300],
      "credentials": {
        "nextCloudApi": {
          "id": "USER_NEXTCLOUD_CREDENTIAL_ID",
          "name": "USER_NEXTCLOUD_CREDENTIAL_NAME"
        }
      },
      "parameters": {
        "resource": "file",
        "operation": "download",
        "path": "={{ $json.filename || $json.path }}",
        "binaryPropertyName": "data"
      }
    },
    // 7. OPENROUTER CHAT MODEL
    {
      "name": "OpenRouter Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
      "typeVersion": 1,
      "position": [1350, 500],
      "credentials": {
        "openRouterApi": {
          "id": "hgQk9lN7epSIRRcg",
          "name": "Header Auth account 2"
        }
      },
      "parameters": {
        "model": "anthropic/claude-3.5-sonnet",
        "options": {}
      }
    },
    // 8. AI AGENT
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.7,
      "position": [1450, 300],
      "parameters": {
        "promptType": "define",
        "text": `Tu es un assistant de tri de fichiers. Analyse le fichier fourni et propose:
1. Un nouveau nom de fichier descriptif (en gardant l'extension)
2. Un dossier de destination approprié

Le fichier actuel est: {{ $json.filename || $json.basename }}

Réponds UNIQUEMENT en JSON avec ce format exact:
{
  "new_filename": "nouveau_nom.ext",
  "destination_folder": "/Catégorie/SousDossier",
  "summary": "Brève description du fichier"
}`,
        "options": {
          "systemMessage": "Tu es un assistant de classification de fichiers. Tu analyses les fichiers et proposes un classement logique. Réponds toujours en JSON valide."
        }
      }
    },
    // 9. PARSE AI RESPONSE
    {
      "name": "Parse AI Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1650, 300],
      "parameters": {
        "jsCode": `// Récupérer la réponse de l'AI Agent
const input = $input.first().json;
const aiResponse = input.output || input.text || input.response || '';

// Récupérer le fichier depuis Loop Over Files
const loopItem = $('Loop Over Files').first().json;
const originalFilename = loopItem.filename || loopItem.path || loopItem.basename || '';

// Essayer d'extraire le JSON de la réponse AI
let parsed = {};
try {
  const jsonMatch = aiResponse.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  // Pas de JSON valide
}

// Extraire juste le nom du fichier (sans le chemin)
const fileNameOnly = originalFilename.split('/').filter(p => p).pop() || 'fichier';
const newFilename = parsed.new_filename || parsed.newFilename || fileNameOnly;
const destFolder = (parsed.destination_folder || parsed.destinationFolder || '/Triés').replace(/\\/$/, '');

// Construire le chemin source correct
const sourcePath = originalFilename.startsWith('/') ? originalFilename : '/' + originalFilename;

return [{
  json: {
    skip: false,
    originalFilename: originalFilename,
    sourcePath: sourcePath,
    newFilename: newFilename,
    destinationFolder: destFolder,
    newPath: destFolder + '/' + newFilename,
    summary: parsed.summary || 'Fichier traité'
  }
}];`
      }
    },
    // 10. IF (Skip check)
    {
      "name": "IF",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [1850, 300],
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose"
          },
          "conditions": [
            {
              "id": "skip-condition",
              "leftValue": "={{ $json.skip }}",
              "rightValue": "false",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {
          "looseTypeValidation": true
        }
      }
    },
    // 11. MOVE/RENAME FILE NEXTCLOUD
    {
      "name": "Move/Rename File Nextcloud",
      "type": "n8n-nodes-base.nextCloud",
      "typeVersion": 1,
      "position": [2050, 300],
      "credentials": {
        "nextCloudApi": {
          "id": "USER_NEXTCLOUD_CREDENTIAL_ID",
          "name": "USER_NEXTCLOUD_CREDENTIAL_NAME"
        }
      },
      "parameters": {
        "resource": "file",
        "operation": "move",
        "path": "={{ $json.sourcePath || $json.originalFilename || $json.filename }}",
        "newPath": "={{ $json.newPath || $json.destinationPath || '/Triés/' + $json.newFilename }}"
      }
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [[{ "node": "Set Target Folder", "type": "main", "index": 0 }]]
    },
    "Set Target Folder": {
      "main": [[{ "node": "List Files Nextcloud", "type": "main", "index": 0 }]]
    },
    "List Files Nextcloud": {
      "main": [[{ "node": "Filter Files Only", "type": "main", "index": 0 }]]
    },
    "Filter Files Only": {
      "main": [[{ "node": "Loop Over Files", "type": "main", "index": 0 }]]
    },
    "Loop Over Files": {
      "main": [
        [{ "node": "Download File Nextcloud", "type": "main", "index": 0 }],
        []
      ]
    },
    "Download File Nextcloud": {
      "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
    },
    "OpenRouter Chat Model": {
      "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
    },
    "AI Agent": {
      "main": [[{ "node": "Parse AI Response", "type": "main", "index": 0 }]]
    },
    "Parse AI Response": {
      "main": [[{ "node": "IF", "type": "main", "index": 0 }]]
    },
    "IF": {
      "main": [
        [{ "node": "Move/Rename File Nextcloud", "type": "main", "index": 0 }],
        [{ "node": "Loop Over Files", "type": "main", "index": 0 }]
      ]
    },
    "Move/Rename File Nextcloud": {
      "main": [[{ "node": "Loop Over Files", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
};

(async () => {
  try {
    console.log('🔧 Mise à jour complète du template Nextcloud...\n');
    
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [TEMPLATE_ID]);
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const template = result.rows[0];
    console.log('📋 Template actuel:', template.name);
    
    // Sauvegarder le nouveau template
    console.log('\n💾 Mise à jour du template...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(correctedWorkflow), TEMPLATE_ID]
    );
    
    console.log('\n✅ Template mis à jour avec succès!');
    console.log('\n📝 Résumé des corrections:');
    console.log('   1. Webhook Trigger - responseMode: onReceived');
    console.log('   2. Set Target Folder - extraction du dossier cible');
    console.log('   3. List Files Nextcloud - Resource: folder, Operation: list');
    console.log('   4. Filter Files Only - NOUVEAU: filtre les dossiers, décode URLs');
    console.log('   5. Loop Over Files - batchSize: 1');
    console.log('   6. Download File Nextcloud - path dynamique');
    console.log('   7. OpenRouter Chat Model - credential hgQk9lN7epSIRRcg');
    console.log('   8. AI Agent - prompt corrigé');
    console.log('   9. Parse AI Response - code corrigé pour récupérer le bon nom');
    console.log('   10. IF - vérifie skip avant de déplacer');
    console.log('   11. Move/Rename File - chemins corrects');
    console.log('\n⚠️  IMPORTANT: Supprime le workflow actuel dans n8n et redéploie depuis l\'application!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

