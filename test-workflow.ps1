# Script PowerShell pour tester le workflow PDF
param(
    [string]$N8N_URL = "https://votre-n8n-instance.com/webhook/analyze-insurance-quotes",
    [string]$PDF_URL = "https://exemple.com/devis-assurance.pdf"
)

Write-Host "🚀 Test du workflow PDF..." -ForegroundColor Green
Write-Host "📄 PDF URL: $PDF_URL" -ForegroundColor Yellow
Write-Host "🔗 Webhook URL: $N8N_URL" -ForegroundColor Yellow

# Données de test
$testData = @{
    fileUrl = $PDF_URL
    clientName = "Test Client"
    analysisType = "comprehensive"
} | ConvertTo-Json

try {
    # Envoyer la requête
    $response = Invoke-RestMethod -Uri $N8N_URL -Method POST -Body $testData -ContentType "application/json"
    
    Write-Host "✅ Workflow exécuté avec succès !" -ForegroundColor Green
    Write-Host "📧 Vérifiez votre email pour le devoir de conseil." -ForegroundColor Cyan
    
    # Afficher la réponse
    Write-Host "📊 Réponse du workflow:" -ForegroundColor Blue
    $response | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution du workflow:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
