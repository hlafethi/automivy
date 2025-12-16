# Solution : Ajouter un filtre IF avant "Move a message"

## Problème

"Associer Emails Dossiers2" produit `skip: true` quand il n'y a pas d'emails à déplacer, mais "Move a message" essaie quand même de s'exécuter et échoue car `destinationFolderId` est `undefined`.

## Solution immédiate : Ajouter un nœud IF

### Étape 1 : Ajouter un nœud IF

1. Dans n8n, ouvrez votre workflow
2. Ajoutez un nœud "IF" entre "Associer Emails Dossiers2" et "Move a message"
3. Connectez :
   - "Associer Emails Dossiers2" → "IF" → "Move a message"

### Étape 2 : Configurer le nœud IF

1. Ouvrez le nœud "IF"
2. Dans "Condition", sélectionnez "Expression"
3. Entrez cette condition :
   ```
   {{ $json.skip !== true && $json.destinationFolderId != null && $json.destinationFolderId != undefined }}
   ```
   
   **OU** plus simple :
   ```
   {{ $json.skip !== true }}
   ```

4. Cela signifie : "Continuer seulement si skip n'est pas true"

### Étape 3 : Vérifier les connexions

- **Sortie TRUE** du nœud IF → Connectez à "Move a message"
- **Sortie FALSE** du nœud IF → Vous pouvez la laisser vide ou connecter à un nœud de log

### Étape 4 : Sauvegarder

1. Sauvegardez le nœud IF
2. Sauvegardez le workflow

## Solution complète : Corriger aussi "Associer Emails Dossiers2"

Même avec le filtre IF, il faut corriger "Associer Emails Dossiers2" pour qu'il produise les bonnes données quand il y a des emails à déplacer.

### Code corrigé pour "Associer Emails Dossiers2"

```javascript
const emails = $('Classifier par Dossier2').all();
const allFolders = items;

console.log('🔍 EMAILS À ASSOCIER:', emails.length);
console.log('📂 DOSSIERS DISPONIBLES:', allFolders.length);

if (emails.length === 0) {
  console.log('ℹ️ Aucun email à traiter');
  return [{ json: { skip: true, message: 'Aucun email à déplacer' } }];
}

// Créer un mapping nom de dossier → ID du dossier
const folderNameToId = {};
for (const folder of allFolders) {
  const name = (folder.json.name || folder.json.labelName || '').toLowerCase().trim();
  // L'ID du dossier peut être dans 'id', 'folderId', ou 'folder_id'
  const folderId = folder.json.id || folder.json.folderId || folder.json.folder_id;
  
  if (name && folderId) {
    folderNameToId[name] = folderId;
    console.log(`📁 Dossier mappé: ${name} → ${folderId}`);
  }
}

console.log('>> Dossiers disponibles:', Object.keys(folderNameToId).join(', '));

const result = [];
let matched = 0;
let unmatched = 0;

for (const email of emails) {
  let targetFolder = (email.json.targetFolder || '').toLowerCase().trim();
  let destinationFolderId = folderNameToId[targetFolder];

  // Fallback vers inbox si le dossier n'est pas trouvé
  if (!destinationFolderId && folderNameToId['inbox']) {
    console.warn(`⚠️ Fallback : ${email.json.targetFolder} => INBOX`);
    destinationFolderId = folderNameToId['inbox'];
  }

  if (destinationFolderId) {
    // Utiliser 'id' pour le messageId (Microsoft Outlook utilise 'id', pas 'uid')
    const messageId = email.json.id || email.json.messageId || email.json.uid;
    
    if (!messageId) {
      console.warn(`⚠️ Pas de messageId trouvé pour l'email: ${email.json.subject}`);
      unmatched++;
      continue;
    }

    result.push({
      json: {
        id: messageId,                    // ID du message pour "Move a message"
        destinationFolderId: destinationFolderId,  // ID du dossier pour "Move a message"
        targetFolder: email.json.targetFolder,      // Nom du dossier (pour debug)
        from: email.json.from,
        subject: email.json.subject
      }
    });
    matched++;
  } else {
    console.warn(`⚠️ Pas de dossier trouvé pour: ${email.json.targetFolder}`);
    unmatched++;
  }
}

console.log(`✅ ${matched} emails associés à des dossiers`);
console.log(`⚠️ ${unmatched} emails non associés`);

if (result.length === 0) {
  console.log('ℹ️ Aucun email à déplacer (tous restent dans INBOX)');
  return [{ json: { skip: true, message: 'Aucun email à déplacer' } }];
}

return result;
```

## Vérifications

1. **Vérifier les données dans "Create a folder"** :
   - Ouvrez "Create a folder" et regardez la sortie
   - Identifiez quel champ contient l'ID du dossier créé (généralement `id` ou `folderId`)
   - Ajustez le code si nécessaire

2. **Vérifier les données dans "Get many folder messages2"** :
   - Ouvrez "Get many folder messages2" et regardez la sortie
   - Identifiez quel champ contient l'ID du message (généralement `id` pour Microsoft Outlook)
   - Ajustez le code si nécessaire

3. **Vérifier le matching des noms de dossiers** :
   - Assurez-vous que `email.json.targetFolder` correspond exactement au nom dans `folder.json.name` ou `folder.json.labelName`
   - Le matching est case-insensitive mais vérifiez les espaces

## Résumé

1. ✅ **Ajoutez un nœud IF** avant "Move a message" pour filtrer `skip: true`
2. ✅ **Corrigez le code** de "Associer Emails Dossiers2" pour produire `id` et `destinationFolderId`
3. ✅ **Vérifiez les champs** dans "Create a folder" et "Get many folder messages2"
4. ✅ **Testez** le workflow

