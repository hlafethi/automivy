#!/bin/bash

# Configuration
N8N_WEBHOOK_URL="https://votre-n8n-instance.com/webhook/analyze-insurance-quotes"
PDF_URL="https://exemple.com/devis-assurance.pdf"

echo "🚀 Test du workflow PDF avec curl..."
echo "📄 PDF URL: $PDF_URL"
echo "🔗 Webhook URL: $N8N_WEBHOOK_URL"

# Envoyer la requête
curl -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileUrl\": \"$PDF_URL\",
    \"clientName\": \"Test Client\",
    \"analysisType\": \"comprehensive\"
  }" \
  -v

echo ""
echo "✅ Test terminé !"
echo "📧 Vérifiez votre email pour le devoir de conseil."
