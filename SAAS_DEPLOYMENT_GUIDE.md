# 🚀 Guide de Déploiement SaaS Automivy

## 📋 Prérequis

### **Environnement de Développement**
- Node.js 18+ 
- PostgreSQL 14+
- n8n instance (locale ou distante)
- Supabase account

### **Variables d'Environnement**
```bash
# Backend (.env)
NODE_ENV=development
PORT=3004
DATABASE_URL=postgresql://user:password@localhost:5432/automivy
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=your-n8n-api-key
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:5173

# Frontend (.env)
VITE_API_URL=http://localhost:3004/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🗄️ Base de Données

### **1. Migration SQL**
```bash
# Exécuter la migration
psql -d automivy -f supabase/migrations/20250108000000_create_user_workflows_table.sql
```

### **2. Vérification RLS**
```sql
-- Vérifier que RLS est activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_workflows';

-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename = 'user_workflows';
```

## 🔧 Backend

### **1. Installation**
```bash
cd backend
npm install
```

### **2. Configuration**
```bash
# Copier le fichier d'environnement
cp env.example .env

# Éditer les variables
nano .env
```

### **3. Démarrage**
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

### **4. Vérification**
```bash
# Test de santé
curl http://localhost:3004/api/health

# Test des routes
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3004/api/user-workflows
```

## 🎨 Frontend

### **1. Installation**
```bash
npm install
```

### **2. Configuration**
```bash
# Copier le fichier d'environnement
cp env.example .env

# Éditer les variables
nano .env
```

### **3. Démarrage**
```bash
# Mode développement
npm run dev

# Build production
npm run build
```

### **4. Vérification**
```bash
# Ouvrir http://localhost:5173
# Se connecter avec un compte utilisateur
# Tester la création d'automatisation
```

## 🧪 Tests

### **1. Test d'Architecture**
```bash
# Exécuter le script de test
node test-saas-architecture.js
```

### **2. Test Manuel**
1. **Créer un utilisateur** via l'interface
2. **Se connecter** avec le compte
3. **Créer une automatisation** :
   - Choisir un template
   - Configurer IMAP
   - Définir l'heure
4. **Vérifier** que le workflow est créé dans n8n
5. **Tester** l'activation/désactivation
6. **Supprimer** l'automatisation

### **3. Vérifications**
- ✅ Workflow créé dans n8n
- ✅ Credential IMAP créé dans n8n
- ✅ Mapping sauvegardé en BDD
- ✅ RLS fonctionne (isolation utilisateur)
- ✅ Suppression en cascade

## 🔒 Sécurité

### **1. Credentials n8n**
```bash
# Vérifier que l'API key n8n est configurée
echo $N8N_API_KEY

# Tester la connexion n8n
curl -H "Authorization: Bearer $N8N_API_KEY" $N8N_URL/api/credentials
```

### **2. RLS Policies**
```sql
-- Vérifier l'isolation des données
SELECT * FROM user_workflows WHERE user_id = 'user-id';
-- Ne doit retourner que les workflows de cet utilisateur
```

### **3. Logs de Sécurité**
```bash
# Surveiller les logs backend
tail -f backend/logs/app.log

# Vérifier les tentatives d'accès
grep "Access denied" backend/logs/app.log
```

## 📊 Monitoring

### **1. Métriques Backend**
```bash
# Temps de réponse API
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3004/api/health

# Utilisation mémoire
ps aux | grep node
```

### **2. Métriques n8n**
```bash
# Vérifier l'état de n8n
curl $N8N_URL/api/health

# Compter les workflows
curl -H "Authorization: Bearer $N8N_API_KEY" $N8N_URL/api/workflows | jq length
```

### **3. Base de Données**
```sql
-- Statistiques utilisateurs
SELECT 
  COUNT(*) as total_workflows,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(CASE WHEN is_active THEN 1 ELSE 0 END) as active_rate
FROM user_workflows;

-- Workflows par utilisateur
SELECT user_id, COUNT(*) as workflow_count
FROM user_workflows
GROUP BY user_id;
```

## 🚀 Production

### **1. Variables d'Environnement Production**
```bash
NODE_ENV=production
PORT=3004
DATABASE_URL=postgresql://prod-user:secure-password@prod-db:5432/automivy
N8N_URL=https://n8n.globalsaas.eu
N8N_API_KEY=production-n8n-api-key
JWT_SECRET=production-jwt-secret-256-bits
CORS_ORIGIN=https://your-domain.com
```

### **2. Base de Données Production**
```sql
-- Créer l'utilisateur de production
CREATE USER automivy_prod WITH PASSWORD 'secure-password';
CREATE DATABASE automivy_prod OWNER automivy_prod;

-- Exécuter les migrations
\c automivy_prod
\i supabase/migrations/20250108000000_create_user_workflows_table.sql
```

### **3. Déploiement Backend**
```bash
# Build production
cd backend
npm run build

# Démarrage avec PM2
pm2 start ecosystem.config.js

# Vérification
pm2 status
pm2 logs automivy-backend
```

### **4. Déploiement Frontend**
```bash
# Build production
npm run build

# Déploiement sur serveur web
rsync -av dist/ user@server:/var/www/automivy/
```

## 🔧 Dépannage

### **Problèmes Courants**

#### **1. Erreur de Connexion n8n**
```bash
# Vérifier l'URL n8n
curl $N8N_URL/api/health

# Vérifier l'API key
curl -H "Authorization: Bearer $N8N_API_KEY" $N8N_URL/api/credentials
```

#### **2. Erreur RLS**
```sql
-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename = 'user_workflows';

-- Réactiver RLS si nécessaire
ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;
```

#### **3. Erreur de Credentials**
```bash
# Vérifier les logs backend
grep "credential" backend/logs/app.log

# Tester la création de credential
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -d '{"name":"test","type":"imap","data":{"host":"test"}}' \
  $N8N_URL/api/credentials
```

### **Logs Utiles**
```bash
# Backend
tail -f backend/logs/app.log | grep -E "(user-workflow|credential|n8n)"

# Frontend (console navigateur)
# Ouvrir DevTools → Console
# Filtrer par "UserWorkflow" ou "n8n"
```

## 📈 Optimisations

### **1. Performance**
- **Cache Redis** pour les templates fréquents
- **Connection pooling** pour PostgreSQL
- **CDN** pour les assets frontend

### **2. Scalabilité**
- **Load balancer** pour le backend
- **Database clustering** pour PostgreSQL
- **n8n clustering** pour les workflows

### **3. Monitoring**
- **Prometheus** pour les métriques
- **Grafana** pour les dashboards
- **Alertmanager** pour les alertes

---

## 🎉 Félicitations !

**Automivy est maintenant une plateforme SaaS complète et sécurisée !**

### **Fonctionnalités Implémentées**
- ✅ Workflows utilisateur isolés
- ✅ Credentials sécurisés
- ✅ Scheduling personnalisé
- ✅ Interface utilisateur intuitive
- ✅ Suppression en cascade
- ✅ Isolation des données (RLS)
- ✅ API REST complète

### **Prochaines Étapes**
- [ ] Tests de charge
- [ ] Monitoring avancé
- [ ] Documentation utilisateur
- [ ] Formation équipe
- [ ] Déploiement production
