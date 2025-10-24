import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Phone, MessageCircle, HelpCircle } from 'lucide-react';
import { LandingService } from '../services/landingService';

export function SupportPage() {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        console.log('🔄 [SupportPage] Chargement du contenu...');
        const data = await LandingService.getContent();
        console.log('📊 [SupportPage] Données reçues:', data.footer);
        setContent(data.footer || {});
        setLoading(false);
      } catch (error) {
        console.error('❌ [SupportPage] Erreur lors du chargement du contenu:', error);
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }
  const bgColor = content.support_bg_color || '#f8fafc';
  const textColor = content.support_text_color || '#1e293b';
  const customContent = content.support_content || '';
  const title = content.support_title || 'Centre d\'aide';
  const subtitle = content.support_subtitle || 'Comment pouvons-nous vous aider ?';
  const email = content.support_email || 'support@automivy.com';
  const phone = content.support_phone || '+33 1 23 45 67 89';
  const chatText = content.support_chat_text || 'Démarrer le chat';
  const faqContent = content.support_faq_content || '';
  
  console.log('🎨 [SupportPage] Couleurs:', { bgColor, textColor });
  console.log('📝 [SupportPage] Contenu personnalisé:', customContent ? 'Présent' : 'Absent');

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour à l'accueil
              </a>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-xl font-semibold text-slate-900">Support</h1>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/login"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Se connecter
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {title}
          </h1>
          <p className="text-xl text-slate-600">
            {subtitle}
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center mb-4">
              <Mail className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-slate-900">Email</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Envoyez-nous un email et nous vous répondrons dans les 24h
            </p>
            <a
              href={`mailto:${email}`}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              {email}
            </a>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center mb-4">
              <Phone className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-slate-900">Téléphone</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Appelez-nous pour un support immédiat
            </p>
            <a
              href={`tel:${phone}`}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              {phone}
            </a>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center mb-4">
              <MessageCircle className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-slate-900">Chat</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Chat en direct avec notre équipe support
            </p>
            <button className="text-green-600 hover:text-green-700 font-medium">
              {chatText}
            </button>
          </div>
        </div>

        {/* Contenu personnalisé */}
        {customContent && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-8">
            <div 
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: customContent }}
            />
          </div>
        )}

        {/* FAQ Section */}
        {faqContent && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <div className="flex items-center mb-6">
              <HelpCircle className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-slate-900">Questions fréquentes</h2>
            </div>
            
            <div 
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: faqContent }}
            />
          </div>
        )}

        {/* Resources */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Ressources utiles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Documentation</h3>
              <p className="text-slate-600 mb-4">
                Guides détaillés pour maîtriser toutes les fonctionnalités d'AUTOMIVY
              </p>
              <a href="#" className="text-green-600 hover:text-green-700 font-medium">
                Consulter la documentation →
              </a>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Tutoriels vidéo</h3>
              <p className="text-slate-600 mb-4">
                Apprenez avec nos tutoriels vidéo étape par étape
              </p>
              <a href="#" className="text-green-600 hover:text-green-700 font-medium">
                Voir les tutoriels →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
