const fs = require('fs');
const path = require('path');

// Mapping des classes Tailwind vers les couleurs hexadécimales
const colorMap = {
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

// Fonction pour extraire les styles d'une classe Tailwind
function getStyleFromClass(className) {
  if (className.startsWith('bg-')) {
    const color = className.replace('bg-', '');
    return colorMap[color] ? { backgroundColor: colorMap[color] } : null;
  }
  if (className.startsWith('text-')) {
    const color = className.replace('text-', '');
    return colorMap[color] ? { color: colorMap[color] } : null;
  }
  if (className.startsWith('border-')) {
    const color = className.replace('border-', '');
    return colorMap[color] ? { borderColor: colorMap[color] } : null;
  }
  if (className.includes('from-') || className.includes('to-')) {
    // Gérer les gradients
    const fromMatch = className.match(/from-(\w+-\d+)/);
    const toMatch = className.match(/to-(\w+-\d+)/);
    if (fromMatch && toMatch) {
      const fromColor = colorMap[fromMatch[1]];
      const toColor = colorMap[toMatch[1]];
      if (fromColor && toColor) {
        return { background: `linear-gradient(to right, ${fromColor}, ${toColor})` };
      }
    }
  }
  return null;
}

// Fonction pour remplacer les classes dans un fichier
function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remplacer les classes simples (bg-green-600, text-green-600, etc.)
    for (const [tailwindClass, hexColor] of Object.entries(colorMap)) {
      // bg-green-600
      const bgRegex = new RegExp(`\\bbg-${tailwindClass}\\b`, 'g');
      if (bgRegex.test(content)) {
        modified = true;
        // Note: On va juste ajouter un commentaire pour indiquer qu'il faut modifier
        // car le remplacement automatique est complexe avec React
        content = content.replace(bgRegex, `bg-${tailwindClass} /* TODO: remplacer par style={{ backgroundColor: '${hexColor}' }} */`);
      }

      // text-green-600
      const textRegex = new RegExp(`\\btext-${tailwindClass}\\b`, 'g');
      if (textRegex.test(content)) {
        modified = true;
        content = content.replace(textRegex, `text-${tailwindClass} /* TODO: remplacer par style={{ color: '${hexColor}' }} */`);
      }

      // border-green-600
      const borderRegex = new RegExp(`\\bborder-${tailwindClass}\\b`, 'g');
      if (borderRegex.test(content)) {
        modified = true;
        content = content.replace(borderRegex, `border-${tailwindClass} /* TODO: remplacer par style={{ borderColor: '${hexColor}' }} */`);
      }
    }

    if (modified) {
      // Ne pas écrire automatiquement, juste logger
      console.log(`⚠️  ${filePath} - Nécessite modification manuelle`);
      return false; // Ne pas modifier automatiquement pour éviter de casser le code
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur: ${filePath}`, error.message);
    return false;
  }
}

// Fonction pour parcourir les fichiers
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

console.log('🔄 Analyse des fichiers...\n');
const srcDir = path.join(__dirname, 'src');
const files = walkDir(srcDir);

console.log(`📁 ${files.length} fichiers analysés\n`);
console.log('⚠️  Les classes Tailwind nécessitent une modification manuelle.\n');
console.log('💡 Astuce: Utilisez search_replace pour remplacer les classes par des styles inline.\n');

// Compter les fichiers avec des classes vertes
let count = 0;
files.forEach(file => {
  if (replaceInFile(file)) {
    count++;
  }
});

console.log(`\n✅ Analyse terminée. ${count} fichiers nécessitent une modification.`);

