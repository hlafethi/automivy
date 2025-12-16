# 🔗 Connecter Nginx Proxy Manager au Réseau des Conteneurs Automivy

## ⚠️ Problème

Nginx Proxy Manager ne peut pas se connecter aux conteneurs `automivy-frontend` et `automivy-backend` s'ils ne sont pas sur le même réseau Docker.

## ✅ Solution : Connecter Nginx Proxy Manager au Réseau

### Méthode 1 : Via Portainer (Recommandé)

1. **Identifier le réseau des conteneurs automivy** :
   - Allez dans **Containers** > `automivy-frontend` > **Inspect**
   - Notez le nom du réseau (probablement `default`, `bridge`, ou `automivy_default`)

2. **Connecter Nginx Proxy Manager au réseau** :
   - Allez dans **Networks**
   - Cliquez sur le réseau utilisé par `automivy-frontend` (ex: `default` ou `bridge`)
   - Cliquez sur **Containers** dans le menu
   - Cliquez sur **Connect container**
   - Sélectionnez le conteneur `npm` (Nginx Proxy Manager)
   - Cliquez sur **Connect**

### Méthode 2 : Via Terminal (SSH sur le VPS)

```bash
# 1. Identifier le réseau des conteneurs automivy
docker inspect automivy-frontend | grep -A 5 Networks

# 2. Identifier le nom du réseau (ex: "default", "bridge", "automivy_default")
# Cherchez la clé "Networks" dans la sortie

# 3. Connecter Nginx Proxy Manager au réseau
docker network connect <network-name> npm

# Exemple si le réseau s'appelle "default" :
docker network connect default npm

# Ou si c'est "bridge" :
docker network connect bridge npm
```

### Méthode 3 : Modifier la Stack de Nginx Proxy Manager

Si Nginx Proxy Manager est déployé via une Stack dans Portainer :

1. Allez dans **Stacks** > trouvez la stack de Nginx Proxy Manager
2. Cliquez sur **Editor**
3. Ajoutez le réseau `default` (ou le réseau utilisé par automivy) :

```yaml
services:
  npm:
    # ... autres configurations ...
    networks:
      - default  # Ajoutez ce réseau

networks:
  default:
    external: true
    name: default  # ou bridge, selon votre configuration
```

4. Sauvegardez et redéployez la stack

## 🔍 Vérification

### Vérifier que Nginx Proxy Manager est connecté

```bash
# Vérifier les réseaux de npm
docker inspect npm | grep -A 10 Networks

# Vérifier les conteneurs sur le réseau default
docker network inspect default | grep -A 5 Containers
```

Vous devriez voir `npm` et `automivy-frontend` / `automivy-backend` sur le même réseau.

### Tester la connexion depuis Nginx Proxy Manager

Dans Nginx Proxy Manager, créez un Proxy Host de test :
- **Forward Hostname / IP** : `automivy-frontend`
- **Forward Port** : `80`

Si la connexion fonctionne, vous devriez voir l'application React.

## 📝 Notes Importantes

- ⚠️ Les conteneurs `automivy-frontend` et `automivy-backend` **n'exposent PAS** de ports sur l'hôte (80, 3004, 3005 sont déjà utilisés)
- ✅ Nginx Proxy Manager se connecte directement via le réseau Docker en utilisant les noms de conteneurs
- ✅ Les ports utilisés sont les ports **internes** des conteneurs (80 pour frontend, 3004 pour backend)

## 🐛 Si ça ne fonctionne toujours pas

1. **Vérifiez que les conteneurs automivy sont bien démarrés** :
   ```bash
   docker ps | grep automivy
   ```

2. **Vérifiez que Nginx Proxy Manager peut résoudre les noms de conteneurs** :
   ```bash
   # Depuis le conteneur npm
   docker exec npm ping automivy-frontend
   docker exec npm ping automivy-backend
   ```

3. **Vérifiez les logs de Nginx Proxy Manager** :
   - Dans Portainer, allez dans **Containers** > `npm` > **Logs**
   - Cherchez les erreurs de connexion

---

*Guide créé le 2025-08-07*

