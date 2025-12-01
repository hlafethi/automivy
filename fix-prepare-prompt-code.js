// Code corrigé pour le nœud "Prepare Prompt" du workflow PDF Analysis
// Ce code génère l'email HTML final avec les analyses

// Récupère la synthèse globale de l'Expert (Agent 2)
const aiOutput = $('AI Agent1').first()?.json?.output || '';
// Nettoyage préventif si l'IA a mis des balises de code
const globalRec = aiOutput.replace(/```html/g, '').replace(/```/g, '').trim() || '<p>Analyse en cours...</p>';

// Récupère les analyses individuelles (Aggregate)
// On s'assure que c'est un tableau, peu importe comment n8n le livre
let analysesRaw = $('Aggregate').first()?.json?.output;
let analyses = [];

if (Array.isArray(analysesRaw)) {
    analyses = analysesRaw;
} else if (analysesRaw) {
    analyses = [analysesRaw];
}

// Infos client - Sécurité : on essaie de récupérer depuis le noeud source, sinon valeurs par défaut
let clientData = { clientName: "Client", sessionId: "Session", clientEmail: "" };
try {
    const sourceNode = $('Code in JavaScript2').first()?.json;
    if (sourceNode) clientData = sourceNode;
} catch (e) {
    // Fallback si le nœud n'est pas accessible directement
    clientData.clientName = "Client Estimé";
}

const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// --- CONFIGURATION DU DESIGN ---
const BRAND_COLOR = "#046f78"; // VOTRE VERT IDENTITAIRE
const ACCENT_COLOR = "#e8f6f7"; // Vert très clair pour les fonds
const TEXT_COLOR = "#2c3e50";

