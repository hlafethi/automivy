# Configuration NocoDB pour LinkedIn Workflows

## Variables d'environnement requises

### 1. NOCODB_BASE_URL
L'URL de base de votre instance NocoDB.

**Exemple :**
```env
NOCODB_BASE_URL=https://noco.example.com
```

### 2. NOCODB_API_TOKEN
Le token API NocoDB pour l'authentification.

**Exemple :**
```env
NOCODB_API_TOKEN=votre_token_api_nocodb
```

### 3. NOCODB_BASE_ID ⚠️ IMPORTANT
L'identifiant unique de la base (workspace) dans NocoDB.

## Comment trouver le BASE_ID dans NocoDB

### Méthode 1 : Via l'URL
1. Connectez-vous à votre instance NocoDB
2. Ouvrez la base de données que vous voulez utiliser
3. Regardez l'URL dans votre navigateur
4. L'URL ressemble à : `https://noco.example.com/dashboard/#/nc/base/{BASE_ID}`
5. Le `BASE_ID` est la partie après `/nc/base/`

**Exemple :**
- URL : `https://noco.example.com/dashboard/#/nc/base/abc123def456`
- BASE_ID : `abc123def456`

### Méthode 2 : Via l'API NocoDB
1. Utilisez votre token API NocoDB
2. Appelez l'endpoint : `GET https://votre-nocodb.com/api/v2/meta/bases`
3. Vous obtiendrez une liste de bases avec leurs IDs

**Exemple de requête :**
```bash
curl -X GET "https://noco.example.com/api/v2/meta/bases" \
  -H "xc-token: votre_token_api"
```

**Exemple de réponse :**
```json
[
  {
    "id": "abc123def456",
    "title": "Ma Base de Données",
    "type": "database",
    ...
  }
]
```

### Méthode 3 : Via l'interface NocoDB
1. Connectez-vous à NocoDB
2. Cliquez sur la base de données
3. Ouvrez les paramètres de la base
4. L'ID de la base est visible dans les informations

## Configuration

Vous pouvez configurer NocoDB de deux façons :

### Option 1 : Via le fichier .env (recommandé pour le développement)

Une fois que vous avez trouvé le BASE_ID, ajoutez-le dans votre fichier `.env` :

```env
# Configuration NocoDB
NOCODB_BASE_URL=https://noco.example.com
NOCODB_API_TOKEN=votre_token_api_nocodb
NOCODB_BASE_ID=abc123def456
```

### Option 2 : Via la base de données (recommandé pour la production)

Vous pouvez aussi stocker la configuration dans la table `admin_api_keys` avec le champ `additional_data` :

```sql
-- Mettre à jour ou insérer la configuration NocoDB
INSERT INTO admin_api_keys (service_name, api_key, additional_data, is_active)
VALUES (
  'nocodb_api_token',
  'votre_token_api_nocodb',
  '{"baseUrl": "https://noco.example.com", "baseId": "abc123def456"}'::jsonb,
  true
)
ON CONFLICT (service_name) 
DO UPDATE SET 
  api_key = EXCLUDED.api_key,
  additional_data = EXCLUDED.additional_data,
  is_active = EXCLUDED.is_active;
```

**Avantages de cette méthode :**
- Configuration centralisée dans la base de données
- Pas besoin de redémarrer le serveur pour changer la configuration
- Plus sécurisé (pas de secrets dans les fichiers)

## Vérification

Pour vérifier que votre configuration est correcte, vous pouvez tester l'API :

```bash
curl -X GET "https://noco.example.com/api/v2/meta/bases/abc123def456/tables" \
  -H "xc-token: votre_token_api"
```

Si vous obtenez une liste de tables, votre configuration est correcte !

## Notes importantes

- Le `BASE_ID` est unique pour chaque base (workspace) dans NocoDB
- Si vous avez plusieurs bases, vous devez utiliser le `BASE_ID` de la base qui contient vos tables LinkedIn
- Le `BASE_ID` est différent de l'ID de table
- Si vous ne configurez pas `NOCODB_BASE_ID`, le système utilisera `'base_id'` par défaut (qui ne fonctionnera probablement pas)

