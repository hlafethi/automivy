import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react';
import { LandingService } from '../services/landingService';

export function PrivacyPage() {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const data = await LandingService.getContent();
        setContent(data.footer || {});
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement du contenu:', error);
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

  const bgColor = content.privacy_bg_color || '#f8fafc';
  const textColor = content.privacy_text_color || '#1e293b';
  const customContent = content.privacy_content || '';
  const title = content.privacy_title || 'Politique de Confidentialité';
  const subtitle = content.privacy_subtitle || 'Dernière mise à jour : 1er janvier 2024';
  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-xl font-semibold text-slate-900">Confidentialité</h1>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {title}
            </h1>
            <p className="text-slate-600">
              {subtitle}
            </p>
          </div>

          {/* Contenu personnalisé */}
          {customContent && (
            <div 
              className="prose prose-slate max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: customContent }}
            />
          )}

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center">
                <Lock className="w-6 h-6 text-green-600 mr-2" />
                Introduction
              </h2>
              <p className="text-slate-600 mb-4">
                Chez AUTOMIVY, nous nous engageons à protéger votre vie privée et vos données personnelles. 
                Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons 
                vos informations lorsque vous utilisez notre plateforme d'automatisation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center">
                <Database className="w-6 h-6 text-green-600 mr-2" />
                Informations que nous collectons
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Informations personnelles</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Nom et adresse email</li>
                    <li>Informations de facturation</li>
                    <li>Préférences de compte</li>
                    <li>Données de profil</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Données d'utilisation</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Logs d'activité sur la plateforme</li>
                    <li>Métriques de performance des workflows</li>
                    <li>Données de navigation et d'interaction</li>
                    <li>Informations techniques (IP, navigateur, OS)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center">
                <Eye className="w-6 h-6 text-green-600 mr-2" />
                Comment nous utilisons vos données
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Services principaux</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Fournir et améliorer nos services d'automatisation</li>
                    <li>Personnaliser votre expérience utilisateur</li>
                    <li>Exécuter vos workflows automatisés</li>
                    <li>Assurer la sécurité de votre compte</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Communication</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Vous envoyer des notifications importantes</li>
                    <li>Fournir un support client</li>
                    <li>Partager des mises à jour de produit</li>
                    <li>Envoyer des communications marketing (avec votre consentement)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Protection des données</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Sécurité technique</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Chiffrement SSL/TLS pour toutes les communications</li>
                    <li>Chiffrement AES-256 pour les données au repos</li>
                    <li>Authentification multi-facteurs disponible</li>
                    <li>Surveillance continue de la sécurité</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Conformité réglementaire</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Conformité RGPD (Règlement Général sur la Protection des Données)</li>
                    <li>Respect des standards SOC 2 Type II</li>
                    <li>Certification ISO 27001</li>
                    <li>Audits de sécurité réguliers</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Vos droits</h2>
              <div className="space-y-4">
                <p className="text-slate-600">
                  Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
                  <li><strong>Droit de rectification :</strong> Corriger des données inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré</li>
                  <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
                  <li><strong>Droit de limitation :</strong> Limiter le traitement de vos données</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Cookies et technologies similaires</h2>
              <p className="text-slate-600 mb-4">
                Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience, 
                analyser l'utilisation de notre service et personnaliser le contenu.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Types de cookies</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du service</li>
                    <li><strong>Cookies de performance :</strong> Nous aident à comprendre l'utilisation</li>
                    <li><strong>Cookies de fonctionnalité :</strong> Améliorent votre expérience</li>
                    <li><strong>Cookies de ciblage :</strong> Utilisés pour la publicité personnalisée</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact</h2>
              <p className="text-slate-600 mb-4">
                Si vous avez des questions concernant cette politique de confidentialité ou souhaitez 
                exercer vos droits, contactez-nous :
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-600">
                  <strong>Email :</strong> privacy@automivy.com<br />
                  <strong>Adresse :</strong> AUTOMIVY SAS, 123 Automation Street, Tech City, TC 12345<br />
                  <strong>Délégué à la Protection des Données :</strong> dpo@automivy.com
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Modifications</h2>
              <p className="text-slate-600">
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
                Les modifications importantes seront communiquées par email ou via une notification sur 
                notre plateforme. Nous vous encourageons à consulter régulièrement cette page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
