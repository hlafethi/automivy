# Script pour créer une branche et pousser les changements du générateur de workflows
Write-Host "🌿 Création de la branche feature/ai-workflow-generator..." -ForegroundColor Cyan

# Créer et basculer sur la nouvelle branche
git checkout -b feature/ai-workflow-generator
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la création de la branche" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Branche créée" -ForegroundColor Green

# Ajouter les fichiers du générateur de workflows
Write-Host "📦 Ajout des fichiers du générateur de workflows..." -ForegroundColor Cyan

git add backend/services/enhancedAIGenerator.js
git add backend/services/enhancedPromptBuilder.js
git add backend/services/perfectAIGenerator.js
git add backend/services/perfectN8nNodesRegistry.js
git add backend/services/perfectWorkflowValidator.js
git add backend/services/n8nNodesDatabase.js
git add backend/services/ultimateAIGenerator.js
git add backend/services/ultimatePromptBuilder.js
git add src/components/AIWorkflowGenerator.tsx
git add backend/routes/enhancedAI.js

Write-Host "✅ Fichiers ajoutés" -ForegroundColor Green

# Commit
Write-Host "💾 Création du commit..." -ForegroundColor Cyan
git commit -m "feat: Amélioration du générateur AI de workflows avec registre de nœuds prédéfinis

- Ajout du registre complet de nœuds n8n (perfectN8nNodesRegistry.js)
- Amélioration du générateur AI avec validation parfaite
- Support des nœuds prédéfinis par catégorie
- Paramètres par défaut pour chaque type de nœud
- Validation automatique des workflows générés"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du commit" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Commit créé" -ForegroundColor Green

# Push vers GitHub
Write-Host "🚀 Envoi vers GitHub..." -ForegroundColor Cyan
git push -u origin feature/ai-workflow-generator

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Branche poussée vers GitHub avec succès!" -ForegroundColor Green
    Write-Host "📍 Branche: feature/ai-workflow-generator" -ForegroundColor Yellow
} else {
    Write-Host "❌ Erreur lors du push vers GitHub" -ForegroundColor Red
    exit 1
}

