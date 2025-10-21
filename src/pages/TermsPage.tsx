import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { LandingService } from '../services/landingService';

export function TermsPage() {
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

  const bgColor = content.terms_bg_color || '#f8fafc';
  const textColor = content.terms_text_color || '#1e293b';
  const customContent = content.terms_content || '';
  const title = content.terms_title || 'Conditions d\'Utilisation';
  const subtitle = content.terms_subtitle || 'Dernière mise à jour : 1er janvier 2024';
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
              <h1 className="text-xl font-semibold text-slate-900">Conditions</h1>
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
              <Scale className="w-12 h-12 text-green-600" />
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
                <FileText className="w-6 h-6 text-green-600 mr-2" />
                Acceptation des conditions
              </h2>
              <p className="text-slate-600 mb-4">
                En accédant et en utilisant la plateforme AUTOMIVY, vous acceptez d'être lié par ces 
                conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas 
                utiliser notre service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Description du service</h2>
              <p className="text-slate-600 mb-4">
                AUTOMIVY est une plateforme d'automatisation qui permet aux utilisateurs de créer, 
                gérer et déployer des workflows automatisés pour optimiser leurs processus métier.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Fonctionnalités principales</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Création de workflows automatisés</li>
                    <li>Intégration avec plus de 200 applications tierces</li>
                    <li>Gestion des données et des processus</li>
                    <li>Analytics et reporting</li>
                    <li>Support technique et documentation</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Compte utilisateur</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Création de compte</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Vous devez fournir des informations exactes et à jour</li>
                    <li>Vous êtes responsable de la sécurité de votre compte</li>
                    <li>Vous devez maintenir la confidentialité de vos identifiants</li>
                    <li>Vous devez nous notifier immédiatement de toute utilisation non autorisée</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Responsabilités</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Respecter toutes les lois et réglementations applicables</li>
                    <li>Ne pas utiliser le service à des fins illégales ou non autorisées</li>
                    <li>Ne pas interférer avec le fonctionnement du service</li>
                    <li>Respecter les droits de propriété intellectuelle d'autrui</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 text-green-600 mr-2" />
                Utilisation acceptable
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Utilisations interdites</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Violation de toute loi ou réglementation</li>
                    <li>Transmission de contenu malveillant ou nuisible</li>
                    <li>Tentative de contournement des mesures de sécurité</li>
                    <li>Utilisation du service pour du spam ou des communications non sollicitées</li>
                    <li>Collecte d'informations sur d'autres utilisateurs sans autorisation</li>
                    <li>Utilisation de robots ou de scripts automatisés non autorisés</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Contenu utilisateur</h3>
                  <p className="text-slate-600">
                    Vous conservez la propriété de vos données et contenus. En utilisant notre service, 
                    vous nous accordez une licence limitée pour traiter vos données dans le cadre de 
                    la fourniture du service.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Facturation et paiement</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Abonnements</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Les frais d'abonnement sont facturés à l'avance</li>
                    <li>Les prix peuvent être modifiés avec un préavis de 30 jours</li>
                    <li>Les remboursements sont soumis à notre politique de remboursement</li>
                    <li>Les taxes applicables sont en sus des prix affichés</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Résiliation</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Vous pouvez résilier votre abonnement à tout moment</li>
                    <li>La résiliation prend effet à la fin de la période de facturation en cours</li>
                    <li>Nous nous réservons le droit de suspendre ou résilier votre compte en cas de violation</li>
                    <li>Les données peuvent être supprimées après résiliation</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Propriété intellectuelle</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Nos droits</h3>
                  <p className="text-slate-600">
                    AUTOMIVY et son contenu sont protégés par les droits d'auteur, marques de commerce 
                    et autres droits de propriété intellectuelle. Vous ne pouvez pas copier, modifier, 
                    distribuer ou créer des œuvres dérivées sans autorisation écrite.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Vos droits</h3>
                  <p className="text-slate-600">
                    Vous conservez tous les droits sur vos données et contenus. Nous ne revendiquons 
                    aucun droit de propriété sur vos informations personnelles ou vos workflows.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Limitation de responsabilité</h2>
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">Avertissement important</h3>
                  <p className="text-amber-700">
                    AUTOMIVY est fourni "en l'état" sans garantie d'aucune sorte. Nous ne garantissons 
                    pas que le service sera ininterrompu, exempt d'erreurs ou sécurisé à 100%.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Exclusions</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Dommages indirects, consécutifs ou punitifs</li>
                    <li>Perte de profits, de données ou d'opportunités commerciales</li>
                    <li>Dommages résultant de l'utilisation ou de l'impossibilité d'utiliser le service</li>
                    <li>Responsabilité limitée au montant payé pour le service au cours des 12 derniers mois</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 flex items-center">
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                Modifications des conditions
              </h2>
              <p className="text-slate-600 mb-4">
                Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment. 
                Les modifications importantes seront communiquées par email ou via une notification 
                sur notre plateforme au moins 30 jours avant leur entrée en vigueur.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700">
                  <strong>Votre utilisation continue du service après les modifications constitue 
                  votre acceptation des nouvelles conditions.</strong>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Droit applicable et juridiction</h2>
              <p className="text-slate-600 mb-4">
                Ces conditions d'utilisation sont régies par le droit français. Tout litige sera 
                soumis à la juridiction exclusive des tribunaux français.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact</h2>
              <p className="text-slate-600 mb-4">
                Pour toute question concernant ces conditions d'utilisation, contactez-nous :
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-600">
                  <strong>Email :</strong> legal@automivy.com<br />
                  <strong>Adresse :</strong> AUTOMIVY SAS, 123 Automation Street, Tech City, TC 12345<br />
                  <strong>Téléphone :</strong> +1 (555) 123-4567
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
