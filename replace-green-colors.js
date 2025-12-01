const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mapping des couleurs vertes vers #046f78 et ses variantes
const colorMappings = {
  // Classes Tailwind
  'green-50': '#e0f4f6',
  'green-100': '#d1eef1',
  'green-200': '#a3dde3',
  'green-300': '#75ccd5',
  'green-400': '#3fb3c0',
  'green-500': '#046f78',
  'green-600': '#046f78',
  'green-700': '#046f78',
  'green-800': '#034a52',
  'green-900': '#023a41',
  'emerald-50': '#e0f4f6',
  'emerald-100': '#d1eef1',
  'emerald-200': '#a3dde3',
  'emerald-300': '#75ccd5',
  'emerald-400': '#3fb3c0',
  'emerald-500': '#046f78',
  'emerald-600': '#046f78',
  'emerald-700': '#046f78',
  'emerald-800': '#034a52',
  'emerald-900': '#023a41',
  'teal-50': '#e0f4f6',
  'teal-100': '#d1eef1',
  'teal-200': '#a3dde3',
  'teal-300': '#75ccd5',
  'teal-400': '#3fb3c0',
  'teal-500': '#046f78',
  'teal-600': '#046f78',
  'teal-700': '#046f78',
  'teal-800': '#034a52',
  'teal-900': '#023a41',
};

// Fonction pour remplacer les couleurs dans un fichier
function replaceColorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remplacer les classes Tailwind par des styles inline
    for (const [tailwindClass, hexColor] of Object.entries(colorMappings)) {
      const regex = new RegExp(`\\b${tailwindClass}\\b`, 'g');
      if (regex.test(content)) {
        modified = true;
        // Note: On ne peut pas remplacer directement car il faut gérer le contexte React
        // On va juste marquer les fichiers qui ont besoin d'être modifiés
        console.log(`⚠️  ${filePath} contient ${tailwindClass} - nécessite modification manuelle`);
      }
    }

    // Remplacer les couleurs hexadécimales vertes communes
    const greenHexColors = [
      /#10b981/g, // green-500
      /#059669/g, // green-600
      /#047857/g, // green-700
      /#065f46/g, // green-800
      /#064e3b/g, // green-900
      /#34d399/g, // emerald-400
      /#10b981/g, // emerald-500
      /#059669/g, // emerald-600
      /#047857/g, // emerald-700
      /#14b8a6/g, // teal-500
      /#0d9488/g, // teal-600
      /#0f766e/g, // teal-700
    ];

    for (const regex of greenHexColors) {
      if (regex.test(content)) {
        modified = true;
        content = content.replace(regex, '#046f78');
        console.log(`✅ ${filePath} - Couleur hexadécimale verte remplacée`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour parcourir récursivement les répertoires
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Point d'entrée
console.log('🔄 Recherche des fichiers à modifier...');
const srcDir = path.join(__dirname, 'src');
const files = walkDir(srcDir);

console.log(`📁 ${files.length} fichiers trouvés`);
console.log('\n⚠️  Note: Les classes Tailwind nécessitent une modification manuelle car elles doivent être converties en styles inline React.\n');

let modifiedCount = 0;
files.forEach(file => {
  if (replaceColorsInFile(file)) {
    modifiedCount++;
  }
});

console.log(`\n✅ ${modifiedCount} fichiers modifiés automatiquement`);
console.log('⚠️  Les fichiers avec des classes Tailwind nécessitent une modification manuelle.');