// Fonction pour nettoyer le texte de l'IA et le rendre propre en HTML
function formatAiText(text) {
    if(!text) return "";
    let cleaned = text
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .replace(/###/g, '') // Enlève les titres markdown
        .replace(/##/g, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:' + BRAND_COLOR + '">$1</strong>') // Gras en vert
        .replace(/- /g, '• '); // Puces propres
    
    // Convertit les sauts de ligne en balises HTML
    return cleaned.split('\n').filter(line => line.trim() !== '').join('<br>');
}

// Construction du HTML - Utilisation de concaténation de strings au lieu de template string imbriquée
let fullHtml = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<style>\n';
fullHtml += '    body { font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }\n';
fullHtml += '    .email-container { max-width: 680px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }\n';
fullHtml += '    \n';
fullHtml += '    /* HEADER */\n';
fullHtml += '    .header { background-color: ' + BRAND_COLOR + '; padding: 40px 30px; text-align: center; border-bottom: 4px solid #03565e; }\n';
fullHtml += '    .header h1 { color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 1px; text-transform: uppercase; }\n';
fullHtml += '    .header-subtitle { color: #a8dadd; font-size: 14px; margin-top: 10px; }\n';
fullHtml += '\n';
fullHtml += '    /* CONTENU */\n';
fullHtml += '    .content { padding: 40px 30px; color: ' + TEXT_COLOR + '; line-height: 1.6; }\n';
fullHtml += '    \n';
fullHtml += '    /* BOITE EXPERT */\n';
fullHtml += '    .expert-box { \n';
fullHtml += '        background-color: ' + ACCENT_COLOR + '; \n';
fullHtml += '        border-left: 6px solid ' + BRAND_COLOR + '; \n';
fullHtml += '        padding: 25px; \n';
fullHtml += '        border-radius: 0 8px 8px 0;\n';
fullHtml += '        margin: 30px 0;\n';
fullHtml += '    }\n';
fullHtml += '    .expert-label { \n';
fullHtml += '        color: ' + BRAND_COLOR + '; \n';
fullHtml += '        font-weight: bold; \n';
fullHtml += '        text-transform: uppercase; \n';
fullHtml += '        font-size: 12px; \n';
fullHtml += '        letter-spacing: 1px; \n';
fullHtml += '        margin-bottom: 10px; \n';
fullHtml += '        display: block;\n';
fullHtml += '    }\n';
fullHtml += '\n';
fullHtml += '    /* CARTE DEVIS */\n';
fullHtml += '    .card { border: 1px solid #e1e8ed; border-radius: 8px; margin-bottom: 25px; overflow: hidden; }\n';
fullHtml += '    .card-header { \n';
fullHtml += '        background-color: #f8f9fa; \n';
fullHtml += '        padding: 15px 20px; \n';
fullHtml += '        font-weight: bold; \n';
fullHtml += '        color: ' + BRAND_COLOR + '; \n';
fullHtml += '        border-bottom: 1px solid #e1e8ed;\n';
fullHtml += '        display: flex;\n';
fullHtml += '        justify-content: space-between;\n';
fullHtml += '        align-items: center;\n';
fullHtml += '    }\n';
fullHtml += '    .card-body { padding: 20px; font-size: 14px; color: #555; }\n';
fullHtml += '\n';
fullHtml += '    /* BOUTON */\n';
fullHtml += '    .btn { \n';
fullHtml += '        display: block; \n';
fullHtml += '        width: 200px; \n';
fullHtml += '        margin: 40px auto; \n';
fullHtml += '        background-color: ' + BRAND_COLOR + '; \n';
fullHtml += '        color: #ffffff !important; \n';
fullHtml += '        text-decoration: none; \n';
fullHtml += '        text-align: center; \n';
fullHtml += '        padding: 15px 0; \n';
fullHtml += '        border-radius: 50px; \n';
fullHtml += '        font-weight: bold;\n';
fullHtml += '        box-shadow: 0 4px 6px rgba(4, 111, 120, 0.3);\n';
fullHtml += '    }\n';
fullHtml += '    \n';
fullHtml += '    /* FOOTER */\n';
fullHtml += '    .footer { background-color: #222; color: #777; padding: 20px; text-align: center; font-size: 12px; }\n';
fullHtml += '</style>\n</head>\n<body>\n';
fullHtml += '    <div class="email-container">\n';
fullHtml += '        <div class="header">\n';
fullHtml += '            <h1>Devoir de Conseil</h1>\n';
fullHtml += '            <div class="header-subtitle">Dossier : ' + clientData.clientName + ' | ' + date + '</div>\n';
fullHtml += '        </div>\n';
fullHtml += '\n';
fullHtml += '        <div class="content">\n';
fullHtml += '            <p>Bonjour <strong>' + clientData.clientName + '</strong>,</p>\n';
fullHtml += '            <p>Voici le rapport d\'analyse comparative concernant les <strong>' + analyses.length + ' offres d\'assurance</strong> étudiées pour votre situation.</p>\n';
fullHtml += '\n';
fullHtml += '            <!-- RECOMMANDATION EXPERT -->\n';
fullHtml += '            <div class="expert-box">\n';
fullHtml += '                <span class="expert-label">★ Synthèse du Courtier Expert</span>\n';
fullHtml += formatAiText(globalRec);
fullHtml += '            </div>\n';
fullHtml += '\n';
fullHtml += '            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">\n';
fullHtml += '\n';
fullHtml += '            <h3 style="color:' + BRAND_COLOR + '; text-align:center; margin-bottom:30px;">Détail Technique des Offres</h3>\n';
fullHtml += '\n';
fullHtml += '            <!-- BOUCLE SUR LES ANALYSES -->\n';

// Construire les cartes d'analyse
let analysesHtml = '';
for (let i = 0; i < analyses.length; i++) {
    analysesHtml += '            <div class="card">\n';
    analysesHtml += '                <div class="card-header">\n';
    analysesHtml += '                    <span>Option N°' + (i + 1) + '</span>\n';
    analysesHtml += '                </div>\n';
    analysesHtml += '                <div class="card-body">\n';
    analysesHtml += formatAiText(analyses[i]);
    analysesHtml += '                </div>\n';
    analysesHtml += '            </div>\n';
}

fullHtml += analysesHtml;
fullHtml += '\n';
fullHtml += '            <a href="mailto:user@heleam.com" class="btn">Valider mon choix</a>\n';
fullHtml += '        </div>\n';
fullHtml += '\n';
fullHtml += '        <div class="footer">\n';
fullHtml += '            © ' + new Date().getFullYear() + ' Heleam Assurances.<br>\n';
fullHtml += '            Document confidentiel.\n';
fullHtml += '        </div>\n';
fullHtml += '    </div>\n';
fullHtml += '</body>\n';
fullHtml += '</html>\n';

return {
  json: {
    clientEmail: clientData.clientEmail,
    clientName: clientData.clientName,
    sessionId: clientData.sessionId,
    fullHtml: fullHtml,
    subject: 'Analyse Comparative - ' + clientData.clientName
  }
};

