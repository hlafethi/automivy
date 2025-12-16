require('dotenv').config();
const db = require('../database');

(async () => {
  try {
    // Check if table exists and has data
    const result = await db.query("SELECT * FROM nextcloud_credentials");
    console.log('Table nextcloud_credentials existe');
    console.log('Lignes:', result.rows.length);
    if (result.rows.length > 0) {
      result.rows.forEach(r => {
        console.log(' - workflow_id:', r.user_workflow_id);
        console.log('   url:', r.nextcloud_url);
        console.log('   user:', r.nextcloud_username);
      });
    }
  } catch(e) {
    console.log('Erreur:', e.message);
    if (e.message.includes('does not exist')) {
      console.log('La table nextcloud_credentials n existe pas!');
    }
  }
})();
