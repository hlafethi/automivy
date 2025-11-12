/**
 * Script pour vérifier la configuration Docker d'Ollama
 * et identifier la bonne URL à utiliser
 */

const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('🔍 Vérification de la configuration Ollama dans Docker...\n');

console.log('📋 Instructions pour identifier la bonne URL Ollama :\n');
console.log('═'.repeat(60));
console.log('');

console.log('1️⃣  VÉRIFIER LE NOM DU CONTENEUR OLLAMA :');
console.log('   Sur le VPS, exécutez :');
console.log('   docker ps | grep ollama');
console.log('   Notez le nom dans la colonne "NAMES" (ex: ollama-llm, ollama, etc.)');
console.log('');

console.log('2️⃣  VÉRIFIER LE PORT MAPPÉ :');
console.log('   docker ps | grep ollama');
console.log('   Cherchez dans la colonne "PORTS" (ex: 0.0.0.0:11434->11434/tcp)');
console.log('   Si vous voyez "11434->11434", le port est mappé correctement');
console.log('');

console.log('3️⃣  VÉRIFIER LE RÉSEAU DOCKER :');
console.log('   docker network ls');
console.log('   docker network inspect <network_name>');
console.log('');

console.log('4️⃣  TESTER L\'ACCÈS :');
console.log('   Depuis le VPS :');
console.log('   curl http://localhost:11434/api/tags');
console.log('   OU depuis l\'extérieur :');
console.log('   curl http://147.93.58.155:11434/api/tags');
console.log('');

console.log('═'.repeat(60));
console.log('');

console.log('📝 CONFIGURATION RECOMMANDÉE :\n');

console.log('✅ CONTENEUR OLLAMA : localai\n');

console.log('Si le BACKEND est AUSSI dans Docker (même réseau) :');
console.log('   • Utilisez le NOM du conteneur Ollama');
console.log('   • Dans backend/.env :');
console.log('     OLLAMA_URL=http://localai:19080');
console.log('');

console.log('Si le BACKEND n\'est PAS dans Docker :');
console.log('   • Utilisez l\'IP VPS + port mappé');
console.log('   • Dans backend/.env :');
console.log('     OLLAMA_URL=http://147.93.58.155:19080');
console.log('');

console.log('🔧 Créer/modifier le fichier backend/.env avec :');
console.log('   # Si backend dans Docker (même réseau que localai)');
console.log('   OLLAMA_URL=http://localai:19080');
console.log('');
console.log('   # OU si backend hors Docker');
console.log('   OLLAMA_URL=http://147.93.58.155:19080');
console.log('');

console.log('✅ Après configuration, redémarrer le backend pour que les changements prennent effet.\n');

