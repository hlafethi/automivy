# Correction du nœud "Associer Emails Dossiers2"

## Problème identifié

Le nœud "Associer Emails Dossiers2" produit :
- `uid` au lieu de `id` (messageId)
- `mailbox` (path) au lieu de `destinationFolderId` (ID du dossier)

Mais "Move a message" attend :
- `{{ $json.id }}` pour le messageId
- `{{ $json.destinationFolderId }}` pour l'ID du dossier de destination

## Code corrigé

Remplacez le code actuel par celui-ci :

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

## Changements principaux

1. **Mapping nom → ID** : Au lieu de `folderNameToMailbox` (path), utilisez `folderNameToId` (ID du dossier)
2. **Champ `id`** : Utilisez `id` ou `messageId` au lieu de `uid` pour le messageId
3. **Champ `destinationFolderId`** : Utilisez l'ID du dossier au lieu du path
4. **Vérification du messageId** : Vérifiez que le messageId existe avant d'ajouter l'item

## Vérifications à faire

1. **Vérifier le nom du champ dans "Create a folder"** :
   - Ouvrez "Create a folder" et vérifiez quel champ contient l'ID du dossier créé
   - Généralement c'est `id` ou `folderId`
   - Ajustez le code si nécessaire : `folder.json.id || folder.json.folderId || folder.json.folder_id`

2. **Vérifier le nom du champ dans les emails** :
   - Ouvrez "Get many folder messages2" et vérifiez quel champ contient l'ID du message
   - Généralement c'est `id` pour Microsoft Outlook
   - Ajustez le code si nécessaire : `email.json.id || email.json.messageId || email.json.uid`

3. **Vérifier le nom du dossier dans "targetFolder"** :
   - Assurez-vous que `email.json.targetFolder` correspond exactement au nom du dossier dans `folder.json.name` ou `folder.json.labelName`
   - Le matching est case-insensitive mais vérifiez les espaces et caractères spéciaux

## Alternative : Ajouter un filtre IF

Si vous préférez garder le code actuel, ajoutez un nœud "IF" avant "Move a message" :

1. Ajoutez un nœud "IF" entre "Associer Emails Dossiers2" et "Move a message"
2. Condition : `{{ $json.skip !== true && $json.destinationFolderId != null }}`
3. Cela évitera d'exécuter "Move a message" quand il n'y a rien à déplacer

