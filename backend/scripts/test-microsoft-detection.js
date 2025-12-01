const { analyzeWorkflowCredentials } = require('../services/workflowAnalyzer');
const db = require('../database');

async function testMicrosoftDetection() {
  try {
    const result = await db.query(
      'SELECT id, name, json FROM templates WHERE name = $1 LIMIT 1',
      ['Microsoft Tri Automatique BAL']
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const template = result.rows[0];
    const workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    console.log('✅ Template trouvé:');
    console.log('  - ID:', template.id);
    console.log('  - Nom:', template.name);
    
    // Compter les nœuds
    const microsoftNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    const imapNodes = workflow.nodes?.filter(n => n.type?.includes('imap')) || [];
    
    console.log('\n📊 Nœuds dans le workflow:');
    console.log('  - Microsoft Outlook:', microsoftNodes.length);
    console.log('  - IMAP:', imapNodes.length);
    
    // Tester la détection
    console.log('\n🔍 Test de la détection des credentials...');
    const required = analyzeWorkflowCredentials(workflow, template.id);
    
    console.log('\n✅ Credentials détectés:', required.length);
    required.forEach((cred, i) => {
      console.log(`\n  ${i + 1}. ${cred.type} - ${cred.name}`);
      console.log(`     Description: ${cred.description}`);
      console.log(`     Champs: ${cred.fields?.length || 0}`);
      if (cred.fields) {
        cred.fields.forEach(f => {
          console.log(`       - ${f.name} (${f.type}) - provider: ${f.provider || 'none'}`);
        });
      }
    });
    
    // Vérifier si Microsoft Outlook OAuth2 est détecté
    const hasMicrosoftOAuth = required.some(cred => cred.type === 'microsoftOutlookOAuth2');
    const hasImap = required.some(cred => cred.type === 'imap');
    
    console.log('\n📋 Résultat:');
    console.log('  - Microsoft Outlook OAuth2 détecté:', hasMicrosoftOAuth ? '✅ OUI' : '❌ NON');
    console.log('  - IMAP détecté:', hasImap ? '❌ OUI (ne devrait pas)' : '✅ NON');
    
    if (!hasMicrosoftOAuth) {
      console.log('\n❌ PROBLÈME: Microsoft Outlook OAuth2 n\'est pas détecté!');
    }
    if (hasImap) {
      console.log('\n❌ PROBLÈME: IMAP est détecté alors qu\'il ne devrait pas l\'être!');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    process.exit(0);
  }
}

testMicrosoftDetection();

