#!/bin/bash

# Script pour copier les fichiers uploads depuis Portainer vers le volume Docker
# Usage: ./scripts/copy-uploads-to-volume.sh

set -e

echo "🔍 Vérification des volumes Docker..."
docker volume ls | grep automivy

echo ""
echo "📁 Vérification du contenu du volume automivy_automivy_uploads..."
docker run --rm -v automivy_automivy_uploads:/source alpine ls -la /source | head -20

echo ""
echo "📁 Vérification du contenu du répertoire Portainer..."
if docker run --rm -v portainer_data:/portainer alpine test -d /portainer/_data/compose/218/backend/public/uploads; then
  echo "✅ Répertoire Portainer trouvé"
  docker run --rm -v portainer_data:/portainer alpine ls -la /portainer/_data/compose/218/backend/public/uploads | head -20
else
  echo "⚠️ Répertoire Portainer non trouvé, recherche dans d'autres emplacements..."
  docker run --rm -v portainer_data:/portainer alpine find /portainer -name "media-1763447744222-285086997.png" 2>/dev/null | head -5
fi

echo ""
echo "📋 Copie des fichiers depuis Portainer vers le volume Docker..."
docker run --rm \
  -v portainer_data:/portainer \
  -v automivy_automivy_uploads:/destination \
  alpine sh -c "
    if [ -d /portainer/_data/compose/218/backend/public/uploads ]; then
      echo '📂 Copie depuis /portainer/_data/compose/218/backend/public/uploads...'
      cp -r /portainer/_data/compose/218/backend/public/uploads/. /destination/ 2>/dev/null || true
      echo '✅ Fichiers copiés'
      echo ''
      echo '📊 Fichiers dans le volume (premiers 10):'
      ls -la /destination | head -10
      echo ''
      echo '🔍 Vérification des fichiers récents:'
      ls -la /destination | grep '176344' | head -10
    else
      echo '❌ Répertoire source non trouvé'
      echo 'Recherche alternative...'
      find /portainer -name '*.png' -path '*/uploads/*' 2>/dev/null | head -5
    fi
  "

echo ""
echo "🧪 Vérification finale dans le conteneur backend..."
docker exec automivy-backend ls -la /app/public/uploads/ | grep "176344" | head -10 || echo "⚠️ Fichiers non trouvés dans le conteneur"

echo ""
echo "✅ Script terminé"
echo ""
echo "🧪 Testez maintenant:"
echo "curl -I https://automivy.com/uploads/media-1763447744222-285086997.png"

