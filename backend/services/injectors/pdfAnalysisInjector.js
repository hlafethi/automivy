// Injecteur spécifique pour le template "PDF Analysis Complete"
// Ce template nécessite :
// - OpenRouter (admin)
// - SMTP (admin pour l'envoi du rapport)

const { analyzeWorkflowCredentials, validateFormData } = require('../workflowAnalyzer');
const { getAdminCredentials } = require('../n8nService');

/**
 * Injecte les credentials utilisateur pour le template PDF Analysis
 * @param {Object} workflow - Workflow template
 * @param {Object} userCredentials - Credentials de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} templateId - ID du template
 * @param {string} templateName - Nom du template
 * @returns {Object} Workflow avec credentials injectés
 */
async function injectUserCredentials(workflow, userCredentials, userId, templateId = null, templateName = null) {
  console.log('🎯 [PdfAnalysisInjector] Injection spécifique pour PDF Analysis Complete...');
  console.log('🎯 [PdfAnalysisInjector] Template ID:', templateId);
  console.log('🎯 [PdfAnalysisInjector] Template Name:', templateName);
  
  // Générer un webhook unique
  let uniqueWebhookPath = null;
  if (templateId && userId) {
    const templateIdShort = templateId.replace(/-/g, '').substring(0, 8);
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    uniqueWebhookPath = `workflow-${templateIdShort}-${userIdShort}`;
    console.log('🔧 [PdfAnalysisInjector] Webhook unique généré:', uniqueWebhookPath);
  }
  
  // Analyser les credentials requis
  const requiredCredentials = analyzeWorkflowCredentials(workflow);
  console.log('🔧 [PdfAnalysisInjector] Credentials requis:', requiredCredentials.length);
  
  // Valider les données
  const validation = validateFormData(userCredentials, requiredCredentials);
  if (!validation.isValid) {
    throw new Error(`Données invalides: ${validation.errors.join(', ')}`);
  }
  
  // Convertir le workflow en string pour remplacer les placeholders
  let workflowString = JSON.stringify(workflow);
  
  // ⚠️ IMPORTANT: Déclarer createdCredentials pour stocker les credentials utilisés
  const createdCredentials = {};
  
  // Récupérer les credentials admin
  let adminCreds = {};
  try {
    adminCreds = await getAdminCredentials();
    console.log('✅ [PdfAnalysisInjector] Credentials admin récupérés');
  } catch (error) {
    console.error('❌ [PdfAnalysisInjector] Erreur récupération credentials admin:', error.message);
    // Continuer même si l'erreur 405 se produit, on utilisera les placeholders
    console.warn('⚠️ [PdfAnalysisInjector] Continuation avec credentials admin vides');
  }
  
  // Remplacer les placeholders OpenRouter
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin' })
    );
    // Stocker le credential OpenRouter dans createdCredentials
    createdCredentials.openRouterApi = {
      id: adminCreds.OPENROUTER_ID,
      name: adminCreds.OPENROUTER_NAME || 'OpenRouter Admin'
    };
  }
  
  // Remplacer les placeholders SMTP admin
  if (adminCreds.SMTP_ID) {
    workflowString = workflowString.replace(
      /"USER_SMTP_CREDENTIAL_ID"/g,
      JSON.stringify({ id: adminCreds.SMTP_ID, name: adminCreds.SMTP_NAME || 'SMTP Admin' })
    );
    // Stocker le credential SMTP dans createdCredentials
    createdCredentials.smtp = {
      id: adminCreds.SMTP_ID,
      name: adminCreds.SMTP_NAME || 'SMTP Admin'
    };
    console.log('✅ [PdfAnalysisInjector] Credential SMTP admin trouvé et utilisé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
  } else {
    // ⚠️ IMPORTANT: Si le credential SMTP admin n'est pas trouvé, le créer
    // ⚠️ NOUVEAU: Créer un credential SMTP Admin spécifique à ce workflow avec l'email de l'utilisateur
    console.log('⚠️ [PdfAnalysisInjector] Credential SMTP admin non trouvé, création...');
    const config = require('../../config');
    const { createCredential } = require('../n8nService');
    
    // Construire le nom du credential avec le template name et l'email de l'utilisateur
    const userEmail = userCredentials.email || '';
    const cleanTemplateName = templateName ? templateName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) : null;
    const templateNamePart = cleanTemplateName ? `-${cleanTemplateName}` : '';
    const userEmailPart = userEmail ? `-${userEmail}` : '';
    const smtpCredentialName = `SMTP Admin - admin@heleam.com${templateNamePart}${userEmailPart}`;
    
    try {
      const smtpCredentialData = {
        name: smtpCredentialName,
        type: 'smtp',
        data: {
          host: config.email.smtpHost,
          port: config.email.smtpPort || 587,
          user: config.email.smtpUser || 'admin@heleam.com',
          password: config.email.smtpPassword,
          secure: config.email.smtpPort === 465,
          disableStartTls: config.email.smtpPort === 465
        }
      };
      
      const smtpCred = await createCredential(smtpCredentialData);
      createdCredentials.smtp = {
        id: smtpCred.id,
        name: smtpCred.name || smtpCredentialName
      };
      console.log('✅ [PdfAnalysisInjector] Credential SMTP admin créé:', createdCredentials.smtp.id, '- Nom:', createdCredentials.smtp.name);
      console.log('✅ [PdfAnalysisInjector] Ce credential sera supprimé avec le workflow car il contient l\'email de l\'utilisateur');
    } catch (error) {
      console.error('❌ [PdfAnalysisInjector] Erreur création credential SMTP admin:', error);
      throw new Error('Impossible de créer le credential SMTP admin. Vérifiez la configuration SMTP dans config.js.');
    }
  }
  
  // Parser le workflow
  const injectedWorkflow = JSON.parse(workflowString);
  
  // ⚠️ CRITIQUE: Nettoyer les blocs de code markdown dans les nœuds Code qui génèrent fullHtml
  // et assigner le credential SMTP admin à tous les nœuds emailSend
  // ⚠️ IMPORTANT: Forcer le modèle gpt-4o-mini pour tous les agents IA
  if (injectedWorkflow.nodes) {
    injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
      const cleanedNode = { ...node };
      
      // Nœuds OpenRouter Chat Model - Forcer le modèle à gpt-4o-mini
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        const oldModel = cleanedNode.parameters.model || 'non défini';
        cleanedNode.parameters.model = 'openai/gpt-4o-mini';
        console.log(`✅ [PdfAnalysisInjector] Modèle OpenRouter modifié dans ${node.name}:`);
        console.log(`  - Ancien: ${oldModel}`);
        console.log(`  - Nouveau: openai/gpt-4o-mini`);
      }
      
      // Nœuds AI Agent - Modifier le prompt pour forcer une sortie texte/HTML au lieu de JSON/objets
      if (node.type === '@n8n/n8n-nodes-langchain.agent') {
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        // Récupérer le prompt existant
        const existingPrompt = cleanedNode.parameters.text || '';
        const existingSystemMessage = cleanedNode.parameters.options?.systemMessage || '';
        
        // ⚠️ CRITIQUE: Ajouter une instruction explicite pour retourner du texte/HTML, pas de JSON ou d'objets
        const textFormatInstruction = '\n\n⚠️ FORMAT DE RÉPONSE OBLIGATOIRE:\n- Retourne UNIQUEMENT du texte lisible (pas de JSON, pas d\'objets JavaScript)\n- Utilise du Markdown ou du HTML pour formater la réponse\n- Chaque analyse doit être un texte continu et lisible\n- Ne retourne JAMAIS d\'objets structurés ou de JSON\n- La réponse doit être directement affichable dans un email HTML';
        
        const systemMessageFormatInstruction = '\n\n⚠️ FORMAT DE RÉPONSE OBLIGATOIRE:\nTu dois retourner UNIQUEMENT du texte lisible (Markdown ou HTML), jamais de JSON ou d\'objets JavaScript. Chaque analyse doit être un texte continu et lisible, directement affichable dans un email HTML.';
        
        // Modifier le prompt si nécessaire
        if (!existingPrompt.includes('FORMAT DE RÉPONSE OBLIGATOIRE') && !existingPrompt.includes('texte lisible')) {
          cleanedNode.parameters.text = existingPrompt + textFormatInstruction;
          console.log(`✅ [PdfAnalysisInjector] Instruction de format texte ajoutée au prompt de ${node.name}`);
        }
        
        // Modifier le systemMessage si nécessaire
        if (!cleanedNode.parameters.options) {
          cleanedNode.parameters.options = {};
        }
        if (!existingSystemMessage.includes('FORMAT DE RÉPONSE OBLIGATOIRE') && !existingSystemMessage.includes('texte lisible')) {
          cleanedNode.parameters.options.systemMessage = (existingSystemMessage || 'Tu es un assistant IA spécialisé dans l\'analyse de devis d\'assurance.') + systemMessageFormatInstruction;
          console.log(`✅ [PdfAnalysisInjector] Instruction de format texte ajoutée au systemMessage de ${node.name}`);
        }
      }
      
      // Nœuds Code - Nettoyer les blocs de code markdown dans fullHtml
      if ((node.type === 'n8n-nodes-base.code' || node.type === 'n8n-nodes-base.function') && 
          node.parameters && (node.parameters.jsCode || node.parameters.functionCode)) {
        const jsCode = node.parameters.jsCode || node.parameters.functionCode || '';
        
        // Si ce nœud génère fullHtml, corriger l'accès aux analyses et ajouter une fonction de nettoyage
        if (jsCode.includes('fullHtml')) {
          let newCode = jsCode;
          
          // ⚠️ CRITIQUE: Corriger l'accès aux analyses individuelles
          // Le problème: analyses peut être un tableau mais chaque élément n'a pas de propriété .output accessible
          // Solution: S'assurer que analyses est correctement structuré avec .output pour chaque élément
          
          // Corriger l'accès aux analyses si le code utilise analyses[i] ou analyses.length
          if (newCode.includes('analyses[') || newCode.includes('analyses.length')) {
            // Option 1: Si analyses vient de Aggregate, s'assurer qu'on accède correctement
            // Pattern: analyses = $('Aggregate').item.json.output
            // Version simple qui fonctionnait
            newCode = newCode.replace(
              /const\s+analyses\s*=\s*\$\(['"]Aggregate['"]\)\.item\.json\.output/g,
              `const aggregateData = $('Aggregate').item.json.output || [];
const analyses = Array.isArray(aggregateData) ? aggregateData.map((item, idx) => ({
  output: item.output || item.text || item || '',
  index: idx
})) : [];`
            );
            
            // Corriger aussi si analyses est défini différemment (sans const)
            newCode = newCode.replace(
              /analyses\s*=\s*\$\(['"]Aggregate['"]\)\.item\.json\.output/g,
              `aggregateData = $('Aggregate').item.json.output || [];
analyses = Array.isArray(aggregateData) ? aggregateData.map((item, idx) => ({
  output: item.output || item.text || item || '',
  index: idx
})) : [];`
            );
            
            // Option 2: Si analyses vient de AI Agent directement
            // Pattern: analyses = $('AI Agent').all()
            if (newCode.includes("$('AI Agent')")) {
              newCode = newCode.replace(
                /const\s+analyses\s*=\s*\$\(['"]AI Agent['"]\)\.all\(\)/g,
                `const analyses = $('AI Agent').all().map(item => ({
                  output: item.json.output || item.json.text || item.json || '',
                  index: item.index || 0
                }))`
              );
            }
            
            // Option 3: S'assurer que analyses est bien un tableau avec des objets ayant .output
            // Si analyses est défini comme un tableau simple, le transformer
            if (newCode.includes('const analyses =') && !newCode.includes('analyses.map') && !newCode.includes('analyses = Array.isArray')) {
              // Chercher les définitions de analyses qui ne sont pas déjà transformées
              newCode = newCode.replace(
                /const\s+analyses\s*=\s*([^;]+);/g,
                (match, definition) => {
                  // Si la définition ne contient pas déjà .map ou Array.isArray, l'améliorer
                  if (!definition.includes('.map') && !definition.includes('Array.isArray') && definition.includes('aggregateData')) {
                    return `const aggregateData = ${definition};
const analyses = Array.isArray(aggregateData) ? aggregateData.map((item, idx) => ({
  output: getAnalysisText(item) || item.output || item.text || item || '',
  index: idx
})) : [];`;
                  }
                  return match;
                }
              );
            }
            
            // Fonction helper pour extraire le texte d'une analyse
            const extractAnalysisText = `
// Fonction pour extraire le texte d'une analyse (gère les objets complexes)
function getAnalysisText(analysisItem) {
  if (!analysisItem) return '';
  if (typeof analysisItem === 'string') return analysisItem;
  
  // Si c'est un objet, essayer de trouver une propriété texte
  if (typeof analysisItem === 'object') {
    // ⚠️ CRITIQUE: Gérer les objets n8n avec structure json.output
    // Structure typique: { json: { output: "texte de l'analyse" } }
    if (analysisItem.json) {
      // Si json est une string, la retourner directement
      if (typeof analysisItem.json === 'string') {
        return analysisItem.json;
      }
      // Si json.output existe et est une string
      if (analysisItem.json.output) {
        if (typeof analysisItem.json.output === 'string') {
          return analysisItem.json.output;
        }
        // Si output est un objet, chercher récursivement
        if (typeof analysisItem.json.output === 'object') {
          const nested = getAnalysisText(analysisItem.json.output);
          if (nested && nested !== '[object Object]') return nested;
        }
      }
      // Si json.text existe
      if (analysisItem.json.text && typeof analysisItem.json.text === 'string') {
        return analysisItem.json.text;
      }
      // Si json.content existe
      if (analysisItem.json.content && typeof analysisItem.json.content === 'string') {
        return analysisItem.json.content;
      }
      // Si json est un objet avec des propriétés texte
      if (typeof analysisItem.json === 'object') {
        const nested = getAnalysisText(analysisItem.json);
        if (nested && nested !== '[object Object]') return nested;
      }
    }
    
    // Propriétés texte courantes (dans l'ordre de priorité)
    const textProps = ['output', 'text', 'content', 'message', 'result', 'analysis', 'response', 'data', 'body'];
    for (const prop of textProps) {
      if (analysisItem[prop]) {
        if (typeof analysisItem[prop] === 'string') {
          return analysisItem[prop];
        }
        // Si la propriété est elle-même un objet, chercher récursivement
        if (typeof analysisItem[prop] === 'object') {
          const nested = getAnalysisText(analysisItem[prop]);
          if (nested && nested !== '[object Object]') return nested;
        }
      }
    }
    
    // Si l'objet a une méthode toString() personnalisée, l'utiliser
    if (analysisItem.toString && analysisItem.toString !== Object.prototype.toString) {
      const stringValue = analysisItem.toString();
      if (stringValue !== '[object Object]') {
        return stringValue;
      }
    }
    
    // Essayer de trouver n'importe quelle propriété string dans l'objet (récursif)
    var systemProps = ['id', 'index', 'json', 'binary', 'error', 'pairedItem'];
    for (const key in analysisItem) {
      if (analysisItem.hasOwnProperty(key)) {
        // Ignorer les propriétés système
        var isSystemProp = false;
        for (var i = 0; i < systemProps.length; i++) {
          if (systemProps[i] === key) {
            isSystemProp = true;
            break;
          }
        }
        if (isSystemProp) {
          continue;
        }
        const value = analysisItem[key];
        if (typeof value === 'string' && value.length > 0) {
          return value;
        }
        // Si c'est un objet, chercher récursivement
        if (typeof value === 'object' && value !== null) {
          const nested = getAnalysisText(value);
          if (nested && nested !== '[object Object]' && nested.length > 10) {
            return nested;
          }
        }
      }
    }
    
    // Dernier recours: convertir en JSON formaté (mais préférer éviter)
    try {
      const jsonStr = JSON.stringify(analysisItem, null, 2);
      // Si le JSON est trop long ou semble être un objet complexe, essayer d'extraire du texte
      if (jsonStr.length > 1000) {
        // Chercher des patterns de texte dans le JSON
        const textMatch = jsonStr.match(/"output":\\s*"([^"]+)"/) || 
                         jsonStr.match(/"text":\\s*"([^"]+)"/) ||
                         jsonStr.match(/"content":\\s*"([^"]+)"/);
        if (textMatch && textMatch[1]) {
          var result = textMatch[1];
          result = result.replace(/\\\\n/g, String.fromCharCode(10));
          result = result.replace(/\\\\"/g, String.fromCharCode(34));
          return result;
        }
      }
      return jsonStr;
    } catch (e) {
      return String(analysisItem);
    }
  }
  
  return String(analysisItem);
}
`;
            
            // Ajouter la fonction helper si elle n'existe pas
            if (!newCode.includes('function getAnalysisText')) {
              newCode = extractAnalysisText + '\n\n' + newCode;
            }
            
            // Corriger l'accès aux analyses individuelles dans la boucle
            // S'assurer que analyses[i] retourne toujours une chaîne (le contenu de l'analyse)
            
            // Pattern 1: ${analyses[i]} ou ${analyses[i].output} dans les template strings
            newCode = newCode.replace(
              /\$\{analyses\[(\w+)\](?:\.output)?\}/g,
              (match, index) => {
                // Utiliser la fonction helper pour extraire le texte
                return `\${getAnalysisText(analyses[${index}])}`;
              }
            );
            
            // Pattern 2: ${analyses[i]} avec des espaces ou autres caractères
            newCode = newCode.replace(
              /\$\{\s*analyses\[(\w+)\](?:\.output)?\s*\}/g,
              (match, index) => {
                return `\${getAnalysisText(analyses[${index}])}`;
              }
            );
            
            // Pattern 3: analyses[i] dans les template strings avec d'autres expressions
            // Exemple: `Analyse ${i+1}: ${analyses[i]}`
            newCode = newCode.replace(
              /(\$\{[^}]*?)analyses\[(\w+)\]([^}]*?\})/g,
              (match, before, index, after) => {
                // Si c'est déjà dans getAnalysisText, ne pas modifier
                if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                  return match;
                }
                // Remplacer analyses[i] par getAnalysisText(analyses[i])
                return `${before}getAnalysisText(analyses[${index}])${after}`;
              }
            );
            
            // Pattern 4: analyses[i] utilisé directement dans le code JavaScript (hors template string)
            newCode = newCode.replace(
              /analyses\[(\w+)\](?!\.output)(?!\s*\|\|)(?!\s*\))(?!\s*\.)/g,
              (match, index, offset, string) => {
                // Vérifier le contexte avant et après
                const before = string.substring(Math.max(0, offset - 100), offset);
                const after = string.substring(offset + match.length, Math.min(string.length, offset + match.length + 100));
                
                // Si c'est déjà dans getAnalysisText, ne pas modifier
                if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                  return match;
                }
                
                // Si c'est dans une assignation ou une expression, utiliser getAnalysisText
                // Mais éviter si c'est dans une définition de fonction ou autre contexte spécial
                if (before.match(/function\s+\w+\s*\(|const\s+\w+\s*=\s*analyses|let\s+\w+\s*=\s*analyses|var\s+\w+\s*=\s*analyses/)) {
                  return match;
                }
                
                // Utiliser getAnalysisText pour extraire le texte
                return `getAnalysisText(analyses[${index}])`;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 5 - Corriger les accès dans les boucles for/forEach qui génèrent les sections "Analyse 1/3", "Analyse 2/3", etc.
            // Pattern: for (let i = 0; i < analyses.length; i++) { ... analyses[i] ... }
            // ou: analyses.forEach((item, i) => { ... analyses[i] ... })
            // Ces patterns peuvent générer "Analyse 1/3", "Analyse 2/3", etc. avec [object Object]
            newCode = newCode.replace(
              /(for\s*\([^)]*i[^)]*\)\s*\{[^}]*?)(analyses\[i\])([^}]*?\})/gs,
              (match, before, analysesAccess, after) => {
                // Si c'est déjà dans getAnalysisText, ne pas modifier
                if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                  return match;
                }
                // Remplacer analyses[i] par getAnalysisText(analyses[i])
                return before + 'getAnalysisText(' + analysesAccess + ')' + after;
              }
            );
            
            // Pattern 6: Corriger les accès dans les template strings avec des expressions complexes
            // Exemple: `Analyse ${i+1}/${analyses.length}: ${analyses[i]}`
            newCode = newCode.replace(
              /(\$\{[^}]*?\}\s*\/\s*\$\{[^}]*?\}\s*:\s*)(\$\{analyses\[(\w+)\]\})/g,
              (match, before, analysesAccess, index) => {
                return before + `\${getAnalysisText(analyses[${index}])}`;
              }
            );
            
            // Pattern 7: Corriger les accès dans les concaténations de strings
            // Exemple: "Analyse " + (i+1) + "/" + analyses.length + ": " + analyses[i]
            newCode = newCode.replace(
              /([+\s]*analyses\[(\w+)\][+\s]*)/g,
              (match, fullMatch, index, offset, string) => {
                const before = string.substring(Math.max(0, offset - 50), offset);
                const after = string.substring(offset + match.length, Math.min(string.length, offset + match.length + 50));
                
                // Si c'est déjà dans getAnalysisText, ne pas modifier
                if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                  return match;
                }
                
                // Si c'est dans une assignation à analyses, ne pas modifier
                if (before.match(/analyses\s*=\s*|const\s+analyses|let\s+analyses|var\s+analyses/)) {
                  return match;
                }
                
                // Remplacer par getAnalysisText
                return match.replace(`analyses[${index}]`, `getAnalysisText(analyses[${index}])`);
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 8 - Corriger TOUS les accès restants dans les template strings
            // Ce pattern capture tous les cas qui n'ont pas été capturés par les patterns précédents
            // Il doit être appliqué en dernier pour capturer les cas manquants
            newCode = newCode.replace(
              /\$\{analyses\[(\w+)\]\}/g,
              (match, index, offset, string) => {
                // Vérifier le contexte avant et après pour éviter les remplacements multiples
                const before = string.substring(Math.max(0, offset - 100), offset);
                const after = string.substring(offset + match.length, Math.min(string.length, offset + match.length + 100));
                
                // Si c'est déjà dans getAnalysisText, ne pas modifier
                if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                  return match;
                }
                
                // Si c'est dans une assignation à analyses, ne pas modifier
                if (before.match(/analyses\s*=\s*|const\s+analyses|let\s+analyses|var\s+analyses/)) {
                  return match;
                }
                
                // Remplacer par getAnalysisText
                return `\${getAnalysisText(analyses[${index}])}`;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 9 - Corriger les accès directs dans les retours ou assignations
            // Exemple: return analyses[i]; ou html += analyses[i];
            newCode = newCode.replace(
              /(return\s+|html\s*\+=\s*|fullHtml\s*\+=\s*|content\s*\+=\s*|text\s*\+=\s*)(analyses\[(\w+)\])/g,
              (match, prefix, analysesAccess, index) => {
                // Vérifier si c'est déjà dans getAnalysisText
                if (match.includes('getAnalysisText')) {
                  return match;
                }
                // Remplacer par getAnalysisText
                return prefix + `getAnalysisText(analyses[${index}])`;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 10 - Corriger les boucles forEach et map
            // Exemple: analyses.forEach((item, i) => { ... item ... }) ou analyses.map((item, i) => { ... item ... })
            newCode = newCode.replace(
              /(analyses\.(forEach|map)\s*\([^)]*\)\s*=>\s*\{[^}]*?)(item|analysis|analysisItem|a)([^}]*?\})/gs,
              (match, before, method, itemVar, after) => {
                // Si c'est déjà dans getAnalysisText, ne pas modifier
                if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                  return match;
                }
                // Remplacer item par getAnalysisText(item) dans le corps de la fonction
                const newAfter = after.replace(
                  new RegExp(`\\$\\{${itemVar}\\}|\\$\\{${itemVar}\\.output\\}|${itemVar}(?!\\.)`, 'g'),
                  (m) => {
                    if (m.startsWith('${')) {
                      return `\${getAnalysisText(${itemVar})}`;
                    }
                    return `getAnalysisText(${itemVar})`;
                  }
                );
                return before + itemVar + newAfter;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 12 - Corriger spécifiquement ${analysis} dans les template strings de fullHtml
            // Pattern pour capturer: analyses.map((analysis, index) => `...${analysis}...`)
            // Ce pattern doit être très spécifique pour ne pas casser d'autres choses
            // Il doit capturer TOUS les cas où ${analysis} est utilisé dans une boucle map
            // IMPORTANT: Si analysis est un objet avec .output, utiliser analysis.output directement
            newCode = newCode.replace(
              /(analyses\.map\s*\([^)]*\)\s*=>\s*`[^`]*?)\$\{(\w+)\}([^`]*?`)/gs,
              (match, before, varName, after) => {
                // Si la variable est analysis, item, analysisItem ou a, et pas déjà dans getAnalysisText
                if ((varName === 'analysis' || varName === 'item' || varName === 'analysisItem' || varName === 'a') &&
                    !before.includes('getAnalysisText') && !after.includes('getAnalysisText') &&
                    !before.includes(`${varName}.output`) && !after.includes(`${varName}.output`)) {
                  // Utiliser .output si analysis est un objet avec cette propriété, sinon getAnalysisText
                  return before + `\${${varName}.output || getAnalysisText(${varName})}` + after;
                }
                return match;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 12b - Corriger aussi les cas où ${analysis} est utilisé directement
            // Exemple: `Analyse ${i+1}/${analyses.length}: ${analysis}` ou juste `${analysis}`
            // Ce pattern doit être appliqué APRÈS Pattern 12 pour ne pas interférer
            newCode = newCode.replace(
              /(\$\{[^}]*\}\s*\/\s*\$\{[^}]*\}\s*:\s*)\$\{(\w+)\}/g,
              (match, before, varName) => {
                // Si la variable est analysis, item, analysisItem ou a, et dans un contexte d'analyse
                if ((varName === 'analysis' || varName === 'item' || varName === 'analysisItem' || varName === 'a') &&
                    before.includes('analyses') && !before.includes('getAnalysisText')) {
                  return before + `\${getAnalysisText(${varName})}`;
                }
                return match;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 12c - Corriger ${analysis} utilisé seul dans les template strings
            // Exemple: dans `...${analysis}...` où analysis vient d'une boucle
            // Ce pattern cherche ${analysis} dans un contexte où analyses est utilisé
            newCode = newCode.replace(
              /(`[^`]*?analyses[^`]*?)\$\{(\w+)\}([^`]*?`)/gs,
              (match, before, varName, after) => {
                // Si la variable est analysis, item, analysisItem ou a, et dans un contexte avec analyses
                if ((varName === 'analysis' || varName === 'item' || varName === 'analysisItem' || varName === 'a') &&
                    before.includes('analyses') && !before.includes('getAnalysisText') && !after.includes('getAnalysisText')) {
                  return before + `\${getAnalysisText(${varName})}` + after;
                }
                return match;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 12d - Corriger ${analysis} utilisé dans les sections "Analyse X/Y"
            // Pattern très spécifique pour les sections d'analyse individuelles
            // Exemple: `<h2>Analyse ${index + 1}/${analyses.length}</h2>\n${analysis}`
            newCode = newCode.replace(
              /(Analyse\s+\$\{[^}]+\}\s*\/\s*\$\{[^}]+\}[^`]*?)\$\{(\w+)\}([^`]*?`)/gs,
              (match, before, varName, after) => {
                // Si la variable est analysis, item, analysisItem ou a
                if ((varName === 'analysis' || varName === 'item' || varName === 'analysisItem' || varName === 'a') &&
                    !before.includes('getAnalysisText') && !after.includes('getAnalysisText')) {
                  return before + `\${getAnalysisText(${varName})}` + after;
                }
                return match;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 12e - Dernier pattern pour ${analysis} dans les template strings
            // Ce pattern capture TOUS les ${analysis} restants dans les template strings qui contiennent "Analyse"
            newCode = newCode.replace(
              /(`[^`]*?Analyse[^`]*?)\$\{(\w+)\}([^`]*?`)/gs,
              (match, before, varName, after) => {
                // Si la variable est analysis, item, analysisItem ou a, et pas déjà dans getAnalysisText
                if ((varName === 'analysis' || varName === 'item' || varName === 'analysisItem' || varName === 'a') &&
                    !before.includes('getAnalysisText') && !after.includes('getAnalysisText') &&
                    !before.includes('${index') && !before.includes('${i')) {
                  return before + `\${getAnalysisText(${varName})}` + after;
                }
                return match;
              }
            );
            
            // ⚠️ CRITIQUE: Pattern 11 - Dernière passe pour capturer TOUS les accès restants
            // Ce pattern doit être appliqué en dernier pour capturer tous les cas manquants
            // Il cherche toutes les occurrences de analyses[...] qui n'ont pas été corrigées
            let previousCode = '';
            let iterations = 0;
            while (newCode !== previousCode && iterations < 5) {
              previousCode = newCode;
              
              // Chercher tous les accès à analyses[...] qui ne sont pas déjà dans getAnalysisText
              newCode = newCode.replace(
                /(\$\{)?(analyses\[[^\]]+\])(\})?/g,
                (match, openBrace, analysesAccess, closeBrace) => {
                  // Vérifier si c'est déjà dans getAnalysisText
                  const before = newCode.substring(0, newCode.indexOf(match));
                  const after = newCode.substring(newCode.indexOf(match) + match.length);
                  
                  if (before.includes('getAnalysisText') || after.includes('getAnalysisText')) {
                    return match;
                  }
                  
                  // Si c'est dans une assignation à analyses, ne pas modifier
                  if (before.match(/analyses\s*=\s*|const\s+analyses|let\s+analyses|var\s+analyses/)) {
                    return match;
                  }
                  
                  // Remplacer par getAnalysisText
                  if (openBrace && closeBrace) {
                    // C'est dans un template string ${...}
                    return `\${getAnalysisText(${analysesAccess})}`;
                  } else {
                    // C'est dans du code JavaScript normal
                    return `getAnalysisText(${analysesAccess})`;
                  }
                }
              );
              
              iterations++;
            }
            
            console.log(`✅ [PdfAnalysisInjector] Accès aux analyses corrigé dans ${node.name} (${iterations} itération(s))`);
          }
          
          // Ajouter la fonction de nettoyage si elle n'existe pas
          if (!newCode.includes('cleanMarkdownCodeBlocks')) {
            const cleanupFunction = `
// Fonction pour nettoyer les blocs de code markdown
function cleanMarkdownCodeBlocks(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Supprimer les blocs de code markdown (triple backticks avec language)
  // Pattern: triple backticks suivis d'un nom de language, puis contenu, puis triple backticks
  let cleaned = text.replace(/\\\`\\\`\\\`[\\w]*\\n?[\\s\\S]*?\\\`\\\`\\\`/g, '');
  
  // Supprimer les blocs de code inline (triple backticks avec contenu)
  cleaned = cleaned.replace(/\\\`\\\`\\\`([^\\\`]+)\\\`\\\`\\\`/g, '$1');
  
  // Supprimer les backticks simples restants qui pourraient être des artefacts
  cleaned = cleaned.replace(/\\\`\\\`\\\`/g, '');
  cleaned = cleaned.replace(/\\\`\\\`/g, '');
  
  // Nettoyer les espaces multiples
  cleaned = cleaned.replace(/\\n{3,}/g, '\\n\\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Fonction pour appliquer le thème vert et blanc à l'email HTML
function applyGreenWhiteTheme(html) {
  if (!html || typeof html !== 'string') return html;
  
  const greenColor = '#046f78';
  const lightGreen = '#e0f4f6';
  const darkGreen = '#034a52';
  const white = '#ffffff';
  
  // Remplacer toutes les couleurs bleues par le thème vert
  // Couleurs bleues courantes à remplacer
  html = html.replace(/#3498db/gi, greenColor); // Bleu principal
  html = html.replace(/#2c3e50/gi, darkGreen); // Gris foncé -> vert foncé
  html = html.replace(/#007bff/gi, greenColor); // Bleu Bootstrap
  html = html.replace(/#0066cc/gi, greenColor); // Bleu foncé
  html = html.replace(/#0073e6/gi, greenColor); // Bleu moyen
  html = html.replace(/#1976d2/gi, greenColor); // Bleu Material
  
  // Remplacer les backgrounds bleus par verts
  html = html.replace(/background:\s*#3498db/gi, 'background: ' + greenColor);
  html = html.replace(/background:\s*#007bff/gi, 'background: ' + greenColor);
  html = html.replace(/background:\s*#0066cc/gi, 'background: ' + greenColor);
  html = html.replace(/background:\s*#f1f9ff/gi, 'background: ' + lightGreen);
  html = html.replace(/background:\s*#f8f9fa/gi, 'background: ' + lightGreen);
  
  // Remplacer les bordures bleues par vertes
  html = html.replace(/border.*#3498db/gi, function(match) { return match.replace(/#3498db/gi, greenColor); });
  html = html.replace(/border.*#007bff/gi, function(match) { return match.replace(/#007bff/gi, greenColor); });
  html = html.replace(/border.*#0066cc/gi, function(match) { return match.replace(/#0066cc/gi, greenColor); });
  
  // Remplacer les couleurs de texte bleues par vertes
  html = html.replace(/color:\s*#3498db/gi, 'color: ' + greenColor);
  html = html.replace(/color:\s*#007bff/gi, 'color: ' + greenColor);
  html = html.replace(/color:\s*#0066cc/gi, 'color: ' + greenColor);
  html = html.replace(/color:\s*#2c3e50/gi, 'color: ' + darkGreen);
  
  // Ajouter ou remplacer les styles pour le thème vert et blanc
  // Si le HTML contient déjà un <style>, ajouter les styles verts
  if (html.indexOf('<style>') !== -1) {
    html = html.replace(
      /<style>([\\s\\S]*?)<\\/style>/i,
      function(match, styles) {
        // Remplacer les couleurs dans les styles existants
        styles = styles.replace(/#3498db/gi, greenColor);
        styles = styles.replace(/#2c3e50/gi, darkGreen);
        styles = styles.replace(/#007bff/gi, greenColor);
        styles = styles.replace(/#0066cc/gi, greenColor);
        styles = styles.replace(/#f1f9ff/gi, lightGreen);
        styles = styles.replace(/#f8f9fa/gi, lightGreen);
        
        // Ajouter les styles verts si pas déjà présents
        if (styles.indexOf('046f78') === -1 && styles.indexOf('e0f4f6') === -1) {
          styles += '\\n    .header { background: linear-gradient(135deg, ' + greenColor + ', ' + darkGreen + '); color: ' + white + '; padding: 20px; border-radius: 8px 8px 0 0; }\\n    .container { background: ' + white + '; border: 1px solid ' + lightGreen + '; }\\n    h1, h2, h3 { color: ' + greenColor + '; }\\n    .analysis-section { background: ' + lightGreen + '; border-left: 4px solid ' + greenColor + '; padding: 15px; margin: 10px 0; }\\n    a { color: ' + greenColor + '; }\\n    .btn { background: ' + greenColor + '; color: ' + white + '; }\\n';
        }
        return '<style>' + styles + '</style>';
      }
    );
  } else {
    // Ajouter un bloc <style> si absent
    if (html.indexOf('<head>') !== -1) {
      var styleContent = '<head>\\n  <style>\\n    body { font-family: Arial, sans-serif; background: ' + lightGreen + '; color: #333; }\\n    .header { background: linear-gradient(135deg, ' + greenColor + ', ' + darkGreen + '); color: ' + white + '; padding: 20px; border-radius: 8px 8px 0 0; }\\n    .container { background: ' + white + '; border: 1px solid ' + lightGreen + '; max-width: 800px; margin: 20px auto; padding: 20px; border-radius: 8px; }\\n    h1, h2, h3 { color: ' + greenColor + '; }\\n    .analysis-section { background: ' + lightGreen + '; border-left: 4px solid ' + greenColor + '; padding: 15px; margin: 10px 0; border-radius: 4px; }\\n    a { color: ' + greenColor + '; }\\n    .btn { background: ' + greenColor + '; color: ' + white + '; padding: 10px 20px; border-radius: 4px; text-decoration: none; }\\n  </style>';
      html = html.replace(/<head>/i, styleContent);
    }
  }
  
  return html;
}
`;
            
            // Ajouter les fonctions au début
            if (!newCode.includes('function cleanMarkdownCodeBlocks')) {
              newCode = cleanupFunction + '\n\n' + newCode;
            }
          }
          
          // Nettoyer fullHtml lors de l'assignation et appliquer le thème vert
          // Gérer les template strings multi-lignes correctement
          // Pattern 1: fullHtml = `...` (template string)
          newCode = newCode.replace(
            /(fullHtml\s*=\s*)(`[^`]*(?:`[^`]*)*`)/g,
            (match, assignment, templateString) => {
              let result = templateString;
              if (!templateString.includes('cleanMarkdownCodeBlocks')) {
                result = 'cleanMarkdownCodeBlocks(' + result + ')';
              }
              if (!templateString.includes('applyGreenWhiteTheme')) {
                result = 'applyGreenWhiteTheme(' + result + ')';
              }
              return assignment + result;
            }
          );
          
          // Pattern 2: fullHtml = "..." ou '...' (string simple)
          newCode = newCode.replace(
            /(fullHtml\s*=\s*)(["'][^"']*["'])/g,
            (match, assignment, stringValue) => {
              let result = stringValue;
              if (!stringValue.includes('cleanMarkdownCodeBlocks')) {
                result = 'cleanMarkdownCodeBlocks(' + result + ')';
              }
              if (!stringValue.includes('applyGreenWhiteTheme')) {
                result = 'applyGreenWhiteTheme(' + result + ')';
              }
              return assignment + result;
            }
          );
          
          // Pattern 3: fullHtml = expression (variable ou fonction)
          newCode = newCode.replace(
            /(fullHtml\s*=\s*)([^;,\n}]+?)(\s*;|\s*$)/g,
            (match, assignment, value, suffix) => {
              // Ignorer si c'est déjà un appel à cleanMarkdownCodeBlocks ou un template string
              if (value.includes('cleanMarkdownCodeBlocks') || 
                  value.trim().startsWith('`') || 
                  value.trim().startsWith('"') || 
                  value.trim().startsWith("'")) {
                // Appliquer le thème si pas déjà fait
                if (!value.includes('applyGreenWhiteTheme')) {
                  return assignment + 'applyGreenWhiteTheme(' + value.trim() + ')' + suffix;
                }
                return match;
              }
              return assignment + 'applyGreenWhiteTheme(cleanMarkdownCodeBlocks(' + value.trim() + '))' + suffix;
            }
          );
          
          // Pattern 4: fullHtml: ... (dans un objet retourné)
          newCode = newCode.replace(
            /(fullHtml\s*:\s*)([^,}\n]+)/g,
            (match, assignment, value) => {
              // Ignorer si c'est déjà un appel à cleanMarkdownCodeBlocks et applyGreenWhiteTheme
              if (value.includes('cleanMarkdownCodeBlocks') && value.includes('applyGreenWhiteTheme')) {
                return match;
              }
              // Si c'est un template string, l'envelopper
              if (value.trim().startsWith('`')) {
                let result = value.trim();
                if (!result.includes('cleanMarkdownCodeBlocks')) {
                  result = 'cleanMarkdownCodeBlocks(' + result + ')';
                }
                if (!result.includes('applyGreenWhiteTheme')) {
                  result = 'applyGreenWhiteTheme(' + result + ')';
                }
                return assignment + result;
              }
              let result = value.trim();
              if (!result.includes('cleanMarkdownCodeBlocks')) {
                result = 'cleanMarkdownCodeBlocks(' + result + ')';
              }
              if (!result.includes('applyGreenWhiteTheme')) {
                result = 'applyGreenWhiteTheme(' + result + ')';
              }
              return assignment + result;
            }
          );
          
          // Mettre à jour le code
          if (cleanedNode.parameters.jsCode) {
            cleanedNode.parameters.jsCode = newCode;
          } else if (cleanedNode.parameters.functionCode) {
            cleanedNode.parameters.functionCode = newCode;
          }
          
          console.log(`✅ [PdfAnalysisInjector] Fonction de nettoyage markdown ajoutée dans ${node.name}`);
        }
      }
      
      // Nœuds SMTP - TOUJOURS remplacer le credential SMTP (même si hardcodé dans le template)
      if (node.type === 'n8n-nodes-base.emailSend') {
        // ⚠️ CRITIQUE: Le credential SMTP admin DOIT être assigné
        if (!createdCredentials.smtp || !createdCredentials.smtp.id) {
          console.error(`❌ [PdfAnalysisInjector] ERREUR: Aucun credential SMTP admin disponible pour ${node.name}!`);
          console.error(`❌ [PdfAnalysisInjector] createdCredentials.smtp:`, createdCredentials.smtp);
          console.error(`❌ [PdfAnalysisInjector] adminCreds reçus:`, adminCreds);
          throw new Error('Credential SMTP admin non trouvé. Vérifiez que le credential SMTP admin existe dans n8n avec le type "smtp" ou contenant "smtp" dans son nom.');
        }
        
        // Remplacer le credential SMTP par celui de l'admin
        if (!cleanedNode.credentials) {
          cleanedNode.credentials = {};
        }
        
        // Récupérer l'ancien ID pour logging
        const oldSmtpId = cleanedNode.credentials?.smtp?.id || 'aucun';
        
        // Assigner le credential SMTP admin
        cleanedNode.credentials.smtp = {
          id: createdCredentials.smtp.id,
          name: createdCredentials.smtp.name
        };
        console.log(`✅ [PdfAnalysisInjector] Credential SMTP admin assigné dans ${node.name}:`);
        console.log(`  - Ancien (template): ${oldSmtpId}`);
        console.log(`  - Nouveau (admin): ${createdCredentials.smtp.id} (${createdCredentials.smtp.name})`);
        
        // ⚠️ IMPORTANT: Modifier le fromEmail pour utiliser l'email admin
        if (!cleanedNode.parameters) {
          cleanedNode.parameters = {};
        }
        
        // Remplacer fromEmail par admin@heleam.com (même si c'est une expression)
        const oldFromEmail = cleanedNode.parameters.fromEmail || 'non défini';
        cleanedNode.parameters.fromEmail = 'admin@heleam.com';
        console.log(`✅ [PdfAnalysisInjector] From Email modifié dans ${node.name}:`);
        console.log(`  - Ancien: ${oldFromEmail}`);
        console.log(`  - Nouveau: admin@heleam.com`);
        
        // ⚠️ CRITIQUE: Modifier le subject pour utiliser le nom du client au lieu de la date
        // Le subject est dans le nœud emailSend, paramètre "subject"
        // Format attendu: "Devoir de Conseil Assurance - {{ $json.clientName }}" ou similaire
        // Le nom du client vient de clientData.clientName dans le Code node
        if (cleanedNode.parameters.subject) {
          const oldSubject = cleanedNode.parameters.subject;
          
          // Remplacer toute date ou expression de date par le nom du client
          // Le nom du client est disponible via $('Code in JavaScript2').first().json.clientName
          // ou via $json.clientName si le subject est dans un nœud qui reçoit les données du Code node
          
          // Pattern 1: Remplacer toute date mal formatée ou expression de date par le nom du client
          if (oldSubject.includes('Devoir de Conseil Assurance')) {
            // Remplacer tout ce qui suit "Devoir de Conseil Assurance - " par le nom du client
            cleanedNode.parameters.subject = oldSubject.replace(
              /Devoir de Conseil Assurance\s*-\s*.*$/,
              "Devoir de Conseil Assurance - {{ $('Code in JavaScript2').first().json.clientName || $json.clientName || 'Client' }}"
            );
          } else if (oldSubject.includes('$now.format') || oldSubject.match(/[A-Za-z]{3}\s+\d+,\s+\d{4}/) || oldSubject.match(/\d{4}\/\d{2}/)) {
            // Si le subject contient une date, la remplacer par le nom du client
            cleanedNode.parameters.subject = oldSubject.replace(
              /.*/,
              "Devoir de Conseil Assurance - {{ $('Code in JavaScript2').first().json.clientName || $json.clientName || 'Client' }}"
            );
          }
          
          // S'assurer que ça commence par "=" si le subject contient une expression n8n
          if (cleanedNode.parameters.subject.includes('{{') && !cleanedNode.parameters.subject.startsWith('=')) {
            cleanedNode.parameters.subject = '=' + cleanedNode.parameters.subject;
          }
          
          // Nettoyer les doublons de "=" au début
          cleanedNode.parameters.subject = cleanedNode.parameters.subject.replace(/^=+/, '=');
          
          // Log uniquement si le subject a été modifié
          if (cleanedNode.parameters.subject !== oldSubject) {
            console.log(`✅ [PdfAnalysisInjector] Subject modifié pour utiliser le nom du client dans ${node.name}:`);
            console.log(`  - Ancien: ${oldSubject}`);
            console.log(`  - Nouveau: ${cleanedNode.parameters.subject}`);
          } else if (oldSubject.includes('{{') && !oldSubject.startsWith('=')) {
            // Si le subject contient une expression n8n mais ne commence pas par "=", l'ajouter
            cleanedNode.parameters.subject = '=' + oldSubject;
            console.log(`✅ [PdfAnalysisInjector] Subject corrigé (ajout du =) dans ${node.name}:`);
            console.log(`  - Ancien: ${oldSubject}`);
            console.log(`  - Nouveau: ${cleanedNode.parameters.subject}`);
          }
        }
      }
      
      return cleanedNode;
    });
  }
  
  // Gérer les webhooks
  if (uniqueWebhookPath) {
    const webhookNodes = injectedWorkflow.nodes?.filter(n => 
      n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.webhookTrigger'
    );
    if (webhookNodes && webhookNodes.length > 0) {
      webhookNodes.forEach(node => {
        if (node.parameters && node.parameters.path) {
          node.parameters.path = uniqueWebhookPath;
          console.log(`✅ [PdfAnalysisInjector] Webhook path mis à jour pour ${node.name}: ${uniqueWebhookPath}`);
        }
      });
    }
  }
  
  return {
    workflow: injectedWorkflow,
    webhookPath: uniqueWebhookPath,
    createdCredentials: createdCredentials || {} // ⚠️ IMPORTANT: Retourner les credentials créés pour stockage dans la BDD
  };
}

module.exports = {
  injectUserCredentials
};



