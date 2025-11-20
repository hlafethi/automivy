require('dotenv').config();
const db = require('../database');
const fs = require('fs');
const path = require('path');

async function verifyInjectors() {
  try {
    console.log('🔍 Vérification des injecteurs et modals...\n');
    
    // Récupérer tous les templates
    const templatesResult = await db.query('SELECT id, name FROM templates ORDER BY name');
    const templates = templatesResult.rows;
    
    // Lire le mapping des injecteurs
    const injectorsIndexPath = path.join(__dirname, '../services/injectors/index.js');
    const injectorsIndexContent = fs.readFileSync(injectorsIndexPath, 'utf8');
    
    // Extraire les mappings depuis index.js
    const injectorMappings = {};
    const idMatches = injectorsIndexContent.matchAll(/'([a-f0-9-]{36})':\s*require\(['"]\.\/(\w+)['"]\)/g);
    for (const match of idMatches) {
      injectorMappings[match[1]] = match[2];
    }
    
    const nameMatches = injectorsIndexContent.matchAll(/'([^']+)':\s*require\(['"]\.\/(\w+)['"]\)/g);
    for (const match of nameMatches) {
      if (!match[1].match(/^[a-f0-9-]{36}$/)) { // Exclure les IDs UUID
        injectorMappings[match[1]] = match[2];
      }
    }
    
    // Lister les injecteurs disponibles
    const injectorsDir = path.join(__dirname, '../services/injectors');
    const injectorFiles = fs.readdirSync(injectorsDir)
      .filter(f => f.endsWith('Injector.js'))
      .map(f => f.replace('Injector.js', '').replace(/([A-Z])/g, ' $1').trim());
    
    console.log('📋 INJECTEURS DISPONIBLES:');
    injectorFiles.forEach(inj => console.log(`  - ${inj}`));
    console.log('');
    
    console.log('📋 TEMPLATES ET LEUR MAPPING:');
    console.log('='.repeat(80));
    
    let hasIssues = false;
    
    templates.forEach((template, index) => {
      const templateId = template.id;
      const templateName = template.name;
      
      // Vérifier si un injecteur est mappé
      const injectorById = injectorMappings[templateId];
      const injectorByName = injectorMappings[templateName];
      const injector = injectorById || injectorByName;
      
      console.log(`\n${index + 1}. ${templateName}`);
      console.log(`   ID: ${templateId.substring(0, 8)}...`);
      
      if (injector) {
        console.log(`   ✅ Injecteur: ${injector}`);
      } else {
        console.log(`   ⚠️  Injecteur: AUCUN (utilisera l'injecteur générique)`);
        hasIssues = true;
      }
      
      // Vérifier le type de modal attendu
      const isCV = templateName.toLowerCase().includes('cv screening') || 
                   templateName.toLowerCase().includes('cv analysis') ||
                   templateName.toLowerCase().includes('candidate evaluation');
      const isGmail = templateName.toLowerCase().includes('gmail') && 
                      templateName.toLowerCase().includes('tri');
      const isImap = templateName.toLowerCase().includes('imap') && 
                     templateName.toLowerCase().includes('tri');
      
      if (isCV) {
        console.log(`   📱 Modal: SmartDeployModal (CV workflow)`);
      } else if (isGmail || isImap) {
        console.log(`   📱 Modal: SmartDeployModal (Email workflow)`);
      } else {
        console.log(`   📱 Modal: CreateAutomationModal (classique)`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Vérifier spécifiquement Gmail Tri Automatique
    console.log('\n🔍 VÉRIFICATION SPÉCIFIQUE: Gmail Tri Automatique');
    const gmailTemplate = templates.find(t => 
      t.name.toLowerCase().includes('gmail') && 
      t.name.toLowerCase().includes('tri')
    );
    
    if (gmailTemplate) {
      console.log(`   Template trouvé: ${gmailTemplate.name}`);
      console.log(`   ID: ${gmailTemplate.id}`);
      
      const gmailInjector = injectorMappings[gmailTemplate.id] || injectorMappings[gmailTemplate.name];
      if (gmailInjector) {
        console.log(`   ✅ Injecteur mappé: ${gmailInjector}`);
        
        // Vérifier si le fichier injecteur existe
        const injectorFilePath = path.join(injectorsDir, `${gmailInjector}.js`);
        if (fs.existsSync(injectorFilePath)) {
          console.log(`   ✅ Fichier injecteur existe: ${gmailInjector}.js`);
        } else {
          console.log(`   ❌ Fichier injecteur MANQUANT: ${gmailInjector}.js`);
          hasIssues = true;
        }
      } else {
        console.log(`   ❌ Aucun injecteur mappé pour ce template!`);
        hasIssues = true;
      }
    } else {
      console.log(`   ⚠️  Template "Gmail Tri Automatique" non trouvé dans la base`);
    }
    
    if (hasIssues) {
      console.log('\n⚠️  DES PROBLÈMES ONT ÉTÉ DÉTECTÉS');
    } else {
      console.log('\n✅ TOUS LES MAPPINGS SONT CORRECTS');
    }
    
    await db.end();
    process.exit(hasIssues ? 1 : 0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyInjectors();

