/**
 * Script pour mettre à jour le template IMAP Tri Automatique BAL
 * avec le nouveau workflow JSON fonctionnel fourni par l'utilisateur
 * et nettoyer tous les credentials utilisateur
 */

const db = require('../database');

async function updateImapTemplateEnhanced() {
  console.log('🔧 [UpdateImapTemplate] Début de la mise à jour du template IMAP Tri Automatique BAL...');
  
  try {
    const templates = await db.query(
      `SELECT id, name, json FROM templates WHERE name ILIKE '%IMAP Tri Automatique BAL%'`
    );
    
    if (!templates.rows || templates.rows.length === 0) {
      console.error('❌ [UpdateImapTemplate] Aucun template IMAP Tri Automatique BAL trouvé');
      return;
    }
    
    console.log(`✅ [UpdateImapTemplate] ${templates.rows.length} template(s) trouvé(s)`);
    
    for (const template of templates.rows) {
      console.log(`\n🔍 [UpdateImapTemplate] Traitement du template: ${template.name} (ID: ${template.id})`);
      
      // Le nouveau workflow JSON fourni par l'utilisateur (sans credentials utilisateur)
      const newWorkflowJson = {
        "name": "IMAP Tri Automatique BAL",
        "nodes": [
          {
            "parameters": {
              "httpMethod": "POST",
              "path": "workflow-c1bd6bd6-8c210030",
              "options": {}
            },
            "id": "d4eff587-0bb2-4c9d-afd3-cc6081b8492e",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "position": [-1136, -1248],
            "webhookId": "23400b70-7bdf-4525-8d52-cec5ab7f3fe0",
            "typeVersion": 2.1
          },
          {
            "parameters": {
              "jsCode": "const emails = [];\nlet skippedInvalidEmail = 0;\n\nconsole.log('\\n🔍 DÉBUT ANALYSE DE ' + items.length + ' EMAILS');\n\nif (!items || items.length === 0) {\n  console.log('❌ Aucun email reçu');\n  return [{ json: { skip: true, message: 'Aucun email à traiter', emails: [] } }];\n}\n\nif (items.length > 0) {\n  console.log('📦 Structure premier email:', JSON.stringify(items[0].json, null, 2));\n}\n\nfor (let i = 0; i < items.length; i++) {\n  const item = items[i];\n  const e = item.json;\n  \n  let fromEmail = '';\n  let uid = '';\n  \n  if (e.uid) {\n    uid = e.uid.toString();\n  } else if (e.id) {\n    uid = e.id.toString();\n  } else if (e.messageId) {\n    uid = e.messageId;\n  } else {\n    uid = Math.random().toString(36).substring(2, 15);\n  }\n\n  if (e.from) {\n    if (Array.isArray(e.from) && e.from.length > 0) {\n      if (typeof e.from[0] === 'string') {\n        fromEmail = e.from[0];\n      } else if (e.from[0].address) {\n        fromEmail = e.from[0].address;\n      }\n    } else if (typeof e.from === 'string') {\n      fromEmail = e.from;\n    } else if (e.from.address) {\n      fromEmail = e.from.address;\n    }\n  }\n  \n  if (!fromEmail && e.envelope && e.envelope.from) {\n    if (Array.isArray(e.envelope.from) && e.envelope.from.length > 0) {\n      fromEmail = e.envelope.from[0].address || e.envelope.from[0];\n    }\n  }\n\n  if (fromEmail) fromEmail = fromEmail.trim().toLowerCase();\n  \n  if (!fromEmail || !fromEmail.includes('@')) {\n    console.warn('⚠️ Email sans expéditeur valide, UID:', uid);\n    skippedInvalidEmail++;\n    continue;\n  }\n\n  let subject = e.subject || (e.headers && e.headers.subject) || 'Sans sujet';\n  let date = e.date ? new Date(e.date).toISOString() : new Date().toISOString();\n\n  emails.push({\n    from: fromEmail,\n    subject,\n    date,\n    uid: uid,\n    originalData: e\n  });\n}\n\nconsole.log(`✅ ${emails.length} emails à traiter`);\nconsole.log(`❌ ${skippedInvalidEmail} emails ignorés (email invalide)`);\n\nif (emails.length === 0) {\n  console.log('⚠️ Aucun email valide à traiter');\n  return [{ json: { skip: true, message: 'Aucun email valide à traiter', emails: [] } }];\n}\n\nreturn emails.map(e => ({ json: e }));"
            },
            "id": "11e8eeaf-e113-4a94-a220-6fcea7a90d03",
            "name": "Normaliser Emails2",
            "type": "n8n-nodes-base.code",
            "position": [-672, -1248],
            "typeVersion": 2,
            "alwaysOutputData": true
          },
          {
            "parameters": {
              "jsCode": "const commonProviders = [\n  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr',\n  'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me', \n  'live.com', 'live.fr', 'msn.com', 'aol.com', 'wanadoo.fr', 'orange.fr', 'free.fr', \n  'sfr.fr', 'laposte.net', 'heleam.com'\n];\n\nconst allEmails = [];\n\nconsole.log('📋 DÉBUT CLASSIFICATION - ' + items.length + ' emails à classer');\n\nfor (let i = 0; i < items.length; i++) {\n  const item = items[i];\n  const email = item.json;\n  const fromEmail = email.from ? email.from.toLowerCase() : '';\n  \n  if (i < 3) {\n    console.log('📧 Email ' + i + ' from:', fromEmail);\n  }\n  \n  if (!fromEmail || fromEmail.trim() === '') {\n    allEmails.push({ \n      ...email, \n      targetFolder: 'Inconnu', \n      folderType: 'invalid',\n      senderEmail: 'email_manquant',\n      originalDomain: 'N/A'\n    });\n    continue;\n  }\n  \n  const parts = fromEmail.split('@');\n  if (parts.length !== 2) {\n    allEmails.push({ \n      ...email, \n      targetFolder: 'Inconnu', \n      folderType: 'invalid',\n      senderEmail: fromEmail,\n      originalDomain: 'N/A'\n    });\n    continue;\n  }\n  \n  const username = parts[0];\n  const fullDomain = parts[1];\n  \n  let folderName = '';\n  let folderType = '';\n  \n  if (commonProviders.includes(fullDomain)) {\n    folderName = username;\n    folderType = 'user';\n  } else {\n    const domainParts = fullDomain.split('.');\n    if (domainParts.length >= 2) {\n      folderName = domainParts[domainParts.length - 2];\n    } else {\n      folderName = fullDomain;\n    }\n    folderType = 'domain';\n  }\n  \n  folderName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_');\n  folderName = folderName.replace(/_+/g, '_');\n  folderName = folderName.replace(/^_+|_+$/g, '');\n  \n  if (folderName.length > 0) {\n    folderName = folderName.charAt(0).toUpperCase() + folderName.slice(1);\n  }\n  \n  if (!folderName) {\n    folderName = 'Autre';\n    folderType = 'default';\n  }\n  \n  allEmails.push({ \n    ...email, \n    targetFolder: folderName, \n    senderEmail: fromEmail,\n    folderType: folderType,\n    originalDomain: fullDomain\n  });\n}\n\nconsole.log(`📊 ${allEmails.length} emails classés`);\n\nconst folderCount = {};\nallEmails.forEach(e => {\n  folderCount[e.targetFolder] = (folderCount[e.targetFolder] || 0) + 1;\n});\n\nconsole.log('\\n=== RÉSUMÉ DES DOSSIERS ===');\nfor (const [folder, count] of Object.entries(folderCount).sort((a, b) => b[1] - a[1])) {\n  console.log(`  ${folder}: ${count} emails`);\n}\n\nreturn allEmails.map(e => ({ json: e }));"
            },
            "id": "7dc0cd72-c096-4ff9-8aaa-c79f3334a95d",
            "name": "Classifier par Dossier2",
            "type": "n8n-nodes-base.code",
            "position": [-480, -1248],
            "typeVersion": 2
          },
          {
            "parameters": {
              "jsCode": "const seenFolders = new Set();\nconst folders = [];\n\nfor (const item of items) {\n  const email = item.json;\n  const folder = (email.targetFolder || 'NonClassé').toString().trim();\n  \n  if (folder && !seenFolders.has(folder.toLowerCase())) {\n    seenFolders.add(folder.toLowerCase());\n    folders.push({\n      json: {\n        folderName: folder\n      }\n    });\n  }\n}\n\nconsole.log(`📋 ${folders.length} dossiers uniques trouvés`);\nconsole.log('Dossiers:', folders.map(f => f.json.folderName).join(', '));\n\nreturn folders;"
            },
            "id": "ddc322f2-53ae-47cc-82d4-feefddd883a2",
            "name": "Extraire Dossiers Uniques2",
            "type": "n8n-nodes-base.code",
            "position": [-304, -1248],
            "typeVersion": 2
          },
          {
            "parameters": {
              "jsCode": "const foldersNeeded = $('Extraire Dossiers Uniques2').all();\nconst existingFolders = items;\n\nconsole.log('🔍 DOSSIERS EXISTANTS:', existingFolders.length);\nconsole.log('📋 DOSSIERS NÉCESSAIRES:', foldersNeeded.length);\n\nconst existingNames = new Set(\n  existingFolders\n    .filter(f => f.json && typeof f.json.name === 'string')\n    .map(f => f.json.name.toLowerCase())\n);\n\nexistingFolders.forEach(f => {\n  if (f.json && f.json.path) {\n    existingNames.add(f.json.path.toLowerCase());\n  }\n});\n\nconsole.log('🗂️ DOSSIERS EXISTANTS:', Array.from(existingNames).join(', '));\n\nconst missingFolders = [];\nfor (const item of foldersNeeded) {\n  const folderName = item.json.folderName;\n  if (typeof folderName === 'string' && !existingNames.has(folderName.toLowerCase())) {\n    missingFolders.push({ json: { labelName: folderName } });\n  }\n}\n\nconsole.log(`✨ ${missingFolders.length} dossiers à créer`);\nif (missingFolders.length > 0) {\n  console.log('Dossiers à créer:', missingFolders.map(l => l.json.labelName).join(', '));\n} else {\n  console.log('✅ Tous les dossiers existent déjà');\n}\n\n// Retourner un item avec skip pour continuer le workflow sans créer de dossier\nif (missingFolders.length === 0) {\n  return [{ json: { skip: true, message: 'Tous les dossiers existent déjà' } }];\n}\n\nreturn missingFolders;"
            },
            "id": "74470449-c1c1-42b3-b8bf-06a26432c41a",
            "name": "Filtrer Dossiers Manquants2",
            "type": "n8n-nodes-base.code",
            "position": [48, -1248],
            "typeVersion": 2
          },
          {
            "parameters": {
              "jsCode": "const emails = $('Classifier par Dossier2').all();\nconst allFolders = items;\n\nconsole.log('🔍 EMAILS À ASSOCIER:', emails.length);\nconsole.log('📂 DOSSIERS IMAP DISPONIBLES:', allFolders.length);\n\nif (emails.length === 0) {\n  console.log('ℹ️ Aucun email à traiter');\n  return [{ json: { skip: true, message: 'Aucun email à déplacer' } }];\n}\n\nconst folderNameToMailbox = {};\nfor (const folder of allFolders) {\n  const name = (folder.json.name || '').toLowerCase().trim();\n  const path = folder.json.path || name;\n  if (name && path) {\n    folderNameToMailbox[name] = path;\n  }\n}\n\nconsole.log('>> Dossiers disponibles:', Object.keys(folderNameToMailbox).join(', '));\n\nconst result = [];\nlet matched = 0;\nlet unmatched = 0;\n\nfor (const email of emails) {\n  let targetFolder = (email.json.targetFolder || '').toLowerCase().trim();\n  let mailboxPath = folderNameToMailbox[targetFolder];\n\n  if (!mailboxPath && folderNameToMailbox['inbox']) {\n    console.warn(`⚠️ Fallback : ${email.json.targetFolder} => INBOX`);\n    mailboxPath = folderNameToMailbox['inbox'];\n  }\n\n  if (mailboxPath) {\n    result.push({\n      json: {\n        uid: email.json.uid,\n        targetFolder: email.json.targetFolder,\n        mailbox: mailboxPath,\n        from: email.json.from,\n        subject: email.json.subject\n      }\n    });\n    matched++;\n  } else {\n    console.warn(`⚠️ Pas de dossier trouvé pour: ${email.json.targetFolder}`);\n    unmatched++;\n  }\n}\n\nconsole.log(`✅ ${matched} emails associés à des dossiers`);\nconsole.log(`⚠️ ${unmatched} emails non associés`);\n\nif (result.length === 0) {\n  console.log('ℹ️ Aucun email à déplacer (tous restent dans INBOX)');\n  return [{ json: { skip: true, message: 'Aucun email à déplacer' } }];\n}\n\nreturn result;"
            },
            "id": "4537d78d-254e-455d-b870-afc99328a1a2",
            "name": "Associer Emails Dossiers2",
            "type": "n8n-nodes-base.code",
            "position": [560, -1248],
            "typeVersion": 2
          },
          {
            "parameters": {
              "jsCode": "// Récupérer les emails qui ont été déplacés avec succès\n// IMPORTANT: Le nœud MoveEmail email retourne des données différentes (path, destination, uidValidity, uidMap)\n// Il ne retourne PAS targetFolder, mailbox, uid directement\n// On doit récupérer les données depuis \"Associer Emails Dossiers2\" qui contient les vraies informations\n// et matcher avec les résultats de MoveEmail pour savoir lesquels ont réussi\n\n// Récupérer les données depuis \"Associer Emails Dossiers2\" qui contient targetFolder, mailbox, uid\nconst associatedEmails = $('Associer Emails Dossiers2').all();\n\n// Récupérer les résultats de MoveEmail (items vient de MoveEmail email)\n// Les emails transférés avec succès ont un destination défini et non undefined\nconst moveEmailResults = items;\n\n// Créer un map des emails transférés avec succès basé sur destination\n// destination contient le chemin du dossier de destination (ex: INBOX.Evengard)\n// IMPORTANT: Un email est transféré avec succès si destination est défini ET non undefined\nconst successfulTransfers = new Set();\nfor (const result of moveEmailResults) {\n  if (result.json && result.json.destination && \n      result.json.destination !== 'undefined' && \n      result.json.destination !== undefined &&\n      typeof result.json.destination === 'string' &&\n      result.json.destination.trim() !== '') {\n    // Utiliser le chemin complet comme clé (ex: INBOX.Admin)\n    successfulTransfers.add(result.json.destination);\n  }\n}\n\n// Filtrer les emails associés pour ne garder que ceux qui ont été transférés avec succès\n// IMPORTANT: Les résultats MoveEmail sont dans le même ordre que les emails associés\n// Un email est transféré avec succès si son résultat MoveEmail correspondant a un destination défini\nconst movedEmails = [];\nfor (let i = 0; i < associatedEmails.length && i < moveEmailResults.length; i++) {\n  const email = associatedEmails[i];\n  const moveResult = moveEmailResults[i];\n  \n  // Exclure les items avec skip\n  if (email.json && email.json.skip) continue;\n  \n  // Vérifier que l'email a les données nécessaires\n  if (!email.json || !email.json.mailbox || !email.json.targetFolder || !email.json.uid) continue;\n  \n  // Vérifier que targetFolder n'est pas 'Inconnu'\n  if (email.json.targetFolder === 'Inconnu') continue;\n  \n  // Vérifier que cet email a été transféré avec succès\n  // Le résultat MoveEmail doit avoir un destination défini et non undefined\n  // destination doit être une string non vide\n  const destination = moveResult.json && moveResult.json.destination;\n  if (destination && \n      destination !== 'undefined' && \n      destination !== undefined &&\n      typeof destination === 'string' &&\n      destination.trim() !== '') {\n    // Vérifier que le mailbox correspond au destination\n    const mailboxPath = email.json.mailbox;\n    if (mailboxPath === destination || successfulTransfers.has(destination)) {\n      movedEmails.push(email);\n    }\n  }\n}\n\n// Récupérer les données des nœuds précédents pour le contexte\nconst allFolders = $('LoadMailboxList mailbox2').all();\nconst allEmails = $('Classifier par Dossier2').all();\n\n// DEBUG: Logger pour comprendre ce qui se passe\nconsole.log('🔍 [Rapport] Items reçus du nœud MoveEmail:', moveEmailResults.length);\nconsole.log('🔍 [Rapport] Emails associés depuis Associer Emails Dossiers2:', associatedEmails.length);\nconsole.log('🔍 [Rapport] Transferts réussis détectés:', successfulTransfers.size);\nconsole.log('🔍 [Rapport] Emails filtrés (transférés avec succès):', movedEmails.length);\nif (movedEmails.length > 0) {\n  console.log('🔍 [Rapport] Premier email transféré:', JSON.stringify(movedEmails[0].json, null, 2));\n}\nif (associatedEmails.length > movedEmails.length) {\n  console.log('⚠️ [Rapport]', associatedEmails.length - movedEmails.length, 'email(s) n\\'ont pas été transférés (erreur ou skip)');\n}\n\nlet mailboxOwner = 'user@heleam.com';\n\n// Vérifier si le workflow a été skippé\nconst wasSkipped = movedEmails.length === 0;\n\n// Compter les emails transférés par dossier (uniquement ceux qui ont réussi)\nconst transferredStats = {};\nlet totalTransferred = 0;\n\nif (!wasSkipped && movedEmails.length > 0) {\n  // Compter les emails réellement transférés avec succès\n  for (const email of movedEmails) {\n    const folder = email.json.targetFolder || 'Inconnu';\n    transferredStats[folder] = (transferredStats[folder] || 0) + 1;\n    totalTransferred++;\n  }\n}\n\n// Compter tous les emails traités (pour le rapport)\nconst allEmailsStats = {};\nfor (const email of allEmails) {\n  const folder = email.json.targetFolder || 'Inconnu';\n  allEmailsStats[folder] = (allEmailsStats[folder] || 0) + 1;\n}\n\nconst uniqueFolders = [];\nconst seenFolders = new Set();\n\n// Filtrer les dossiers système\nfor (const folder of allFolders) {\n  if (folder.json && folder.json.name) {\n    const folderName = folder.json.name;\n    if (folderName !== '_skip_creation' && \n        !folderName.toLowerCase().startsWith('_') &&\n        !seenFolders.has(folderName)) {\n      seenFolders.add(folderName);\n      uniqueFolders.push(folderName);\n    }\n  }\n}\n\nuniqueFolders.sort();\n\nconsole.log(`📂 ${uniqueFolders.length} dossiers uniques trouvés`);\nconsole.log(`📊 ${totalTransferred} emails transférés vers ${Object.keys(transferredStats).length} dossiers`);\n\n// Filtrer \"Inconnu\" des stats de transfert - ne montrer que les dossiers qui ont réellement reçu des emails\nconst validTransferredStats = {};\nfor (const [folder, count] of Object.entries(transferredStats)) {\n  if (folder !== \"Inconnu\") {\n    validTransferredStats[folder] = count;\n  }\n}\n\nconst statusMessage = wasSkipped ? '⚠️ Aucun email transféré' : `✅ ${totalTransferred} email(s) transféré(s) avec succès`;\n\n// Thème vert #046f78\nconst greenColor = '#046f78';\nconst lightGreen = '#e0f4f6';\nconst darkGreen = '#034a52';\nconst white = '#ffffff';\nconst statusColor = wasSkipped ? '#fff3e0' : lightGreen;\nconst statusBorder = wasSkipped ? 'border-left: 4px solid #ff9800;' : 'border-left: 4px solid ' + greenColor + ';';\n\nlet html = `\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <style>\n    body { \n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; \n      line-height: 1.6; \n      color: #333; \n      max-width: 900px; \n      margin: 0 auto; \n      padding: 30px 20px; \n      background: #f5f5f5;\n    }\n    .container {\n      background: ${white};\n      border-radius: 12px;\n      box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n      padding: 40px;\n      margin-bottom: 20px;\n    }\n    h1 { \n      color: ${darkGreen}; \n      border-bottom: 4px solid ${greenColor}; \n      padding-bottom: 15px; \n      margin-top: 0;\n      font-size: 28px;\n    }\n    h2 { \n      color: ${darkGreen}; \n      margin-top: 35px; \n      font-size: 22px;\n      border-bottom: 2px solid ${lightGreen};\n      padding-bottom: 10px;\n    }\n    .summary { \n      background: ${statusColor}; \n      padding: 20px; \n      border-radius: 8px; \n      margin: 25px 0; \n      ${statusBorder}\n      box-shadow: 0 2px 4px rgba(0,0,0,0.05);\n    }\n    .success { \n      color: ${greenColor}; \n      font-weight: bold; \n      font-size: 18px;\n    }\n    .warning { \n      color: #ff9800; \n      font-weight: bold; \n      font-size: 18px;\n    }\n    table { \n      width: 100%; \n      border-collapse: collapse; \n      margin: 25px 0; \n      background: ${white};\n      border-radius: 8px;\n      overflow: hidden;\n      box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n    }\n    th, td { \n      padding: 15px; \n      text-align: left; \n      border-bottom: 1px solid #e0e0e0; \n    }\n    th { \n      background: linear-gradient(135deg, ${greenColor} 0%, ${darkGreen} 100%);\n      color: ${white}; \n      font-weight: 600;\n      text-transform: uppercase;\n      font-size: 13px;\n      letter-spacing: 0.5px;\n    }\n    tr:hover { \n      background-color: ${lightGreen}; \n    }\n    tr:last-child td {\n      border-bottom: none;\n    }\n    .folder-list { \n      display: grid;\n      grid-template-columns: repeat(3, 1fr);\n      gap: 12px;\n      list-style: none;\n      padding: 0;\n      margin: 20px 0;\n    }\n    .folder-list li { \n      display: flex;\n      align-items: center;\n      padding: 12px 16px;\n      background: ${lightGreen};\n      border-left: 4px solid ${greenColor};\n      border-radius: 6px;\n      font-weight: 500;\n      transition: all 0.2s ease;\n      box-shadow: 0 1px 3px rgba(0,0,0,0.1);\n    }\n    .folder-list li::before {\n      content: \"📁\";\n      font-size: 18px;\n      margin-right: 10px;\n      flex-shrink: 0;\n    }\n    .folder-list li:hover {\n      background: ${greenColor};\n      color: ${white};\n      transform: translateY(-2px);\n      box-shadow: 0 4px 8px rgba(0,0,0,0.15);\n    }\n    @media (max-width: 768px) {\n      .folder-list {\n        grid-template-columns: repeat(2, 1fr);\n      }\n    }\n    @media (max-width: 480px) {\n      .folder-list {\n        grid-template-columns: 1fr;\n      }\n    }\n    .footer { \n      margin-top: 50px; \n      padding-top: 25px; \n      border-top: 2px solid ${lightGreen}; \n      color: #7f8c8d; \n      font-size: 0.9em; \n      text-align: center;\n    }\n    .stat-item {\n      display: inline-block;\n      margin: 10px 20px 10px 0;\n      padding: 10px 15px;\n      background: ${lightGreen};\n      border-radius: 6px;\n      border-left: 4px solid ${greenColor};\n    }\n    .stat-label {\n      font-size: 12px;\n      color: #666;\n      text-transform: uppercase;\n      letter-spacing: 0.5px;\n    }\n    .stat-value {\n      font-size: 24px;\n      font-weight: bold;\n      color: ${greenColor};\n      display: block;\n      margin-top: 5px;\n    }\n    .transfer-badge {\n      display: inline-block;\n      background: ${greenColor};\n      color: ${white};\n      padding: 4px 10px;\n      border-radius: 12px;\n      font-size: 12px;\n      font-weight: bold;\n      margin-left: 10px;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <h1>📧 Rapport de Transfert IMAP</h1>\n    \n    <div class=\"summary\">\n      <p class=\"${wasSkipped ? 'warning' : 'success'}\">${statusMessage}</p>\n      <div style=\"margin-top: 15px;\">\n        <span class=\"stat-item\">\n          <span class=\"stat-label\">Emails transférés</span>\n          <span class=\"stat-value\">${totalTransferred}</span>\n        </span>\n        <span class=\"stat-item\">\n          <span class=\"stat-label\">Dossiers mis à jour</span>\n          <span class=\"stat-value\">${Object.keys(validTransferredStats).length}</span>\n        </span>\n        <span class=\"stat-item\">\n          <span class=\"stat-label\">Date</span>\n          <span class=\"stat-value\" style=\"font-size: 14px;\">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>\n        </span>\n      </div>\n    </div>\n`;\n\n// Afficher les transferts par dossier (uniquement les dossiers valides)\nif (Object.keys(validTransferredStats).length > 0) {\n  html += `\n    <h2>📊 Emails transférés par dossier</h2>\n    <table>\n      <thead>\n        <tr>\n          <th>Dossier de destination</th>\n          <th>Nombre d'emails transférés</th>\n        </tr>\n      </thead>\n      <tbody>\n`;\n\n  for (const [folder, count] of Object.entries(validTransferredStats).sort((a, b) => b[1] - a[1])) {\n    html += `        <tr>\n          <td><strong>📁 ${folder}</strong></td>\n          <td><span class=\"transfer-badge\">${count} email(s)</span></td>\n        </tr>\\n`;\n  }\n\n  html += `\n      </tbody>\n    </table>\n`;\n}\n\n// Afficher les emails non transférés (Inconnu)\nif (allEmailsStats[\"Inconnu\"] && allEmailsStats[\"Inconnu\"] > 0) {\n  const unknownCount = allEmailsStats[\"Inconnu\"];\n  const transferredUnknown = transferredStats[\"Inconnu\"] || 0;\n  if (transferredUnknown < unknownCount) {\n    html += `\n    <div class=\"summary\" style=\"background: #fff3e0; border-left: 4px solid #ff9800;\">\n      <p class=\"warning\">⚠️ Attention : ${unknownCount - transferredUnknown} email(s) n\\'ont pas pu être transférés</p>\n      <p style=\"font-size: 0.9em; margin-top: 10px;\">Ces emails n\\'ont pas pu être automatiquement classés. Vérifiez :</p>\n      <ul style=\"font-size: 0.9em; margin-top: 10px;\">\n        <li>Que les emails ont bien un expéditeur valide</li>\n        <li>Que les dossiers cibles existent</li>\n        <li>Les logs de la console pour plus de détails</li>\n      </ul>\n    </div>\n`;\n  }\n}\n\nif (wasSkipped && totalTransferred === 0) {\n  html += `\n    <div class=\"summary\" style=\"background: #e3f2fd; border-left: 4px solid #2196f3;\">\n      <p style=\"color: #1565c0; font-weight: bold;\">ℹ️ Aucun email à transférer</p>\n      <p style=\"font-size: 0.9em; margin-top: 10px;\">La boîte INBOX est vide ou tous les emails ont déjà été classés.</p>\n    </div>\n`;\n}\n\nhtml += `\n    <h2>📂 Dossiers IMAP actifs (${uniqueFolders.length})</h2>\n    <ul class=\"folder-list\">\n`;\n\nfor (const folderName of uniqueFolders) {\n  html += `      <li>${folderName}</li>\\n`;\n}\n\nhtml += `\n    </ul>\n  </div>\n\n  <div class=\"footer\">\n    <p><strong>Ce rapport a été généré automatiquement par automivy de tri IMAP</strong></p>\n    <p>Boîte mail : ${mailboxOwner}</p>\n  </div>\n</body>\n</html>\n`;\n\nreturn [{\n  json: {\n    mailboxOwner,\n    html,\n    count: totalTransferred,\n    folders: Object.keys(validTransferredStats).length,\n    stats: validTransferredStats,\n    totalEmails: allEmails.length\n  }\n}];"
            },
            "id": "82dbd98e-2e54-4aa8-96f1-c686ac948c3b",
            "name": "Générer Rapport2",
            "type": "n8n-nodes-base.code",
            "position": [864, -1248],
            "typeVersion": 2
          },
          {
            "parameters": {
              "fromEmail": "admin@heleam.com",
              "toEmail": "={{ $json.mailboxOwner }}",
              "subject": "=✅ Rapport Transfert IMAP - {{ $json.count }} email(s) transféré(s) vers {{ $json.folders }} dossier(s)",
              "emailFormat": "html",
              "html": "={{ $json.html }}",
              "options": {}
            },
            "id": "9231f0e1-f55d-412e-ac66-1067e9b9af0c",
            "name": "Envoyer Rapport2",
            "type": "n8n-nodes-base.emailSend",
            "position": [1056, -1248],
            "webhookId": "029e2634-a5bf-4c18-9a16-77f0e65a2a93",
            "typeVersion": 2
          },
          {
            "parameters": {
              "authentication": "coreImapAccount",
              "resource": "email",
              "emailDateRange": {
                "since": ""
              },
              "emailFlags": {
                "seen": true
              },
              "customLabels": {},
              "emailSearchFilters": {}
            },
            "id": "0ea4f1d7-c2a2-495d-9405-f6ec223651ef",
            "name": "LoadMailboxList mailbox",
            "type": "n8n-nodes-imap-enhanced.imapEnhanced",
            "typeVersion": 1,
            "position": [-880, -1248],
            "alwaysOutputData": true
          },
          {
            "parameters": {
              "authentication": "coreImapAccount"
            },
            "id": "63c810b6-0e0a-4a38-8ba9-dc60c571d2a6",
            "name": "LoadMailboxList mailbox1",
            "type": "n8n-nodes-imap-enhanced.imapEnhanced",
            "typeVersion": 1,
            "position": [-128, -1248]
          },
          {
            "parameters": {
              "authentication": "coreImapAccount",
              "operation": "createMailbox",
              "mailboxName": "={{ $json.labelName }}"
            },
            "id": "faf11037-42c4-4908-bde9-d99bf9370e4c",
            "name": "CreateMailbox mailbox",
            "type": "n8n-nodes-imap-enhanced.imapEnhanced",
            "typeVersion": 1,
            "position": [224, -1248],
            "continueOnFail": true
          },
          {
            "parameters": {
              "authentication": "coreImapAccount"
            },
            "id": "a64fa46f-27fe-4772-85a4-1c83a84f5261",
            "name": "LoadMailboxList mailbox2",
            "type": "n8n-nodes-imap-enhanced.imapEnhanced",
            "typeVersion": 1,
            "position": [400, -1248]
          },
          {
            "parameters": {
              "authentication": "coreImapAccount",
              "resource": "email",
              "operation": "moveEmail",
              "sourceMailbox": {
                "__rl": true,
                "mode": "list",
                "value": "INBOX"
              },
              "emailUid": "={{ $json.uid }}",
              "destinationMailbox": {
                "__rl": true,
                "mode": "id",
                "value": "={{ $json.mailbox }}"
              }
            },
            "id": "acca58a7-225e-4907-b008-19675e059373",
            "name": "MoveEmail email",
            "type": "n8n-nodes-imap-enhanced.imapEnhanced",
            "typeVersion": 1,
            "position": [720, -1248],
            "continueOnFail": true
          }
        ],
        "pinData": {},
        "connections": {
          "Webhook": {
            "main": [[{"node": "LoadMailboxList mailbox", "type": "main", "index": 0}]]
          },
          "MoveEmail email": {
            "main": [[{"node": "Générer Rapport2", "type": "main", "index": 0}]]
          },
          "Envoyer Rapport2": {
            "main": [[]]
          },
          "Générer Rapport2": {
            "main": [[{"node": "Envoyer Rapport2", "type": "main", "index": 0}]]
          },
          "Normaliser Emails2": {
            "main": [[{"node": "Classifier par Dossier2", "type": "main", "index": 0}]]
          },
          "CreateMailbox mailbox": {
            "main": [[{"node": "LoadMailboxList mailbox2", "type": "main", "index": 0}]]
          },
          "Classifier par Dossier2": {
            "main": [[{"node": "Extraire Dossiers Uniques2", "type": "main", "index": 0}]]
          },
          "LoadMailboxList mailbox": {
            "main": [[{"node": "Normaliser Emails2", "type": "main", "index": 0}]]
          },
          "LoadMailboxList mailbox1": {
            "main": [[{"node": "Filtrer Dossiers Manquants2", "type": "main", "index": 0}]]
          },
          "LoadMailboxList mailbox2": {
            "main": [[{"node": "Associer Emails Dossiers2", "type": "main", "index": 0}]]
          },
          "Associer Emails Dossiers2": {
            "main": [[{"node": "MoveEmail email", "type": "main", "index": 0}]]
          },
          "Extraire Dossiers Uniques2": {
            "main": [[{"node": "LoadMailboxList mailbox1", "type": "main", "index": 0}]]
          },
          "Filtrer Dossiers Manquants2": {
            "main": [[{"node": "CreateMailbox mailbox", "type": "main", "index": 0}]]
          }
        },
        "active": false,
        "settings": {
          "callerPolicy": "workflowsFromSameOwner",
          "availableInMCP": false
        },
        "meta": {
          "templateCredsSetupCompleted": true
        },
        "tags": []
      };
      
      // Nettoyer tous les credentials utilisateur du workflow
      console.log('🔧 [UpdateImapTemplate] Nettoyage des credentials utilisateur...');
      newWorkflowJson.nodes = newWorkflowJson.nodes.map(node => {
        const cleanedNode = { ...node };
        
        // Supprimer tous les credentials IMAP
        if (node.type === 'n8n-nodes-imap-enhanced.imapEnhanced' && cleanedNode.credentials) {
          delete cleanedNode.credentials;
          console.log(`  🗑️ [UpdateImapTemplate] Credentials supprimés du nœud ${node.name}`);
        }
        
        // Supprimer les credentials SMTP (sauf admin)
        if (node.type === 'n8n-nodes-base.emailSend' && cleanedNode.credentials?.smtp) {
          delete cleanedNode.credentials.smtp;
          if (Object.keys(cleanedNode.credentials || {}).length === 0) {
            delete cleanedNode.credentials;
          }
          console.log(`  🗑️ [UpdateImapTemplate] Credential SMTP utilisateur supprimé du nœud ${node.name}`);
        }
        
        return cleanedNode;
      });
      
      // Sauvegarder le template nettoyé
      const updatedJson = JSON.stringify(newWorkflowJson);
      await db.query(
        `UPDATE templates SET json = $1 WHERE id = $2`,
        [updatedJson, template.id]
      );
      
      console.log(`✅ [UpdateImapTemplate] Template ${template.name} mis à jour dans la base de données`);
      console.log(`✅ [UpdateImapTemplate] Tous les credentials utilisateur ont été supprimés`);
    }
    
    console.log('\n✅ [UpdateImapTemplate] Mise à jour terminée avec succès!');
  } catch (error) {
    console.error('❌ [UpdateImapTemplate] Erreur lors de la mise à jour du template IMAP:', error.message);
    console.error('❌ [UpdateImapTemplate] Stack:', error.stack);
  } finally {
    await db.end();
    console.log('✅ Script terminé');
  }
}

updateImapTemplateEnhanced();

