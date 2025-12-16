# 🔐 Configuration Authentification GitHub pour Portainer

## Problème
```
Unable to clone git repository: failed to clone git repository: authentication required: Repository not found
```

Cette erreur se produit lorsque Portainer essaie d'accéder à un repository GitHub privé sans authentification.

## Solutions

### Solution 1 : Rendre le Repository Public (Rapide)

1. Allez sur GitHub : `https://github.com/hlafethi/automivy`
2. Allez dans **Settings** > **General** > **Danger Zone**
3. Cliquez sur **Change visibility** > **Make public**
4. Confirmez

⚠️ **Note** : Cette solution expose votre code publiquement. Si vous avez des secrets dans le code, utilisez plutôt la Solution 2.

### Solution 2 : Utiliser un Personal Access Token (Recommandé)

#### Étape 1 : Créer un Personal Access Token sur GitHub

1. Allez sur GitHub : `https://github.com/settings/tokens`
2. Cliquez sur **Generate new token** > **Generate new token (classic)**
3. Configurez :
   - **Note** : `Portainer Automivy`
   - **Expiration** : `No expiration` (ou une date lointaine)
   - **Scopes** : Cochez uniquement `repo` (accès complet aux repositories)
4. Cliquez sur **Generate token**
5. **⚠️ IMPORTANT** : Copiez le token immédiatement (vous ne pourrez plus le voir après)

#### Étape 2 : Configurer Portainer avec le Token

**Option A : Dans l'URL du Repository (Recommandé)**

Dans Portainer, lors de la création de la Stack :

1. **Repository URL** : Utilisez cette format :
   ```
   https://TOKEN@github.com/hlafethi/automivy.git
   ```
   Remplacez `TOKEN` par votre Personal Access Token.

   Exemple :
   ```
   https://ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@github.com/hlafethi/automivy.git
   ```

2. **Repository reference** : `refactor/code-cleanup-and-improvements` (ou votre branche)

3. **Compose path** : `docker-compose.portainer.yml`

**Option B : Configurer les Credentials dans Portainer**

1. Dans Portainer, allez dans **Settings** > **Registries**
2. Cliquez sur **Add registry**
3. Sélectionnez **GitHub**
4. Configurez :
   - **Name** : `github-automivy`
   - **Username** : Votre username GitHub (`hlafethi`)
   - **Password** : Votre Personal Access Token (pas votre mot de passe GitHub)
5. Cliquez sur **Create registry**

Ensuite, lors de la création de la Stack, sélectionnez ce registry dans le champ approprié.

### Solution 3 : Utiliser SSH (Avancé)

Si vous préférez utiliser SSH :

1. **Générer une clé SSH** (si vous n'en avez pas) :
   ```bash
   ssh-keygen -t ed25519 -C "portainer@automivy"
   ```

2. **Ajouter la clé publique à GitHub** :
   - Allez sur `https://github.com/settings/keys`
   - Cliquez sur **New SSH key**
   - Collez le contenu de `~/.ssh/id_ed25519.pub`

3. **Dans Portainer** :
   - Utilisez l'URL SSH : `git@github.com:hlafethi/automivy.git`
   - Configurez les credentials SSH si nécessaire

## Recommandation

Pour la simplicité et la sécurité, je recommande la **Solution 2 - Option A** (Token dans l'URL).

## Vérification

Après configuration, Portainer devrait pouvoir cloner le repository. Si l'erreur persiste :

1. Vérifiez que le token a les permissions `repo`
2. Vérifiez que l'URL du repository est correcte
3. Vérifiez que la branche existe (`refactor/code-cleanup-and-improvements`)
4. Vérifiez que le fichier `docker-compose.portainer.yml` existe dans le repository

## Sécurité

⚠️ **IMPORTANT** :
- Ne partagez JAMAIS votre Personal Access Token
- Ne commitez JAMAIS le token dans le code
- Utilisez des tokens avec des permissions minimales nécessaires
- Régénérez le token si vous pensez qu'il a été compromis

---

*Guide créé le 2025-08-07*

