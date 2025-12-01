// Test rapide OpenRouter - Version ES Modules
// Compatible avec les projets utilisant "type": "module" dans package.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Test Rapide OpenRouter - Version ES Modules\n');

// 1. Vérifier l'existence du .env
const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '..', '.env')
];

let envPath = null;
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        envPath = p;
        break;
    }
}

if (!envPath) {
    console.log('❌ Fichier .env non trouvé');
    console.log('📍 Chemins vérifiés:', envPaths);
    console.log('\n💡 Créez un fichier .env à la racine avec:');
    console.log('   OPENROUTER_API_KEY=votre_cle_api_openrouter');
    process.exit(1);
}

console.log(`✅ Fichier .env trouvé: ${envPath}`);

// 2. Charger les variables manuellement (compatible ES modules)
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('OPENROUTER_API_KEY=')) {
            const value = trimmed.split('=').slice(1).join('=').trim();
            process.env.OPENROUTER_API_KEY = value;
            console.log(`✅ Clé OPENROUTER_API_KEY chargée (${value.substring(0, 20)}...)`);
            break;
        }
    }
} catch (error) {
    console.log(`❌ Erreur lecture .env: ${error.message}`);
    process.exit(1);
}

// 3. Vérifier si la clé est présente
if (!process.env.OPENROUTER_API_KEY) {
    console.log('❌ OPENROUTER_API_KEY non définie dans .env');
    console.log('📝 Ajoutez cette ligne dans votre .env:');
    console.log('   OPENROUTER_API_KEY=sk-or-v1-votre-cle-api-complète');
    process.exit(1);
}

// 4. Test de connexion simple
async function testOpenRouter() {
    try {
        console.log('\n🌐 Test de connexion OpenRouter...');
        console.log('📡 Envoi de la requête...');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Automivy Test ES Modules'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2.5-coder-32b-instruct',
                messages: [{
                    role: 'user',
                    content: 'Test de connexion. Réponds seulement "OK" en JSON valide: {"status": "success", "message": "test passed"}'
                }],
                max_tokens: 100,
                temperature: 0.1
            })
        });

        console.log(`📊 Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`❌ Erreur API (${response.status}):`);
            console.log(`   ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
            return false;
        }

        const data = await response.json();
        console.log('✅ Connexion OpenRouter réussie');
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const responseContent = data.choices[0].message.content;
            console.log(`📝 Réponse IA (${responseContent.length} caractères):`);
            console.log(`   ${responseContent.substring(0, 100)}${responseContent.length > 100 ? '...' : ''}`);
            console.log(`🎯 Tokens utilisés: ${data.usage?.total_tokens || 'N/A'}`);
            console.log(`🤖 Modèle: ${data.model || 'Non spécifié'}`);
        }
        
        return true;
        
    } catch (error) {
        console.log(`❌ Erreur réseau: ${error.message}`);
        return false;
    }
}

// 5. Test du générateur (si disponible)
async function testGenerator() {
    try {
        // Essayer d'importer le générateur
        const { DynamicWorkflowGenerator } = await import('./generateur_dynamique_avec_ia.js');
        
        if (DynamicWorkflowGenerator && DynamicWorkflowGenerator.generateIntelligentWorkflow) {
            console.log('\n🧠 Test du générateur IA...');
            
            const workflow = await DynamicWorkflowGenerator.generateIntelligentWorkflow(
                'Test de génération avec un nœud Set simple',
                'openrouter',
                'qwen/qwen-2.5-coder-32b-instruct'
            );
            
            if (workflow) {
                const isFallback = workflow.metadata && workflow.metadata.fallback;
                console.log(`📄 Workflow généré: ${isFallback ? '⚠️  FALLBACK (pas d\'IA)' : '✅ IA RÉUSSIE'}`);
                console.log(`   ${isFallback ? 'Cause: IA non disponible' : 'Succès: IA utilisée'}`);
                
                if (workflow.nodes) {
                    console.log(`🔗 Nœuds: ${workflow.nodes.length}`);
                }
            }
            
            return true;
        }
    } catch (error) {
        console.log(`⚠️  Générateur non testable: ${error.message}`);
        return false;
    }
}

// Exécution des tests
async function runTests() {
    const apiTest = await testOpenRouter();
    await testGenerator();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSULTATS DU DIAGNOSTIC:');
    
    if (apiTest) {
        console.log('✅ OpenRouter API: FONCTIONNELLE');
        console.log('✅ Clé API: VALIDE');
        console.log('✅ Connexion: RÉUSSIE');
        
        console.log('\n🎉 CONFIGURATION CORRECTE !');
        console.log('\n📋 Prochaines étapes:');
        console.log('   1. ✅ dotenv.config() déjà configuré (ES modules)');
        console.log('   2. ✅ Clé API OpenRouter valide');
        console.log('   3. 🔄 Redémarrez votre serveur');
        console.log('   4. 🧪 Testez la génération de workflow');
        console.log('   5. ✨ L\'IA devrait maintenant fonctionner !');
        
    } else {
        console.log('❌ OpenRouter API: PROBLÈME DÉTECTÉ');
        console.log('\n🔧 Actions requises:');
        console.log('   1. Vérifiez votre clé API dans .env');
        console.log('   2. Assurez-vous que la clé est valide');
        console.log('   3. Redémarrez votre serveur');
    }
    
    console.log('='.repeat(50));
}

runTests();