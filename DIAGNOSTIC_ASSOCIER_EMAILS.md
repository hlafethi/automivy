# Diagnostic du nœud "Associer Emails Dossiers2"

## Problème

Le nœud produit `skip: true` même si :
- "Get many folder messages2" produit 2700 items avec des `id`
- "Create a folder" produit 27 items

## Code de diagnostic à ajouter

Ajoutez ce code **AU DÉBUT** de votre nœud "Associer Emails Dossiers2" pour voir ce qui se passe :

```javascript
const emails = $('Classifier par Dossier2').all();
const allFolders = items;

console.log('🔍 EMAILS À ASSOCIER:', emails.length);
console.log('📂 DOSSIERS DISPONIBLES:', allFolders.length);

// DIAGNOSTIC : Afficher les premiers emails
if (emails.length > 0) {
  console.log('📧 Premier email:', JSON.stringify(emails[0].json, null, 2));
  console.log('📧 Champs disponibles dans email:', Object.keys(emails[0].json).join(', '));
  console.log('📧 targetFolder:', emails[0].json.targetFolder);
}

// DIAGNOSTIC : Afficher les premiers dossiers
if (allFolders.length > 0) {
  console.log('📁 Premier dossier:', JSON.stringify(allFolders[0].json, null, 2));
  console.log('📁 Champs disponibles dans dossier:', Object.keys(allFolders[0].json).join(', '));
  console.log('📁 name:', allFolders[0].json.name);
  console.log('📁 labelName:', allFolders[0].json.labelName);
  console.log('📁 id:', allFolders[0].json.id);
  console.log('📁 folderId:', allFolders[0].json.folderId);
}

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
    console.log(`📁 Dossier mappé: "${name}" → ${folderId}`);
  } else {
    console.log(`⚠️ Dossier ignoré (nom ou ID manquant):`, {
      name: folder.json.name || folder.json.labelName,
      id: folder.json.id || folder.json.folderId || folder.json.folder_id
    });
  }
}

console.log('>> Dossiers disponibles:', Object.keys(folderNameToId).join(', '));

const result = [];
let matched = 0;
let unmatched = 0;

for (const email of emails) {
  let targetFolder = (email.json.targetFolder || '').toLowerCase().trim();
  
  // DIAGNOSTIC : Afficher le targetFolder de chaque email
  if (!targetFolder) {
    console.warn(`⚠️ Email sans targetFolder: ${email.json.subject || email.json.id}`);
  }
  
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
        id: messageId,
        destinationFolderId: destinationFolderId,
        targetFolder: email.json.targetFolder,
        from: email.json.from,
        subject: email.json.subject
      }
    });
    matched++;
  } else {
    console.warn(`⚠️ Pas de dossier trouvé pour: "${email.json.targetFolder}" (recherché: "${targetFolder}")`);
    console.warn(`   Dossiers disponibles: ${Object.keys(folderNameToId).join(', ')}`);
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

## Points à vérifier dans les logs

Après avoir exécuté le workflow, regardez les logs dans la console n8n :

1. **Vérifiez les emails** :
   - Est-ce que `emails.length` est > 0 ?
   - Est-ce que `email.json.targetFolder` existe et a une valeur ?
   - Quels sont les champs disponibles dans les emails ?

2. **Vérifiez les dossiers** :
   - Est-ce que `allFolders.length` est > 0 ?
   - Est-ce que `folder.json.id` ou `folder.json.folderId` existe ?
   - Est-ce que `folder.json.name` ou `folder.json.labelName` existe ?
   - Les noms de dossiers sont-ils bien mappés ?

3. **Vérifiez le matching** :
   - Est-ce que `targetFolder` (en minuscules) correspond à un nom de dossier dans `folderNameToId` ?
   - Y a-t-il des différences de casse, d'espaces, ou de caractères spéciaux ?

## Solutions possibles

### Solution 1 : Les emails n'ont pas de `targetFolder`

Si "Classifier par Dossier2" ne produit pas de `targetFolder`, vérifiez ce nœud :
- Il doit produire un champ `targetFolder` pour chaque email
- Ce champ doit contenir le nom du dossier de destination

### Solution 2 : Les dossiers n'ont pas d'`id`

Si "Create a folder" ne produit pas d'`id` ou `folderId`, vérifiez :
- Le nœud "Create a folder" doit retourner l'ID du dossier créé
- Généralement dans le champ `id` ou `folderId`

### Solution 3 : Le matching ne fonctionne pas

Si les noms ne matchent pas :
- Vérifiez les espaces, la casse, les caractères spéciaux
- Normalisez les noms (trim, lowercase) des deux côtés
- Utilisez un matching plus flexible si nécessaire

