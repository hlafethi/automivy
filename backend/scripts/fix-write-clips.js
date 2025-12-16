require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Supprimer les nœuds problématiques
  const nodesToRemove = ['4e. Collecter Clips', '4f. Écrire Clips'];
  workflow.nodes = workflow.nodes.filter(n => !nodesToRemove.includes(n.name));
  nodesToRemove.forEach(name => delete workflow.connections[name]);
  
  console.log('🗑️ Anciens nœuds supprimés');
  
  // Trouver la position
  const downloadNode = workflow.nodes.find(n => n.name === '4d. Télécharger Clips');
  const baseX = downloadNode ? downloadNode.position[0] + 250 : 1500;
  const baseY = downloadNode ? downloadNode.position[1] : 400;
  
  // Nouveau nœud: Écrire chaque clip sur disque (natif n8n)
  const writeClipNode = {
    id: 'write_clip_' + Date.now(),
    name: '4e. Écrire Clip',
    type: 'n8n-nodes-base.writeBinaryFile',
    typeVersion: 1,
    position: [baseX, baseY],
    parameters: {
      fileName: '=/tmp/clip_{{ $runIndex }}_{{ $now.toMillis() }}.mp4',
      dataPropertyName: 'data'
    }
  };
  workflow.nodes.push(writeClipNode);
  console.log('✅ 4e. Écrire Clip (natif)');
  
  // Nœud Code pour préparer FFmpeg (sans fs)
  const prepareFFmpegNode = {
    id: 'prepare_ffmpeg_' + Date.now(),
    name: '4f. Préparer FFmpeg',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [baseX + 250, baseY],
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `// Collecter les chemins des clips écrits
const items = $input.all();
const clipPaths = items.map(item => item.json.fileName).filter(Boolean);
const timestamp = Date.now();
const outputPath = '/tmp/combined_' + timestamp + '.mp4';

// Créer la commande FFmpeg pour concaténer
// Utilise le filtre concat au lieu d'un fichier liste
let ffmpegCmd = 'ffmpeg -y ';

// Ajouter chaque input
clipPaths.forEach((path, i) => {
  ffmpegCmd += '-i "' + path + '" ';
});

// Ajouter le filtre concat
const n = clipPaths.length;
ffmpegCmd += '-filter_complex "';
for (let i = 0; i < n; i++) {
  ffmpegCmd += '[' + i + ':v][' + i + ':a]';
}
ffmpegCmd += 'concat=n=' + n + ':v=1:a=1[outv][outa]" ';
ffmpegCmd += '-map "[outv]" -map "[outa]" ';
ffmpegCmd += '-c:v libx264 -preset fast -c:a aac "' + outputPath + '" && echo "' + outputPath + '"';

return [{
  json: {
    command: ffmpegCmd,
    outputPath: outputPath,
    clipCount: clipPaths.length,
    clipPaths: clipPaths
  }
}];`
    }
  };
  workflow.nodes.push(prepareFFmpegNode);
  console.log('✅ 4f. Préparer FFmpeg');
  
  // Mettre à jour les connexions
  workflow.connections['4d. Télécharger Clips'] = {
    main: [[{ node: '4e. Écrire Clip', type: 'main', index: 0 }]]
  };
  workflow.connections['4e. Écrire Clip'] = {
    main: [[{ node: '4f. Préparer FFmpeg', type: 'main', index: 0 }]]
  };
  workflow.connections['4f. Préparer FFmpeg'] = {
    main: [[{ node: '4g. FFmpeg Combiner', type: 'main', index: 0 }]]
  };
  
  // Mettre à jour FFmpeg Combiner pour utiliser la commande préparée
  const ffmpegNode = workflow.nodes.find(n => n.name === '4g. FFmpeg Combiner');
  if (ffmpegNode) {
    ffmpegNode.parameters.command = '={{ $json.command }}';
    console.log('✅ 4g. FFmpeg Combiner mis à jour');
  }
  
  console.log('✅ Connexions mises à jour');
  
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
  
  console.log(updateResponse.ok ? '\n✅ Workflow corrigé !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

