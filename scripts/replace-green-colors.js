const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mapping des classes Tailwind green-* vers les couleurs #046f78
const colorMappings = {
  // Backgrounds
  'bg-green-50': { style: 'backgroundColor', value: '#e0f4f6' },
  'bg-green-100': { style: 'backgroundColor', value: '#d1eef1' },
  'bg-green-200': { style: 'backgroundColor', value: '#a3dde3' },
  'bg-green-300': { style: 'backgroundColor', value: '#75ccd5' },
  'bg-green-500': { style: 'backgroundColor', value: '#046f78' },
  'bg-green-600': { style: 'backgroundColor', value: '#046f78' },
  'bg-green-700': { style: 'backgroundColor', value: '#046f78' },
  'bg-green-800': { style: 'backgroundColor', value: '#034a52' },
  'bg-green-900': { style: 'backgroundColor', value: '#023a41' },
  
  // Text colors
  'text-green-50': { style: 'color', value: '#e0f4f6' },
  'text-green-100': { style: 'color', value: '#d1eef1' },
  'text-green-200': { style: 'color', value: '#a3dde3' },
  'text-green-300': { style: 'color', value: '#75ccd5' },
  'text-green-500': { style: 'color', value: '#046f78' },
  'text-green-600': { style: 'color', value: '#046f78' },
  'text-green-700': { style: 'color', value: '#046f78' },
  'text-green-800': { style: 'color', value: '#034a52' },
  'text-green-900': { style: 'color', value: '#023a41' },
  
  // Borders
  'border-green-50': { style: 'borderColor', value: '#e0f4f6' },
  'border-green-100': { style: 'borderColor', value: '#d1eef1' },
  'border-green-200': { style: 'borderColor', value: '#a3dde3' },
  'border-green-300': { style: 'borderColor', value: '#75ccd5' },
  'border-green-500': { style: 'borderColor', value: '#046f78' },
  'border-green-600': { style: 'borderColor', value: '#046f78' },
  'border-green-700': { style: 'borderColor', value: '#046f78' },
  'border-green-800': { style: 'borderColor', value: '#034a52' },
  
  // Ring (focus)
  'ring-green-500': { style: '--tw-ring-color', value: '#046f78' },
  'ring-green-600': { style: '--tw-ring-color', value: '#046f78' },
  
  // Hover states
  'hover:bg-green-50': { style: 'backgroundColor', value: '#e0f4f6', hover: true },
  'hover:bg-green-100': { style: 'backgroundColor', value: '#d1eef1', hover: true },
  'hover:bg-green-200': { style: 'backgroundColor', value: '#a3dde3', hover: true },
  'hover:bg-green-300': { style: 'backgroundColor', value: '#75ccd5', hover: true },
  'hover:bg-green-600': { style: 'backgroundColor', value: '#046f78', hover: true },
  'hover:bg-green-700': { style: 'backgroundColor', value: '#046f78', hover: true },
  'hover:bg-green-800': { style: 'backgroundColor', value: '#034a52', hover: true },
  'hover:text-green-600': { style: 'color', value: '#046f78', hover: true },
  'hover:text-green-700': { style: 'color', value: '#046f78', hover: true },
  'hover:border-green-300': { style: 'borderColor', value: '#75ccd5', hover: true },
  
  // Gradients
  'from-green-50': { style: 'background', value: 'linear-gradient(to right, #e0f4f6' },
  'from-green-100': { style: 'background', value: 'linear-gradient(to right, #d1eef1' },
  'from-green-200': { style: 'background', value: 'linear-gradient(to right, #a3dde3' },
  'to-green-100': { style: 'background', value: 'linear-gradient(to right, #d1eef1)' },
  'to-green-200': { style: 'background', value: 'linear-gradient(to right, #a3dde3)' },
  'from-green-600': { style: 'background', value: 'linear-gradient(to right, #046f78' },
  'to-green-700': { style: 'background', value: 'linear-gradient(to right, #046f78)' },
  'to-green-800': { style: 'background', value: 'linear-gradient(to right, #034a52)' },
};

// Fonction pour trouver tous les fichiers .tsx et .ts dans src
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

console.log('🔍 Recherche des fichiers...');
const files = findFiles('./src');
console.log(`✅ ${files.length} fichiers trouvés`);

let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  let fileReplacements = 0;
  
  // Remplacer les classes green-* simples
  Object.keys(colorMappings).forEach(className => {
    const regex = new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.match(regex)) {
      // Pour l'instant, on va juste logger les occurrences
      // Le remplacement manuel sera plus sûr
      const matches = content.match(regex);
      fileReplacements += matches ? matches.length : 0;
      modified = true;
    }
  });
  
  if (modified) {
    console.log(`📝 ${file}: ${fileReplacements} occurrences de green-* trouvées`);
    totalReplacements += fileReplacements;
  }
});

console.log(`\n✅ Total: ${totalReplacements} occurrences trouvées`);
console.log('\n⚠️  Note: Ce script liste les occurrences. Le remplacement manuel est recommandé pour éviter les erreurs.');

