import React, { useState, useEffect } from 'react';
import { Save, Eye, ArrowLeft, Settings, FileText, DollarSign, Users, Mail, Globe, PlayCircle } from 'lucide-react';
import { LandingService, LandingContent, LandingStats } from '../services/landingService';
import { MediaField } from './MediaField';
import { IconSelect } from './IconSelect';

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
    if (field === 'enabled' && activeSection === 'video_demo') {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
