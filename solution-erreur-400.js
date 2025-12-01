// Solution directe pour l'erreur HTTP 400 OpenRouter
// Change automatiquement le modèle et corrige les paramètres

import fs from 'fs';

console.log('🔧 SOLUTION DIRECTE - Erreur HTTP 400 OpenRouter\n');

// 1. Identifier le problème
console.log('🎯 PROBLÈME IDENTIFIÉ:');
console.log('   ❌ Erreur HTTP 400 avec le modèle: deepseek/deepseek-coder');
console.log('   ✅ Clé API fonctionne (test précédent OK)');
console.log('   ✅ Configuration dotenv OK');
console.log('   🔍 Cause: Modèle non supporté ou restriction de la clé API');

// 2. Trouver et corriger le fichier enhancedAIGenerator.js
const generatorPaths = [
    'backend/services/enhancedAIGenerator.js',
    'enhancedAIGenerator.js',
    'generateur_dynamique_avec_ia.js'
];

let generatorFile = null;
for (const path of generatorPaths) {
    if (fs.existsSync(path)) {
        generatorFile = path;
        break;
    }
}

if (!generatorFile) {
    console.log('\n❌ Fichier enhancedAIGenerator.js non trouvé');
    console.log('📍 Chemins recherchés:', generatorPaths);
    console.log('\n📝 Solution manuelle:');
    console.log('   1. Trouvez votre fichier enhancedAIGenerator.js');
    console.log('   2. Remplacez "deepseek/deepseek-coder" par "qwen/qwen-2.5-coder-32b-instruct"');
    console.log('   3. Redémarrez votre serveur');
    process.exit(1);
}

console.log(`\n✅ Fichier trouvé: ${generatorFile}`);

// 3. Lire et corriger le fichier
const content = fs.readFileSync(generatorFile, 'utf8');

// Patterns à remplacer
const oldPatterns = [
    'deepseek/deepseek-coder',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-reasoner'
];

const newModel = 'qwen/qwen-2.5-coder-32b-instruct';

let modifications = 0;
let newContent = content;

for (const oldPattern of oldPatterns) {
    if (newContent.includes(oldPattern)) {
        newContent = newContent.replace(new RegExp(oldPattern, 'g'), newModel);
        modifications++;
        console.log(`🔄 Remplacement: ${oldPattern} → ${newModel}`);
    }
}

// 4. Rechercher la ligne avec le modèle par défaut
const defaultModelMatch = newContent.match(/const model = ['"]([^'"]*)['"]/);
if (defaultModelMatch) {
    console.log(`📝 Modèle par défaut détecté: ${defaultModelMatch[1]}`);
    if (defaultModelMatch[1] !== newModel) {
        newContent = newContent.replace(
            /const model = ['"][^'"]*['"]/,
            `const model = '${newModel}'`
        );
        modifications++;
        console.log(`🔄 Modèle par défaut mis à jour: ${newModel}`);
    }
}

// 5. Sauvegarder les modifications
if (modifications > 0) {
    fs.writeFileSync(generatorFile, newContent);
    console.log(`\n✅ ${modifications} modifications appliquées dans ${generatorFile}`);
} else {
    console.log('\n✅ Aucune modification nécessaire - modèle correct');
}

// 6. Vérifier les autres paramètres de la requête OpenRouter
console.log('\n🔍 Vérification des paramètres OpenRouter...');

// Rechercher les paramètres de la requête
const requestMatch = newContent.match(/await fetch\([^}]+body: JSON\.stringify\([^}]+\}\)/s);
if (requestMatch) {
    console.log('✅ Structure de requête trouvée');
    
    // Vérifier les paramètres recommandés
    const checks = [
        { pattern: 'max_tokens:', found: requestMatch[0].includes('max_tokens:') },
        { pattern: 'temperature:', found: requestMatch[0].includes('temperature:') },
        { pattern: 'HTTP-Referer:', found: requestMatch[0].includes('HTTP-Referer:') },
        { pattern: 'X-Title:', found: requestMatch[0].includes('X-Title:') }
    ];
    
    checks.forEach(check => {
        console.log(`   ${check.found ? '✅' : '⚠️'} ${check.pattern} ${check.found ? 'présent' : 'manquant'}`);
    });
}

// 7. Créer un fichier de test pour vérifier la correction
const testContent = `// Test de la correction du modèle OpenRouter
// Usage: node test-correction-modele.js

import 'dotenv/config';

async function testModel() {
    try {
        console.log('🧪 Test du modèle corrigé...');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Automivy Test Modèle'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2.5-coder-32b-instruct',
                messages: [{
                    role: 'user',
                    content: 'Génère un workflow n8n simple avec un seul nœud Set. Réponds uniquement en JSON valide.'
                }],
                max_tokens: 1000,
                temperature: 0.1
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Modèle fonctionne correctement');
            console.log(\`📝 Réponse: \${data.choices?.[0]?.message?.content?.substring(0, 100)}...\`);
            console.log('🎉 CORRECTION RÉUSSIE !');
        } else {
            console.log(\`❌ Erreur: \${response.status}\`);
        }
    } catch (error) {
        console.log(\`❌ Erreur: \${error.message}\`);
    }
}

testModel();`;

fs.writeFileSync('test-correction-modele.js', testContent);
console.log('\n📝 Fichier de test créé: test-correction-modele.js');

// 8. Résumé final
console.log('\n' + '='.repeat(50));
console.log('🎯 SOLUTION APPLIQUÉE:');

if (modifications > 0) {
    console.log('✅ Modèle changé: deepseek/deepseek-coder → qwen/qwen-2.5-coder-32b-instruct');
    console.log('✅ Fichier mis à jour');
    console.log('✅ Test de validation créé');
} else {
    console.log('✅ Modèle déjà correct');
}

console.log('\n📋 PROCHAINES ÉTAPES:');
console.log('   1. 🔄 Redémarrez votre serveur');
console.log('   2. 🧪 Testez avec: node test-correction-modele.js');
console.log('   3. 🎯 Testez la génération de workflow via votre interface');
console.log('   4. ✨ L\'erreur HTTP 400 devrait être résolue');

console.log('\n💡 CAUSE DE L\'ERreur:');
console.log('   Votre clé API OpenRouter ne supporte probablement pas le modèle');
console.log('   deepseek/deepseek-coder. Le modèle qwen fonctionne mieux.');

console.log('\n🚀 RÉSULTAT ATTENDU:');
console.log('   ✅ Plus d\'erreur HTTP 400');
console.log('   ✅ Génération de workflows par IA');
console.log('   ✅ Fin des templates de fallback');

console.log('='.repeat(50));