# 🔧 Correction : Fichiers uploads manquants (404)

## 🚨 Problème identifié

Les fichiers demandés par le frontend ne sont **pas présents** dans le conteneur Docker :

**Fichiers demandés (404) :**
- `media-1763447744222-285086997.png`
- `media-1763448151605-841854033.png`
- `media-1763448155362-953480651.png`
- `media-1763448158840-90191985.png`
- `media-1763448162373-301805816.png`
- `media-1763448166385-375248340.png`
- `media-1763448169986-747563311.png`

**Fichiers présents dans le conteneur :**
- `media-1761033640715-876126588.png` (plus ancien)
- `media-1761033844866-70258185.png` (plus ancien)
- etc.

## 🔍 Cause

Les fichiers ont été uploadés **après le déploiement Docker** ou **avant la création du volume Docker**, et ne sont donc pas dans le volume `automivy_uploads`.

## ✅ Solutions

### Solution 1 : Vérifier où sont les fichiers originaux

**Sur le VPS, vérifiez si les fichiers existent ailleurs :**

```bash
# Chercher les fichiers sur le système
find / -name "media-1763447744222-285086997.png" 2>/dev/null

# Vérifier dans le répertoire backend local (si vous avez un backup)
ls -la /chemin/vers/backend/public/uploads/ | grep "176344"

# Vérifier dans la base de données (les chemins sont stockés)
docker exec -it automivy-backend node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || '147.93.58.155',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'automivy',
  user: process.env.DB_USER || 'fethi',
  password: process.env.DB_PASSWORD
});
pool.query('SELECT * FROM landing_content WHERE content::text LIKE \\'%176344%\\' LIMIT 5')
  .then(res => console.log(JSON.stringify(res.rows, null, 2)))
  .catch(err => console.error(err))
  .finally(() => pool.end());
"
```

### Solution 2 : Copier les fichiers manquants dans le volume Docker

**Si vous avez les fichiers sur le VPS (hors Docker) :**

```bash
# Méthode 1 : Copier depuis un répertoire local
docker cp /chemin/vers/fichiers/uploads/. automivy-backend:/app/public/uploads/

# Méthode 2 : Utiliser un conteneur temporaire pour copier
docker run --rm \
  -v automivy_uploads:/destination \
  -v /chemin/vers/fichiers/uploads:/source \
  alpine sh -c "cp -r /source/. /destination/"
```

### Solution 3 : Re-uploader les fichiers via l'interface admin

**Si les fichiers n'existent plus :**

1. Connectez-vous à l'interface admin : `https://automivy.com`
2. Allez dans la section de gestion du contenu de la landing page
3. Re-uploadez les images manquantes
4. Les nouveaux fichiers seront automatiquement stockés dans le volume Docker

### Solution 4 : Migrer les fichiers depuis un backup

**Si vous avez un backup de la base de données ou des fichiers :**

```bash
# 1. Restaurer les fichiers depuis un backup
tar -xzf backup-uploads.tar.gz -C /tmp/uploads

# 2. Copier dans le volume Docker
docker run --rm \
  -v automivy_uploads:/data \
  -v /tmp/uploads:/source \
  alpine sh -c "cp -r /source/. /data/ && chmod -R 755 /data"
```

## 🧪 Vérification

**Après avoir copié les fichiers, vérifiez :**

```bash
# Vérifier que les fichiers sont présents
docker exec automivy-backend ls -la /app/public/uploads/ | grep "176344"

# Tester l'accès via le backend
docker exec automivy-backend curl -I http://localhost:3004/uploads/media-1763447744222-285086997.png

# Tester via Nginx Proxy Manager (depuis l'extérieur)
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

## 📝 Notes importantes

- **Les fichiers uploadés après le déploiement Docker** sont automatiquement stockés dans le volume `automivy_uploads`
- **Les fichiers uploadés avant le déploiement Docker** doivent être copiés manuellement dans le volume
- Le volume Docker est persistant : les fichiers ne seront pas perdus lors d'un redémarrage du conteneur
- Les permissions doivent être `755` pour les répertoires et `644` pour les fichiers

## 🔄 Prévention future

Pour éviter ce problème à l'avenir :

1. **Toujours uploader les fichiers via l'interface** après le déploiement Docker
2. **Sauvegarder régulièrement le volume Docker** :
   ```bash
   docker run --rm -v automivy_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup-$(date +%Y%m%d).tar.gz -C /data .
   ```

