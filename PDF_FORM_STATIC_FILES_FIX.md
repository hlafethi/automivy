# 🔧 **Formulaire PDF - Correction Fichiers Statiques**

## ✅ **Problème Identifié et Corrigé**

### **🚨 Erreur "Route not found" - Fichiers Statiques Non Servis**

**Problème :** Le backend Express ne servait pas les fichiers statiques HTML, causant l'erreur `{"error":"Route not found"}`.

**URL problématique :**
```
http://localhost:3004/upload-form-personalized.html?token=deploy_1760608716790_30zmyyiv2&template=4ef673d9-daa9-4ff8-baa5-92adf078fd9b&user=8c210030-7d0a-48ee-97d2-b74564b1efef
```

**Cause :** Le serveur Express n'était pas configuré pour servir les fichiers statiques depuis le répertoire parent.

### **🔍 Analyse du Problème**

**Structure des fichiers :**
```
automivy/
├── backend/           # Serveur Express (port 3004)
│   └── app.js        # Configuration Express
└── upload-form-personalized.html  # Fichier HTML à servir
```

**Problème :** Express ne savait pas où trouver le fichier `upload-form-personalized.html`.

### **🔧 Solution Appliquée**

**Fichier modifié :** `backend/app.js`

**Ajout de la configuration des fichiers statiques :**
```javascript
// Servir les fichiers statiques depuis le répertoire parent
app.use(express.static('../'));
```

**Placement :** Après les middlewares de base, avant les routes API.

### **📋 Configuration Complète**

**Ordre des middlewares :**
```javascript
// 1. CORS
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// 2. Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Fichiers statiques (NOUVEAU)
app.use(express.static('../'));

// 4. Routes API
app.use('/api/auth', authRoutes);
// ... autres routes
```

### **🎯 Résultat Attendu**

**Maintenant le serveur peut servir :**
- ✅ `http://localhost:3004/upload-form-personalized.html` → Fichier HTML
- ✅ `http://localhost:3004/index.html` → Page d'accueil
- ✅ `http://localhost:3004/public/automivy-favicon.svg` → Favicon
- ✅ Tous les autres fichiers statiques du projet

### **🚀 Test de Fonctionnement**

**URL complète avec paramètres :**
```
http://localhost:3004/upload-form-personalized.html?token=deploy_1760608716790_30zmyyiv2&template=4ef673d9-daa9-4ff8-baa5-92adf078fd9b&user=8c210030-7d0a-48ee-97d2-b74564b1efef
```

**Paramètres disponibles dans le formulaire :**
- **`token`** : Token unique de déploiement
- **`template`** : ID du template/workflow
- **`user`** : ID de l'utilisateur

### **🔍 Vérification**

**Pour tester que le fichier est accessible :**
1. Ouvrez `http://localhost:3004/upload-form-personalized.html` dans le navigateur
2. Vérifiez que le formulaire PDF s'affiche
3. Testez l'upload de fichiers PDF
4. Vérifiez que le workflow n8n se déclenche

### **📝 Notes Techniques**

**Configuration Express :**
- `express.static('../')` : Sert les fichiers depuis le répertoire parent
- Chemin relatif : `../` depuis `backend/` vers la racine du projet
- Ordre important : Fichiers statiques avant les routes API

**Sécurité :** Les fichiers statiques sont servis en lecture seule, pas d'exécution de code côté serveur.

**Le formulaire PDF devrait maintenant être accessible !** 🎉
