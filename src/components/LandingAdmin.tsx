import React, { useState, useEffect } from 'react';
import { Save, Eye, ArrowLeft, Settings, FileText, DollarSign, Users, Mail, Globe, PlayCircle } from 'lucide-react';
import { LandingService, LandingContent, LandingStats } from '../services/landingService';
import { MediaField } from './MediaField';
import { IconSelect } from './IconSelect';
import { RichTextEditor } from './RichTextEditor';
import { ColorPicker } from './ColorPicker';

interface LandingAdminProps {
  onBack: () => void;
}

export function LandingAdmin({ onBack }: LandingAdminProps) {
  const [content, setContent] = useState<LandingContent>({});
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [editingField, setEditingField] = useState<{ section: string; field: string } | null>(null);
  const [tempContent, setTempContent] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadContent();
    loadStats();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const landingContent = await LandingService.getContent();
      setContent(landingContent);
    } catch (error) {
      console.error('Erreur lors du chargement du contenu:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const landingStats = await LandingService.getStats();
      setStats(landingStats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };


  const handleSaveSection = async () => {
    if (!activeSection) return;

    try {
      console.log(`🔍 [LandingAdmin] Sauvegarde de la section ${activeSection}`);
      console.log(`🔍 [LandingAdmin] Contenu à sauvegarder:`, tempContent);
      setSaving(true);
      
      // Pour video_demo, on sauvegarde tout dans video_demo
      if (activeSection === 'video_demo') {
        const videoDemoContent = { ...content.video_demo, ...tempContent };
        await LandingService.updateSection('video_demo', videoDemoContent);
        setContent(prev => ({
          ...prev,
          video_demo: videoDemoContent
        }));
      } else if (activeSection === 'pricing') {
        const pricingContent = { ...content.pricing, ...tempContent };
        await LandingService.updateSection('pricing', pricingContent);
        setContent(prev => ({
          ...prev,
          pricing: pricingContent
        }));
      } else if (activeSection === 'about') {
        const aboutContent = { ...content.about, ...tempContent };
        await LandingService.updateSection('about', aboutContent);
        setContent(prev => ({
          ...prev,
          about: aboutContent
        }));
      } else if (activeSection === 'contact') {
        const contactContent = { ...content.contact, ...tempContent };
        await LandingService.updateSection('contact', contactContent);
        setContent(prev => ({
          ...prev,
          contact: contactContent
        }));
      } else if (activeSection === 'footer') {
        const footerContent = { ...content.footer, ...tempContent };
        await LandingService.updateSection('footer', footerContent);
        setContent(prev => ({
          ...prev,
          footer: footerContent
        }));
      } else {
        await LandingService.updateSection(activeSection, tempContent);
        setContent(prev => ({
          ...prev,
          [activeSection]: { ...prev[activeSection], ...tempContent }
        }));
      }
      
      setTempContent({});
      console.log(`✅ Section ${activeSection} sauvegardée avec succès`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSectionWithContent = async (contentToSave: any) => {
    if (!activeSection) return;

    try {
      console.log(`🔍 [LandingAdmin] Sauvegarde avec contenu de la section ${activeSection}`);
      console.log(`🔍 [LandingAdmin] Contenu à sauvegarder:`, contentToSave);
      setSaving(true);
      
      // Pour video_demo, on sauvegarde tout dans video_demo
      if (activeSection === 'video_demo') {
        const videoDemoContent = { ...content.video_demo, ...contentToSave };
        await LandingService.updateSection('video_demo', videoDemoContent);
        setContent(prev => ({
          ...prev,
          video_demo: videoDemoContent
        }));
      } else if (activeSection === 'pricing') {
        const pricingContent = { ...content.pricing, ...contentToSave };
        await LandingService.updateSection('pricing', pricingContent);
        setContent(prev => ({
          ...prev,
          pricing: pricingContent
        }));
      } else if (activeSection === 'about') {
        const aboutContent = { ...content.about, ...contentToSave };
        await LandingService.updateSection('about', aboutContent);
        setContent(prev => ({
          ...prev,
          about: aboutContent
        }));
      } else if (activeSection === 'contact') {
        const contactContent = { ...content.contact, ...contentToSave };
        await LandingService.updateSection('contact', contactContent);
        setContent(prev => ({
          ...prev,
          contact: contactContent
        }));
      } else if (activeSection === 'footer') {
        const footerContent = { ...content.footer, ...contentToSave };
        await LandingService.updateSection('footer', footerContent);
        setContent(prev => ({
          ...prev,
          footer: footerContent
        }));
      } else {
        await LandingService.updateSection(activeSection, contentToSave);
        setContent(prev => ({
          ...prev,
          [activeSection]: { ...prev[activeSection], ...contentToSave }
        }));
      }
      
      setTempContent({});
      console.log(`✅ Section ${activeSection} sauvegardée avec succès`);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    console.log(`🔍 [LandingAdmin] Champ ${field} changé:`, value);
    setTempContent(prev => {
      const newContent = {
        ...prev,
        [field]: value
      };
      console.log(`🔍 [LandingAdmin] Nouveau tempContent:`, newContent);
      return newContent;
    });

    // Sauvegarde automatique pour le toggle de la configuration générale
    if (field === 'enabled' && (activeSection === 'video_demo' || activeSection === 'pricing' || activeSection === 'about' || activeSection === 'contact' || activeSection === 'footer')) {
      // Sauvegarde immédiate avec le nouveau contenu
      const newContent = { ...tempContent, [field]: value };
      setTimeout(() => {
        handleSaveSectionWithContent(newContent);
      }, 100);
    }
  };

  const handlePreview = () => {
    window.open('/', '_blank');
  };

  const sections = [
    { id: 'hero', name: 'Hero Section', icon: Globe, color: 'bg-blue-500' },
    { id: 'video_demo', name: 'Video Demo', icon: PlayCircle, color: 'bg-purple-500' },
    { id: 'features', name: 'Features', icon: FileText, color: 'bg-green-500' },
    { id: 'pricing', name: 'Pricing', icon: DollarSign, color: 'bg-yellow-500' },
    { id: 'about', name: 'About', icon: Users, color: 'bg-purple-500' },
    { id: 'contact', name: 'Contact', icon: Mail, color: 'bg-red-500' },
    { id: 'footer', name: 'Footer', icon: Settings, color: 'bg-gray-500' },
  ];

  const getSectionFields = (section: string) => {
    const sectionContent = content[section] || {};
    
    // Pour la section hero, on affiche les champs spécifiques
    if (section === 'hero') {
      return [
        { field: 'title', value: sectionContent.title || '', label: 'Titre principal', isMedia: false },
        { field: 'subtitle', value: sectionContent.subtitle || '', label: 'Sous-titre', isMedia: false },
        { field: 'button_text', value: sectionContent.button_text || '', label: 'Texte du bouton principal', isMedia: false },
        { field: 'secondary_button', value: sectionContent.secondary_button || '', label: 'Texte du bouton secondaire', isMedia: false },
        { field: 'media_type', value: sectionContent.media_type || 'image', label: 'Type de média (image/vidéo)', isMedia: false },
        { field: 'background_image', value: sectionContent.background_image || '', label: 'Image de fond', isMedia: true },
        { field: 'hero_video', value: sectionContent.hero_video || '', label: 'Vidéo de fond', isMedia: true },
        { field: 'logo_image', value: sectionContent.logo_image || '', label: 'Logo', isMedia: true }
      ];
    }
    
    // Pour la section video_demo, on affiche seulement les champs de configuration générale
    if (section === 'video_demo') {
      return [
        { field: 'enabled', value: sectionContent.enabled || 'false', label: 'Afficher la section vidéo', isMedia: false },
        { field: 'title', value: sectionContent.title || '', label: 'Titre de la section', isMedia: false },
        { field: 'subtitle', value: sectionContent.subtitle || '', label: 'Sous-titre', isMedia: false },
        { field: 'layout', value: sectionContent.layout || '2', label: 'Nombre de colonnes (2 ou 3)', isMedia: false }
      ];
    }
    
    // Pour la section pricing, on affiche les champs de configuration générale
    if (section === 'pricing') {
      return [
        { field: 'enabled', value: sectionContent.enabled || 'false', label: 'Afficher la section pricing', isMedia: false },
        { field: 'title', value: sectionContent.title || '', label: 'Titre de la section', isMedia: false },
        { field: 'subtitle', value: sectionContent.subtitle || '', label: 'Sous-titre', isMedia: false },
        { field: 'description', value: sectionContent.description || '', label: 'Description', isMedia: false }
      ];
    }
    
    // Pour la section about, on affiche les champs de configuration générale
    if (section === 'about') {
      return [
        { field: 'enabled', value: sectionContent.enabled || 'false', label: 'Afficher la section about', isMedia: false },
        { field: 'title', value: sectionContent.title || '', label: 'Titre de la section', isMedia: false },
        { field: 'subtitle', value: sectionContent.subtitle || '', label: 'Sous-titre', isMedia: false },
        { field: 'description', value: sectionContent.description || '', label: 'Description', isMedia: false },
        { field: 'mission', value: sectionContent.mission || '', label: 'Mission', isMedia: false },
        { field: 'vision', value: sectionContent.vision || '', label: 'Vision', isMedia: false },
        { field: 'image', value: sectionContent.image || '', label: 'Image', isMedia: true }
      ];
    }
    
    // Pour la section contact, on affiche les champs de configuration générale
    if (section === 'contact') {
      return [
        { field: 'enabled', value: sectionContent.enabled || 'false', label: 'Afficher la section contact', isMedia: false },
        { field: 'title', value: sectionContent.title || '', label: 'Titre de la section', isMedia: false },
        { field: 'subtitle', value: sectionContent.subtitle || '', label: 'Sous-titre', isMedia: false },
        { field: 'description', value: sectionContent.description || '', label: 'Description', isMedia: false },
        { field: 'email', value: sectionContent.email || '', label: 'Email', isMedia: false },
        { field: 'phone', value: sectionContent.phone || '', label: 'Téléphone', isMedia: false },
        { field: 'address', value: sectionContent.address || '', label: 'Adresse', isMedia: false }
      ];
    }
    
    // Pour la section footer, on affiche les champs de configuration générale
    if (section === 'footer') {
      return [
        { field: 'enabled', value: sectionContent.enabled || 'false', label: 'Afficher la section footer', isMedia: false },
        { field: 'company_name', value: sectionContent.company_name || '', label: 'Nom de l\'entreprise', isMedia: false },
        { field: 'tagline', value: sectionContent.tagline || '', label: 'Tagline', isMedia: false },
        { field: 'description', value: sectionContent.description || '', label: 'Description', isMedia: false },
        { field: 'support_text', value: sectionContent.support_text || '', label: 'Texte Support', isMedia: false },
        { field: 'support_link', value: sectionContent.support_link || '', label: 'URL Support', isMedia: false },
        { field: 'privacy_text', value: sectionContent.privacy_text || '', label: 'Texte Privacy', isMedia: false },
        { field: 'privacy_link', value: sectionContent.privacy_link || '', label: 'URL Privacy', isMedia: false },
        { field: 'terms_text', value: sectionContent.terms_text || '', label: 'Texte Terms', isMedia: false },
        { field: 'terms_link', value: sectionContent.terms_link || '', label: 'URL Terms', isMedia: false },
        { field: 'copyright', value: sectionContent.copyright || '', label: 'Copyright', isMedia: false },
        // Champs de contenu des pages Support
        { field: 'support_content', value: sectionContent.support_content || '', label: 'Contenu Page Support', isRichText: true },
        { field: 'support_bg_color', value: sectionContent.support_bg_color || '#f8fafc', label: 'Couleur de fond Support', isColor: true },
        { field: 'support_text_color', value: sectionContent.support_text_color || '#1e293b', label: 'Couleur du texte Support', isColor: true },
        { field: 'support_title', value: sectionContent.support_title || 'Centre d\'aide', label: 'Titre Page Support', isMedia: false },
        { field: 'support_subtitle', value: sectionContent.support_subtitle || 'Comment pouvons-nous vous aider ?', label: 'Sous-titre Page Support', isMedia: false },
        { field: 'support_email', value: sectionContent.support_email || 'support@automivy.com', label: 'Email Support', isMedia: false },
        { field: 'support_phone', value: sectionContent.support_phone || '+33 1 23 45 67 89', label: 'Téléphone Support', isMedia: false },
        { field: 'support_chat_text', value: sectionContent.support_chat_text || 'Démarrer le chat', label: 'Texte Chat Support', isMedia: false },
        { field: 'support_faq_content', value: sectionContent.support_faq_content || '', label: 'Contenu FAQ Support', isRichText: true },
        
        // Champs de contenu des pages Privacy
        { field: 'privacy_content', value: sectionContent.privacy_content || '', label: 'Contenu Page Privacy', isRichText: true },
        { field: 'privacy_bg_color', value: sectionContent.privacy_bg_color || '#f8fafc', label: 'Couleur de fond Privacy', isColor: true },
        { field: 'privacy_text_color', value: sectionContent.privacy_text_color || '#1e293b', label: 'Couleur du texte Privacy', isColor: true },
        { field: 'privacy_title', value: sectionContent.privacy_title || 'Politique de Confidentialité', label: 'Titre Page Privacy', isMedia: false },
        { field: 'privacy_subtitle', value: sectionContent.privacy_subtitle || 'Dernière mise à jour : 1er janvier 2024', label: 'Sous-titre Page Privacy', isMedia: false },
        
        // Champs de contenu des pages Terms
        { field: 'terms_content', value: sectionContent.terms_content || '', label: 'Contenu Page Terms', isRichText: true },
        { field: 'terms_bg_color', value: sectionContent.terms_bg_color || '#f8fafc', label: 'Couleur de fond Terms', isColor: true },
        { field: 'terms_text_color', value: sectionContent.terms_text_color || '#1e293b', label: 'Couleur du texte Terms', isColor: true },
        { field: 'terms_title', value: sectionContent.terms_title || 'Conditions d\'Utilisation', label: 'Titre Page Terms', isMedia: false },
        { field: 'terms_subtitle', value: sectionContent.terms_subtitle || 'Dernière mise à jour : 1er janvier 2024', label: 'Sous-titre Page Terms', isMedia: false }
      ];
    }
    
    return Object.keys(sectionContent).map(field => ({
      field,
      value: sectionContent[field],
      label: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      isMedia: field.includes('_image') || field.includes('_video') || field.includes('background')
    }));
  };

  const isMediaField = (field: string) => {
    return field.includes('_image') || field.includes('_video') || field.includes('background');
  };

  const getMediaType = (field: string) => {
    if (field.includes('_video')) return 'video';
    if (field.includes('_image') || field.includes('background')) return 'image';
    return 'any';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du contenu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour au Dashboard
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-xl font-semibold text-slate-900">Landing Page Admin</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreview}
                className="flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
              <button
                onClick={handleSaveSection}
                disabled={saving || Object.keys(tempContent).length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

             <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
               <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
          {/* Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Sections</h2>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const sectionContent = content[section.id] || {};
                  const fieldCount = Object.keys(sectionContent).length;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg ${section.color} flex items-center justify-center mr-3`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{section.name}</span>
                      </div>
                      <span className="text-sm text-slate-400">{fieldCount}</span>
                    </button>
                  );
                })}
              </nav>

              {stats && (
                <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Statistics</h3>
                  <div className="text-sm text-slate-600">
                    <p>Total Fields: {stats.totalFields}</p>
                    <p>Sections: {stats.sections.length}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-5">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">
                  {sections.find(s => s.id === activeSection)?.name || 'Section'}
                </h2>
                <p className="text-slate-600 mt-1">
                  Modifiez le contenu de cette section. Les changements sont sauvegardés automatiquement.
                </p>
              </div>

              <div className="p-6">
                {activeSection === 'features' ? (
                  <div className="space-y-6">
                    {/* Configuration générale */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration générale</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getSectionFields(activeSection).filter(({ field }) => 
                          !field.startsWith('feature_') && field !== 'section_background'
                        ).map(({ field, value, label, isMedia }) => (
                          <div key={field} className={isMedia ? 'md:col-span-2' : ''}>
                            {isMedia ? (
                              <MediaField
                                label={label}
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                type={getMediaType(field)}
                              />
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                {field.includes('description') || field.includes('content') ? (
                                  <textarea
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cases pour chaque feature - 2 colonnes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((featureNumber) => {
                        const featureContent = content.features || {};
                        const featureEnabled = featureContent[`feature_${featureNumber}_enabled`] === 'true' || featureContent[`feature_${featureNumber}_enabled`] === undefined;
                        
                        return (
                          <div key={featureNumber} className="bg-white border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold text-slate-900">Feature {featureNumber}</h3>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    const newValue = featureEnabled ? 'false' : 'true';
                                    console.log(`🔍 [LandingAdmin] Toggle Feature ${featureNumber} cliqué:`, {
                                      currentValue: featureContent[`feature_${featureNumber}_enabled`],
                                      featureEnabled,
                                      newValue
                                    });
                                    handleFieldChange(`feature_${featureNumber}_enabled`, newValue);
                                  }}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    featureEnabled ? 'bg-green-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      featureEnabled ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="text-xs text-slate-600">
                                  {featureEnabled ? 'Activé' : 'Désactivé'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Titre de la feature
                                </label>
                                <input
                                  type="text"
                                  value={tempContent[`feature_${featureNumber}_title`] !== undefined ? tempContent[`feature_${featureNumber}_title`] : featureContent[`feature_${featureNumber}_title`] || ''}
                                  onChange={(e) => handleFieldChange(`feature_${featureNumber}_title`, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder="Titre de la feature"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={tempContent[`feature_${featureNumber}_description`] !== undefined ? tempContent[`feature_${featureNumber}_description`] : featureContent[`feature_${featureNumber}_description`] || ''}
                                  onChange={(e) => handleFieldChange(`feature_${featureNumber}_description`, e.target.value)}
                                  rows={3}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder="Description de la feature"
                                />
                              </div>
                              
                              <IconSelect
                                label="Icône"
                                value={tempContent[`feature_${featureNumber}_icon`] !== undefined ? tempContent[`feature_${featureNumber}_icon`] : featureContent[`feature_${featureNumber}_icon`] || 'Zap'}
                                onChange={(value) => handleFieldChange(`feature_${featureNumber}_icon`, value)}
                              />
                              
                              <div>
                                <MediaField
                                  label="Image de la feature"
                                  value={tempContent[`feature_${featureNumber}_image`] !== undefined ? tempContent[`feature_${featureNumber}_image`] : featureContent[`feature_${featureNumber}_image`] || ''}
                                  onChange={(newValue) => {
                                    console.log(`🔍 [LandingAdmin] MediaField Feature ${featureNumber} onChange appelé avec:`, newValue);
                                    handleFieldChange(`feature_${featureNumber}_image`, newValue);
                                  }}
                                  type="image"
                                  id={`feature-${featureNumber}-upload`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : activeSection === 'video_demo' ? (
                  <div className="space-y-6">
                    {/* Configuration générale */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration générale</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getSectionFields(activeSection).map(({ field, value, label, isMedia }) => (
                          <div key={field} className={isMedia ? 'md:col-span-2' : ''}>
                            {isMedia ? (
                              <MediaField
                                label={label}
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                type={getMediaType(field)}
                              />
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                {field === 'enabled' ? (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleFieldChange(field, value === 'true' ? 'false' : 'true')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                    <span className="text-sm text-slate-600">
                                      {value === 'true' ? 'Activé' : 'Désactivé'}
                                    </span>
                                  </div>
                                ) : field.includes('description') || field.includes('content') ? (
                                  <textarea
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cases pour chaque vidéo - 2 colonnes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((videoNumber) => {
                        const videoContent = content.video_demo || {};
                        const videoEnabled = videoContent[`video_${videoNumber}_enabled`] === 'true';
                        
                        return (
                          <div key={videoNumber} className="bg-white border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold text-slate-900">Vidéo {videoNumber}</h3>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleFieldChange(`video_${videoNumber}_enabled`, videoEnabled ? 'false' : 'true')}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    videoEnabled ? 'bg-green-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      videoEnabled ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="text-xs text-slate-600">
                                  {videoEnabled ? 'Activé' : 'Désactivé'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Titre de la vidéo
                                </label>
                                <input
                                  type="text"
                                  value={tempContent[`video_${videoNumber}_title`] !== undefined ? tempContent[`video_${videoNumber}_title`] : videoContent[`video_${videoNumber}_title`] || ''}
                                  onChange={(e) => handleFieldChange(`video_${videoNumber}_title`, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder="Titre de la vidéo..."
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Texte du bouton
                                </label>
                                <input
                                  type="text"
                                  value={tempContent[`video_${videoNumber}_button_text`] !== undefined ? tempContent[`video_${videoNumber}_button_text`] : videoContent[`video_${videoNumber}_button_text`] || ''}
                                  onChange={(e) => handleFieldChange(`video_${videoNumber}_button_text`, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder="Texte du bouton..."
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={tempContent[`video_${videoNumber}_description`] !== undefined ? tempContent[`video_${videoNumber}_description`] : videoContent[`video_${videoNumber}_description`] || ''}
                                  onChange={(e) => handleFieldChange(`video_${videoNumber}_description`, e.target.value)}
                                  rows={2}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder="Description de la vidéo..."
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">
                                  Lien du bouton
                                </label>
                                <input
                                  type="text"
                                  value={tempContent[`video_${videoNumber}_button_link`] !== undefined ? tempContent[`video_${videoNumber}_button_link`] : videoContent[`video_${videoNumber}_button_link`] || ''}
                                  onChange={(e) => handleFieldChange(`video_${videoNumber}_button_link`, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder="/demo"
                                />
                              </div>
                              
                              <div>
                                <MediaField
                                  label="Fichier vidéo"
                                  value={tempContent[`video_${videoNumber}_video`] !== undefined ? tempContent[`video_${videoNumber}_video`] : videoContent[`video_${videoNumber}_video`] || ''}
                                  onChange={(newValue) => {
                                    console.log(`🔍 [LandingAdmin] MediaField Vidéo ${videoNumber} onChange appelé avec:`, newValue);
                                    handleFieldChange(`video_${videoNumber}_video`, newValue);
                                  }}
                                  type="video"
                                  id={`video-${videoNumber}-upload`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : activeSection === 'pricing' ? (
                  <div className="space-y-6">
                    {/* Configuration générale */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration générale</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getSectionFields(activeSection).map(({ field, value, label, isMedia }) => (
                          <div key={field} className={isMedia ? 'md:col-span-2' : ''}>
                            {isMedia ? (
                              <MediaField
                                label={label}
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                type={getMediaType(field)}
                              />
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                {field === 'enabled' ? (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleFieldChange(field, value === 'true' ? 'false' : 'true')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                    <span className="text-sm text-slate-600">
                                      {value === 'true' ? 'Activé' : 'Désactivé'}
                                    </span>
                                  </div>
                                ) : field.includes('description') || field.includes('content') ? (
                                  <textarea
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Plans tarifaires */}
                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Plans tarifaires</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(planNumber => {
                          const planContent = content.pricing || {};
                          return (
                            <div key={planNumber} className="bg-slate-50 rounded-lg p-4">
                              <h4 className="text-md font-semibold text-slate-900 mb-3">Plan {planNumber}</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Nom du plan
                                  </label>
                                  <input
                                    type="text"
                                    value={tempContent[`plan_${planNumber}_name`] !== undefined ? tempContent[`plan_${planNumber}_name`] : planContent[`plan_${planNumber}_name`] || ''}
                                    onChange={(e) => handleFieldChange(`plan_${planNumber}_name`, e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Plan ${planNumber}`}
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Prix
                                  </label>
                                  <input
                                    type="text"
                                    value={tempContent[`plan_${planNumber}_price`] !== undefined ? tempContent[`plan_${planNumber}_price`] : planContent[`plan_${planNumber}_price`] || ''}
                                    onChange={(e) => handleFieldChange(`plan_${planNumber}_price`, e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder="$29"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Période
                                  </label>
                                  <input
                                    type="text"
                                    value={tempContent[`plan_${planNumber}_period`] !== undefined ? tempContent[`plan_${planNumber}_period`] : planContent[`plan_${planNumber}_period`] || ''}
                                    onChange={(e) => handleFieldChange(`plan_${planNumber}_period`, e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder="/mois"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Description
                                  </label>
                                  <textarea
                                    value={tempContent[`plan_${planNumber}_description`] !== undefined ? tempContent[`plan_${planNumber}_description`] : planContent[`plan_${planNumber}_description`] || ''}
                                    onChange={(e) => handleFieldChange(`plan_${planNumber}_description`, e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder="Description du plan..."
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Features (une par ligne)
                                  </label>
                                  <textarea
                                    value={[
                                      tempContent[`plan_${planNumber}_feature_1`] !== undefined ? tempContent[`plan_${planNumber}_feature_1`] : planContent[`plan_${planNumber}_feature_1`] || '',
                                      tempContent[`plan_${planNumber}_feature_2`] !== undefined ? tempContent[`plan_${planNumber}_feature_2`] : planContent[`plan_${planNumber}_feature_2`] || '',
                                      tempContent[`plan_${planNumber}_feature_3`] !== undefined ? tempContent[`plan_${planNumber}_feature_3`] : planContent[`plan_${planNumber}_feature_3`] || '',
                                      tempContent[`plan_${planNumber}_feature_4`] !== undefined ? tempContent[`plan_${planNumber}_feature_4`] : planContent[`plan_${planNumber}_feature_4`] || '',
                                      tempContent[`plan_${planNumber}_feature_5`] !== undefined ? tempContent[`plan_${planNumber}_feature_5`] : planContent[`plan_${planNumber}_feature_5`] || '',
                                      tempContent[`plan_${planNumber}_feature_6`] !== undefined ? tempContent[`plan_${planNumber}_feature_6`] : planContent[`plan_${planNumber}_feature_6`] || ''
                                    ].filter(Boolean).join('\n')}
                                    onChange={(e) => {
                                      const features = e.target.value.split('\n').filter(Boolean);
                                      features.forEach((feature, index) => {
                                        handleFieldChange(`plan_${planNumber}_feature_${index + 1}`, feature);
                                      });
                                      // Clear remaining features
                                      for (let i = features.length; i < 6; i++) {
                                        handleFieldChange(`plan_${planNumber}_feature_${i + 1}`, '');
                                      }
                                    }}
                                    rows={4}
                                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : activeSection === 'about' ? (
                  <div className="space-y-6">
                    {/* Configuration générale */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration générale</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getSectionFields(activeSection).map(({ field, value, label, isMedia }) => (
                          <div key={field} className={isMedia ? 'md:col-span-2' : ''}>
                            {isMedia ? (
                              <MediaField
                                label={label}
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                type={getMediaType(field)}
                              />
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                {field === 'enabled' ? (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleFieldChange(field, value === 'true' ? 'false' : 'true')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                    <span className="text-sm text-slate-600">
                                      {value === 'true' ? 'Activé' : 'Désactivé'}
                                    </span>
                                  </div>
                                ) : field.includes('description') || field.includes('content') || field.includes('mission') || field.includes('vision') ? (
                                  <textarea
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeSection === 'contact' ? (
                  <div className="space-y-6">
                    {/* Configuration générale */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration générale</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getSectionFields(activeSection).map(({ field, value, label, isMedia }) => (
                          <div key={field} className={isMedia ? 'md:col-span-2' : ''}>
                            {isMedia ? (
                              <MediaField
                                label={label}
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                type={getMediaType(field)}
                              />
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                {field === 'enabled' ? (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleFieldChange(field, value === 'true' ? 'false' : 'true')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                    <span className="text-sm text-slate-600">
                                      {value === 'true' ? 'Activé' : 'Désactivé'}
                                    </span>
                                  </div>
                                ) : field.includes('description') || field.includes('content') ? (
                                  <textarea
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeSection === 'footer' ? (
                  <div className="space-y-6">
                    {/* Configuration générale */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration générale</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getSectionFields(activeSection).filter(({ field }) => 
                          !field.startsWith('support_') && !field.startsWith('privacy_') && !field.startsWith('terms_')
                        ).map(({ field, value, label, isMedia, isRichText, isColor }: any) => (
                          <div key={field} className={isMedia || isRichText ? 'md:col-span-2' : ''}>
                            {isMedia ? (
                              <MediaField
                                label={label}
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                type={getMediaType(field)}
                              />
                            ) : isRichText ? (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                <RichTextEditor
                                  value={tempContent[field] !== undefined ? tempContent[field] : value}
                                  onChange={(newValue) => handleFieldChange(field, newValue)}
                                  placeholder={`Saisissez le contenu pour ${label.toLowerCase()}...`}
                                  height={200}
                                />
                              </div>
                            ) : isColor ? (
                              <ColorPicker
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(newValue) => handleFieldChange(field, newValue)}
                                label={label}
                              />
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                  {label}
                                </label>
                                {field === 'enabled' ? (
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => handleFieldChange(field, value === 'true' ? 'false' : 'true')}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                    <span className="text-sm text-slate-600">
                                      {value === 'true' ? 'Activé' : 'Désactivé'}
                                    </span>
                                  </div>
                                ) : field.includes('description') || field.includes('content') ? (
                                  <textarea
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={tempContent[field] !== undefined ? tempContent[field] : value}
                                    onChange={(e) => handleFieldChange(field, e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                    placeholder={`Enter ${label.toLowerCase()}...`}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Configuration des liens Footer */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">Configuration des liens Footer</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['support', 'privacy', 'terms'].map((linkType) => (
                          <div key={linkType} className="bg-white border border-slate-200 rounded-lg p-4">
                            <h4 className="text-base font-semibold text-slate-900 mb-3 capitalize">{linkType}</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  Texte {linkType}
                                </label>
                                <input
                                  type="text"
                                  value={tempContent[`${linkType}_text`] !== undefined ? tempContent[`${linkType}_text`] : (content.footer?.[`${linkType}_text`] || '')}
                                  onChange={(e) => handleFieldChange(`${linkType}_text`, e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder={`Texte pour ${linkType}...`}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                  URL {linkType}
                                </label>
                                <input
                                  type="text"
                                  value={tempContent[`${linkType}_link`] !== undefined ? tempContent[`${linkType}_link`] : (content.footer?.[`${linkType}_link`] || '')}
                                  onChange={(e) => handleFieldChange(`${linkType}_link`, e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                  placeholder={`URL pour ${linkType}...`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cases dédiées pour chaque page */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-900">Configuration des pages</h3>
                      
                      {/* Page Support */}
                      <div className="bg-white border border-slate-200 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-green-600 font-semibold">S</span>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">Page Support</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Titre de la page
                              </label>
                              <input
                                type="text"
                                value={tempContent.support_title !== undefined ? tempContent.support_title : (content.footer?.support_title || '')}
                                onChange={(e) => handleFieldChange('support_title', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Titre de la page support..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Sous-titre
                              </label>
                              <input
                                type="text"
                                value={tempContent.support_subtitle !== undefined ? tempContent.support_subtitle : (content.footer?.support_subtitle || '')}
                                onChange={(e) => handleFieldChange('support_subtitle', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Sous-titre de la page support..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email de contact
                              </label>
                              <input
                                type="email"
                                value={tempContent.support_email !== undefined ? tempContent.support_email : (content.footer?.support_email || '')}
                                onChange={(e) => handleFieldChange('support_email', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="support@example.com"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Téléphone
                              </label>
                              <input
                                type="tel"
                                value={tempContent.support_phone !== undefined ? tempContent.support_phone : (content.footer?.support_phone || '')}
                                onChange={(e) => handleFieldChange('support_phone', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="+33 1 23 45 67 89"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Texte du bouton chat
                              </label>
                              <input
                                type="text"
                                value={tempContent.support_chat_text !== undefined ? tempContent.support_chat_text : (content.footer?.support_chat_text || '')}
                                onChange={(e) => handleFieldChange('support_chat_text', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Démarrer le chat"
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contenu principal
                              </label>
                              <RichTextEditor
                                value={tempContent.support_content !== undefined ? tempContent.support_content : (content.footer?.support_content || '')}
                                onChange={(content) => handleFieldChange('support_content', content)}
                                placeholder="Saisissez le contenu principal de la page support..."
                                height={200}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contenu FAQ
                              </label>
                              <RichTextEditor
                                value={tempContent.support_faq_content !== undefined ? tempContent.support_faq_content : (content.footer?.support_faq_content || '')}
                                onChange={(content) => handleFieldChange('support_faq_content', content)}
                                placeholder="Saisissez le contenu de la FAQ..."
                                height={200}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <ColorPicker
                                value={tempContent.support_bg_color !== undefined ? tempContent.support_bg_color : (content.footer?.support_bg_color || '#f8fafc')}
                                onChange={(color) => handleFieldChange('support_bg_color', color)}
                                label="Couleur fond"
                              />
                              <ColorPicker
                                value={tempContent.support_text_color !== undefined ? tempContent.support_text_color : (content.footer?.support_text_color || '#1e293b')}
                                onChange={(color) => handleFieldChange('support_text_color', color)}
                                label="Couleur texte"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Page Privacy */}
                      <div className="bg-white border border-slate-200 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold">P</span>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">Page Privacy</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Titre de la page
                              </label>
                              <input
                                type="text"
                                value={tempContent.privacy_title !== undefined ? tempContent.privacy_title : (content.footer?.privacy_title || '')}
                                onChange={(e) => handleFieldChange('privacy_title', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Titre de la page privacy..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Sous-titre
                              </label>
                              <input
                                type="text"
                                value={tempContent.privacy_subtitle !== undefined ? tempContent.privacy_subtitle : (content.footer?.privacy_subtitle || '')}
                                onChange={(e) => handleFieldChange('privacy_subtitle', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Sous-titre de la page privacy..."
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contenu de la page
                              </label>
                              <RichTextEditor
                                value={tempContent.privacy_content !== undefined ? tempContent.privacy_content : (content.footer?.privacy_content || '')}
                                onChange={(content) => handleFieldChange('privacy_content', content)}
                                placeholder="Saisissez le contenu de la page privacy..."
                                height={200}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <ColorPicker
                                value={tempContent.privacy_bg_color !== undefined ? tempContent.privacy_bg_color : (content.footer?.privacy_bg_color || '#f8fafc')}
                                onChange={(color) => handleFieldChange('privacy_bg_color', color)}
                                label="Couleur fond"
                              />
                              <ColorPicker
                                value={tempContent.privacy_text_color !== undefined ? tempContent.privacy_text_color : (content.footer?.privacy_text_color || '#1e293b')}
                                onChange={(color) => handleFieldChange('privacy_text_color', color)}
                                label="Couleur texte"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Page Terms */}
                      <div className="bg-white border border-slate-200 rounded-lg p-6">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-purple-600 font-semibold">T</span>
                          </div>
                          <h4 className="text-lg font-semibold text-slate-900">Page Terms</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Titre de la page
                              </label>
                              <input
                                type="text"
                                value={tempContent.terms_title !== undefined ? tempContent.terms_title : (content.footer?.terms_title || '')}
                                onChange={(e) => handleFieldChange('terms_title', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Titre de la page terms..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Sous-titre
                              </label>
                              <input
                                type="text"
                                value={tempContent.terms_subtitle !== undefined ? tempContent.terms_subtitle : (content.footer?.terms_subtitle || '')}
                                onChange={(e) => handleFieldChange('terms_subtitle', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder="Sous-titre de la page terms..."
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                Contenu de la page
                              </label>
                              <RichTextEditor
                                value={tempContent.terms_content !== undefined ? tempContent.terms_content : (content.footer?.terms_content || '')}
                                onChange={(content) => handleFieldChange('terms_content', content)}
                                placeholder="Saisissez le contenu de la page terms..."
                                height={200}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <ColorPicker
                                value={tempContent.terms_bg_color !== undefined ? tempContent.terms_bg_color : (content.footer?.terms_bg_color || '#f8fafc')}
                                onChange={(color) => handleFieldChange('terms_bg_color', color)}
                                label="Couleur fond"
                              />
                              <ColorPicker
                                value={tempContent.terms_text_color !== undefined ? tempContent.terms_text_color : (content.footer?.terms_text_color || '#1e293b')}
                                onChange={(color) => handleFieldChange('terms_text_color', color)}
                                label="Couleur texte"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : getSectionFields(activeSection).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">Aucun contenu trouvé pour cette section.</p>
                  </div>
                ) : activeSection === 'hero' ? (
                  <div className="space-y-6">
                    {/* Champs texte en 2 colonnes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getSectionFields(activeSection).filter(({ isMedia }) => !isMedia).map(({ field, value, label }) => (
                        <div key={field} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            {label}
                          </label>
                          {field === 'media_type' ? (
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => handleFieldChange(field, value === 'image' ? 'video' : 'image')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  value === 'video' ? 'bg-green-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    value === 'video' ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                              <span className="text-sm text-slate-600">
                                {value === 'video' ? 'Vidéo' : 'Image'}
                              </span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={tempContent[field] !== undefined ? tempContent[field] : value}
                              onChange={(e) => handleFieldChange(field, e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                              placeholder={`Enter ${label.toLowerCase()}...`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Médias en 3 colonnes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {getSectionFields(activeSection).filter(({ isMedia }) => isMedia).map(({ field, value, label }) => (
                        <div key={field} className="bg-slate-50 rounded-lg p-4">
                          <MediaField
                            label={label}
                            value={tempContent[field] !== undefined ? tempContent[field] : value}
                            onChange={(newValue) => handleFieldChange(field, newValue)}
                            type={getMediaType(field)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getSectionFields(activeSection).map(({ field, value, label, isMedia }) => (
                      <div key={field} className={isMedia ? 'md:col-span-2' : ''}>
                        {isMedia ? (
                          <MediaField
                            label={label}
                            value={tempContent[field] !== undefined ? tempContent[field] : value}
                            onChange={(newValue) => handleFieldChange(field, newValue)}
                            type={getMediaType(field)}
                          />
                        ) : (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                              {label}
                            </label>
                            {field === 'enabled' ? (
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => handleFieldChange(field, value === 'true' ? 'false' : 'true')}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    value === 'true' ? 'bg-green-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      value === 'true' ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="text-sm text-slate-600">
                                  {value === 'true' ? 'Activé' : 'Désactivé'}
                                </span>
                              </div>
                            ) : field === 'media_type' ? (
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => handleFieldChange(field, value === 'image' ? 'video' : 'image')}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    value === 'video' ? 'bg-green-600' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      value === 'video' ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                                <span className="text-sm text-slate-600">
                                  {value === 'video' ? 'Vidéo' : 'Image'}
                                </span>
                              </div>
                            ) : field.includes('description') || field.includes('content') ? (
                              <textarea
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder={`Enter ${label.toLowerCase()}...`}
                              />
                            ) : (
                              <input
                                type="text"
                                value={tempContent[field] !== undefined ? tempContent[field] : value}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                                placeholder={`Enter ${label.toLowerCase()}...`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
