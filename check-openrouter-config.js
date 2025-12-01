// Script de diagnostic pour vérifier la configuration OpenRouter
require('dotenv').config({ path: './backend/.env' });

console.log('🔍 Vérification de la configuration OpenRouter...\n');

// Vérifier la clé API
const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY non trouvée dans backend/.env');
    console.error('\n📝 Solution :');
    console.error('1. Créez ou modifiez le fichier backend/.env');
    console.error('2. Ajoutez la ligne suivante :');
    console.error('   OPENROUTER_API_KEY=sk-or-v1-votre-cle-api');
    console.error('3. Redémarrez le serveur backend');
    process.exit(1);
}

console.log('✅ OPENROUTER_API_KEY trouvée:', apiKey.substring(0, 15) + '...');
console.log('✅ Longueur de la clé:', apiKey.length, 'caractères');

// Vérifier le format
if (!apiKey.startsWith('sk-or-v1-')) {
    console.warn('⚠️  La clé API ne commence pas par "sk-or-v1-". Vérifiez que c\'est bien une clé OpenRouter valide.');
}

// Tester la connexion
console.log('\n🧪 Test de connexion à OpenRouter...');

const fetch = require('node-fetch');

fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://automivy.com',
        'X-Title': 'Automivy Config Check'
    }
})
.then(async (response) => {
    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur de connexion:', response.status);
        console.error('❌ Détails:', errorText);
        
        if (response.status === 401) {
            console.error('\n🔑 La clé API est invalide ou expirée.');
            console.error('   Vérifiez votre clé sur https://openrouter.ai/keys');
        } else if (response.status === 429) {
            console.error('\n⏱️  Quota dépassé. Attendez un peu ou vérifiez votre compte OpenRouter.');
        }
        process.exit(1);
    }
    
    return response.json();
})
.then((data) => {
    console.log('✅ Connexion réussie !');
    console.log('✅ Nombre de modèles disponibles:', data.data?.length || 0);
    
    // Vérifier si le modèle par défaut est disponible
    const defaultModel = 'qwen/qwen-2.5-coder-32b-instruct';
    const modelAvailable = data.data?.some(m => m.id === defaultModel);
    
    if (modelAvailable) {
        console.log(`✅ Modèle par défaut "${defaultModel}" disponible`);
    } else {
        console.warn(`⚠️  Modèle par défaut "${defaultModel}" non trouvé dans la liste`);
        console.warn('   Vous pouvez utiliser un autre modèle dans l\'interface');
    }
    
    console.log('\n✅ Configuration OpenRouter OK !');
    console.log('   Vous pouvez maintenant générer des workflows avec l\'IA.');
})
.catch((error) => {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('\n💡 Vérifiez :');
    console.error('   - Votre connexion internet');
    console.error('   - Que la clé API est correcte');
    console.error('   - Que votre compte OpenRouter est actif');
    process.exit(1);
});

