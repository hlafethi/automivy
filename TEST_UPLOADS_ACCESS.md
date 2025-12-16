# 🧪 Test d'accès aux fichiers uploads

## ✅ Fichiers confirmés présents

Les fichiers sont bien dans le conteneur backend :
- ✅ `media-1763447744222-285086997.png`
- ✅ `media-1763448151605-841854033.png`
- ✅ `media-1763448155362-953480651.png`
- ✅ `media-1763448158840-90191985.png`
- ✅ `media-1763448162373-301805816.png`
- ✅ `media-1763448166385-375248340.png`
- ✅ `media-1763448169986-747563311.png`

## 🧪 Tests à effectuer

### Test 1 : Accès direct depuis le backend

```bash
docker exec automivy-backend curl -I http://localhost:3004/uploads/media-1763447744222-285086997.png
```

**Résultat attendu :** `HTTP/1.1 200 OK`

### Test 2 : Accès via Nginx Proxy Manager

```bash
curl -I https://automivy.com/uploads/media-1763447744222-285086997.png
```

**Résultat attendu :** `HTTP/1.1 200 OK`

### Test 3 : Vérifier le volume monté pour uploads

```bash
docker inspect automivy-backend | grep -A 20 "Mounts" | grep -A 5 "uploads"
```

Cela devrait montrer le volume monté sur `/app/public/uploads`.

## 🔍 Si les tests échouent

### Problème : 404 depuis le backend

Vérifier la configuration Express dans `backend/app.js` :

```javascript
app.use('/uploads', express.static('public/uploads'));
```

Le chemin doit être relatif au `WORKDIR` du conteneur (`/app`).

### Problème : 404 depuis Nginx Proxy Manager

Vérifier que la location `/uploads` est bien configurée dans Nginx Proxy Manager (onglet Advanced).

## ✅ Si tout fonctionne

Les images devraient maintenant s'afficher correctement dans l'interface admin ! 🎉

