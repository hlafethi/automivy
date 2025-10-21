const http = require('http');

function testAPI() {
  const options = {
    hostname: 'localhost',
    port: 3004,
    path: '/api/landing',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('📊 Réponse API Landing:');
        console.log('Footer support_content:', jsonData.footer?.support_content ? 'Présent' : 'Absent');
        console.log('Footer support_bg_color:', jsonData.footer?.support_bg_color);
        console.log('Footer support_text_color:', jsonData.footer?.support_text_color);
        console.log('Footer privacy_content:', jsonData.footer?.privacy_content ? 'Présent' : 'Absent');
        console.log('Footer terms_content:', jsonData.footer?.terms_content ? 'Présent' : 'Absent');
        
        if (jsonData.footer?.support_content) {
          console.log('\n📝 Contenu Support (premiers 100 caractères):');
          console.log(jsonData.footer.support_content.substring(0, 100) + '...');
        }
      } catch (error) {
        console.error('❌ Erreur parsing JSON:', error.message);
        console.log('Raw data:', data.substring(0, 200));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Erreur requête:', error.message);
  });

  req.end();
}

console.log('🔍 Test de l\'API Landing...');
testAPI();
