# 🔧 Correction : Volume Docker pour les uploads

## 🚨 Problème identifié

Les fichiers uploadés sont stockés dans le volume `automivy_automivy_uploads`, mais le `docker-compose.portainer.yml` référence `automivy_uploads`.

**Volume réel :** `automivy_automivy_uploads`  
**Volume référencé :** `automivy_uploads`

## ✅ Solution : Copier les fichiers vers le bon volume

**Sur le VPS, exécutez ces commandes :**

```bash
# 1. Vérifier les volumes existants
docker volume ls | grep automivy

# 2. Vérifier le contenu du volume réel
docker run --rm -v automivy_automivy_uploads:/source alpine ls -la /source | head -20

# 3. Copier les fichiers du volume Portainer vers le volume Docker
docker run --rm \
  -v portainer_data:/portainer \
  -v automivy_automivy_uploads:/destination \
  alpine sh -c "
    echo 'Copie des fichiers depuis Portainer...'
    if [ -d /portainer/_data/compose/218/backend/public/uploads ]; then
      cp -r /portainer/_data/compose/218/backend/public/uploads/. /destination/
      echo '✅ Fichiers copiés'
      ls -la /destination | head -10
    else
      echo '❌ Répertoire source non trouvé'
    fi
  "

# 4. Vérifier que les fichiers sont maintenant dans le volume
docker run --rm -v automivy_automivy_uploads:/data alpine ls -la /data | grep "176344"
```

## 🔄 Alternative : Utiliser le volume existant

**Si vous préférez utiliser le volume existant `automivy_automivy_uploads` :**

1. **Modifiez `docker-compose.portainer.yml`** pour utiliser le volume existant :

```yaml
volumes:
  automivy_uploads:
    external: true
    name: automivy_automivy_uploads
  automivy_logs:
    driver: local
```

2. **Redéployez la stack dans Portainer**

## 🧪 Vérification

**Après la copie, vérifiez :**

```bash
# Vérifier dans le conteneur
docker exec automivy-backend ls -la /app/public/uploads/ | grep "176344"

# Tester l'accès
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

## 📝 Note importante

Le volume `automivy_automivy_uploads` est créé automatiquement par Docker Compose avec le préfixe du nom de la stack. Si votre stack s'appelle `automivy`, le volume sera `automivy_automivy_uploads`.

Pour éviter ce problème à l'avenir, utilisez un volume nommé explicite dans le docker-compose.

