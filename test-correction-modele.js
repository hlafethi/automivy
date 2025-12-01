// Test de la correction du modèle OpenRouter
// Usage: node test-correction-modele.js

import 'dotenv/config';

async function testModel() {
    try {
        console.log('🧪 Test du modèle corrigé...');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
            console.log(`📝 Réponse: ${data.choices?.[0]?.message?.content?.substring(0, 100)}...`);
            console.log('🎉 CORRECTION RÉUSSIE !');
        } else {
            console.log(`❌ Erreur: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
    }
}

testModel();