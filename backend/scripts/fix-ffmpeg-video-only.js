require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  const prepNode = workflow.nodes.find(n => n.name === '4f. Préparer FFmpeg');
  if (prepNode) {
    // FFmpeg pour vidéo SEULEMENT (les clips MiniMax n'ont pas d'audio)
    prepNode.parameters.jsCode = `// Collecter les chemins des clips écrits
const items = $input.all();
const clipPaths = items.map(item => item.json.fileName).filter(Boolean);
const timestamp = Date.now();
const outputPath = '/tmp/combined_' + timestamp + '.mp4';

// Commande FFmpeg pour concaténer SEULEMENT la vidéo (pas d'audio dans les clips MiniMax)
let ffmpegCmd = 'ffmpeg -y ';

// Ajouter chaque input
clipPaths.forEach((path, i) => {
  ffmpegCmd += '-i "' + path + '" ';
});

// Filtre concat pour vidéo seulement (a=0 = pas d'audio)
const n = clipPaths.length;
ffmpegCmd += '-filter_complex "';
for (let i = 0; i < n; i++) {
  ffmpegCmd += '[' + i + ':v]';
}
ffmpegCmd += 'concat=n=' + n + ':v=1:a=0[outv]" ';
ffmpegCmd += '-map "[outv]" ';
ffmpegCmd += '-c:v libx264 -preset fast "' + outputPath + '" && echo "' + outputPath + '"';

return [{
  json: {
    command: ffmpegCmd,
    outputPath: outputPath,
    clipCount: clipPaths.length,
    clipPaths: clipPaths
  }
}];`;
    console.log('✅ FFmpeg: vidéo seulement (a=0)');
  }
  
  const updateResponse = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    method: 'PUT',
    headers: { 
      'X-N8N-API-KEY': N8N_API_KEY, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      name: workflow.name, 
      nodes: workflow.nodes, 
      connections: workflow.connections, 
      settings: workflow.settings 
    })
  });
  
  console.log(updateResponse.ok ? '✅ OK!' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

