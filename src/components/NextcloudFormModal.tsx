import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Folder, FolderOpen, Loader2, CheckCircle, RefreshCw, ChevronRight, Play, AlertCircle, Settings, Key } from 'lucide-react';

interface NextcloudFormModalProps {
  workflowId: string;
  workflowName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NextcloudFolder {
  path: string;
  name: string;
  isDirectory: boolean;
  selected?: boolean;
}

const NextcloudFormModal: React.FC<NextcloudFormModalProps> = ({ 
  workflowId, 
  workflowName, 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folders, setFolders] = useState<NextcloudFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState<string[]>(['/']);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // État pour la configuration des credentials
  const [needsCredentials, setNeedsCredentials] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({
    nextcloudUrl: '',
    nextcloudUsername: '',
    nextcloudPassword: ''
  });
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFolders('/');
    }
  }, [isOpen]);

  const loadFolders = async (path: string) => {
    setIsLoading(true);
    setError(null);
    setNeedsCredentials(false);
    
    try {
      const response = await fetch(`http://localhost:3004/api/nextcloud/list-folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          workflowId,
          path 
        })
      });
      
      const data = await response.json();
      console.log('📁 [NextcloudModal] Réponse API:', data);
      
      if (response.ok && data.success) {
        // L'API encapsule dans data.data.folders
        const foldersData = data.data?.folders || data.folders || [];
        console.log('📁 [NextcloudModal] Dossiers reçus:', foldersData.length, foldersData.slice(0, 3));
        setFolders(foldersData);
        setCurrentPath(path);
        setNeedsCredentials(false);
      } else {
        // Si les credentials ne sont pas configurés, afficher le formulaire
        if (data.error?.includes('Credentials Nextcloud non configurés') || 
            data.error?.includes('redéployer')) {
          setNeedsCredentials(true);
          setError(null);
        } else {
          throw new Error(data.error || 'Erreur lors du chargement des dossiers');
        }
      }
    } catch (err: any) {
      console.error('Erreur chargement dossiers:', err);
      // Vérifier si c'est une erreur de credentials
      if (err.message?.includes('Credentials') || err.message?.includes('credentials')) {
        setNeedsCredentials(true);
        setError(null);
      } else {
        setError(err.message || 'Impossible de charger les dossiers Nextcloud');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveCredentials = async () => {
    if (!credentialsForm.nextcloudUrl || !credentialsForm.nextcloudUsername || !credentialsForm.nextcloudPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    setIsSavingCredentials(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3004/api/nextcloud/save-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          workflowId,
          ...credentialsForm
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setNeedsCredentials(false);
        // Recharger les dossiers avec les nouveaux credentials
        loadFolders('/');
      } else {
        throw new Error(data.error || 'Erreur lors de la sauvegarde des credentials');
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde credentials:', err);
      setError(err.message || 'Impossible de sauvegarder les credentials');
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setPathHistory(prev => [...prev, folderPath]);
    loadFolders(folderPath);
  };

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const previousPath = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      loadFolders(previousPath);
    }
  };

  const toggleFolderSelection = (folderPath: string) => {
    setSelectedFolders(prev => {
      if (prev.includes(folderPath)) {
        return prev.filter(p => p !== folderPath);
      } else {
        return [...prev, folderPath];
      }
    });
  };

  const selectAllFolders = () => {
    const allFolderPaths = folders.filter(f => f.isDirectory).map(f => f.path);
    setSelectedFolders(prev => {
      const currentPageSelected = prev.filter(p => !allFolderPaths.includes(p));
      return [...currentPageSelected, ...allFolderPaths];
    });
  };

  const deselectAllFolders = () => {
    const allFolderPaths = folders.filter(f => f.isDirectory).map(f => f.path);
    setSelectedFolders(prev => prev.filter(p => !allFolderPaths.includes(p)));
  };

  const handleSubmit = async () => {
    if (selectedFolders.length === 0) {
      setError('Veuillez sélectionner au moins un dossier à trier');
      return;
    }
    
    setIsSubmitting(true);
    setResult(null);
    setError(null);
    
    try {
      console.log('🚀 [NextcloudFormModal] Lancement du tri pour:', selectedFolders);
      
      const response = await fetch('http://localhost:3004/api/nextcloud/trigger-sort', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          workflowId,
          folders: selectedFolders,
          userId: user?.id
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `✅ Tri lancé avec succès !\n\n📁 ${selectedFolders.length} dossier${selectedFolders.length > 1 ? 's' : ''} ${selectedFolders.length > 1 ? 'seront triés' : 'sera trié'}.\n\n🔄 L'automation va analyser et organiser vos fichiers automatiquement.`
        });
        setSelectedFolders([]);
      } else {
        throw new Error(data.error || 'Erreur lors du lancement du tri');
      }
      
    } catch (err: any) {
      console.error('❌ [NextcloudFormModal] Erreur:', err);
      setResult({
        success: false,
        message: `❌ Erreur: ${err.message || 'Une erreur est survenue lors du lancement du tri'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentFolderName = currentPath === '/' ? 'Racine' : currentPath.split('/').filter(Boolean).pop() || 'Racine';
  const directoryFolders = folders.filter(f => f.isDirectory);
  const allCurrentSelected = directoryFolders.length > 0 && directoryFolders.every(f => selectedFolders.includes(f.path));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec gradient */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Tri de Fichiers Nextcloud</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {workflowName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
          
          {/* Formulaire de configuration des credentials si nécessaire */}
          {needsCredentials ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #fef3c7, #fde68a)' }}>
                  <Key className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Configuration requise</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Pour accéder à vos dossiers Nextcloud, veuillez configurer vos identifiants de connexion.
                </p>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}
              
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URL Nextcloud <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={credentialsForm.nextcloudUrl}
                    onChange={(e) => setCredentialsForm(prev => ({ ...prev, nextcloudUrl: e.target.value }))}
                    placeholder="https://votre-serveur.nextcloud.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200"
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom d'utilisateur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={credentialsForm.nextcloudUsername}
                    onChange={(e) => setCredentialsForm(prev => ({ ...prev, nextcloudUsername: e.target.value }))}
                    placeholder="admin"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200"
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mot de passe / Token d'app <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={credentialsForm.nextcloudPassword}
                    onChange={(e) => setCredentialsForm(prev => ({ ...prev, nextcloudPassword: e.target.value }))}
                    placeholder="Mot de passe ou token généré"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200"
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 Pour plus de sécurité, utilisez un <strong>Token d'application</strong> généré dans Nextcloud (Paramètres → Sécurité → Périphériques et sessions)
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={saveCredentials}
                  disabled={isSavingCredentials || !credentialsForm.nextcloudUrl || !credentialsForm.nextcloudUsername || !credentialsForm.nextcloudPassword}
                  className="px-8 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                  style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
                >
                  {isSavingCredentials ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <Settings className="w-5 h-5" />
                      Se connecter à Nextcloud
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : !result ? (
            <div className="space-y-6">
              {/* Navigation */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={navigateBack}
                      disabled={pathHistory.length <= 1 || isLoading}
                      className="p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ color: '#046f78' }}
                      onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#e0f4f6')}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <span className="text-sm text-slate-600">
                      Chemin: <strong className="text-slate-800">{currentPath}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => loadFolders(currentPath)}
                    disabled={isLoading}
                    className="p-2 rounded-lg transition"
                    style={{ color: '#046f78' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Rafraîchir"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Sélection rapide */}
                {directoryFolders.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={allCurrentSelected ? deselectAllFolders : selectAllFolders}
                      className="text-sm px-3 py-1.5 rounded-lg transition"
                      style={{ 
                        color: '#046f78',
                        backgroundColor: '#e0f4f6',
                        border: '1px solid #75ccd5'
                      }}
                    >
                      {allCurrentSelected ? '✕ Désélectionner tout' : '✓ Sélectionner tout'}
                    </button>
                    {selectedFolders.length > 0 && (
                      <span className="text-sm" style={{ color: '#046f78' }}>
                        {selectedFolders.length} dossier{selectedFolders.length > 1 ? 's' : ''} sélectionné{selectedFolders.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Liste des dossiers */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: '#046f78' }} />
                    <span className="text-slate-600">Chargement des dossiers...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <p className="text-red-600 font-medium mb-2">Erreur de connexion</p>
                    <p className="text-slate-600 text-sm mb-4">{error}</p>
                    <button
                      onClick={() => loadFolders(currentPath)}
                      className="px-4 py-2 text-white rounded-lg transition"
                      style={{ backgroundColor: '#046f78' }}
                    >
                      Réessayer
                    </button>
                  </div>
                ) : directoryFolders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Folder className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-600">Aucun sous-dossier dans ce répertoire</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {directoryFolders.map((folder) => {
                      const isSelected = selectedFolders.includes(folder.path);
                      return (
                        <div
                          key={folder.path}
                          className="flex items-center justify-between p-4 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => toggleFolderSelection(folder.path)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'border-[#046f78] bg-[#046f78]' 
                                  : 'border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </button>
                            <Folder className="w-5 h-5" style={{ color: isSelected ? '#046f78' : '#94a3b8' }} />
                            <span className={`font-medium ${isSelected ? 'text-[#046f78]' : 'text-slate-700'}`}>
                              {folder.name}
                            </span>
                          </div>
                          <button
                            onClick={() => navigateToFolder(folder.path)}
                            className="p-2 rounded-lg transition"
                            style={{ color: '#046f78' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Ouvrir le dossier"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dossiers sélectionnés */}
              {selectedFolders.length > 0 && (
                <div className="rounded-xl p-6 shadow-sm" style={{ background: 'linear-gradient(to right, #e0f4f6, #d1eef1)', border: '1px solid #75ccd5' }}>
                  <h3 className="font-semibold mb-3" style={{ color: '#034a52' }}>
                    📁 Dossiers sélectionnés pour le tri :
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFolders.map((path) => (
                      <span
                        key={path}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: '#046f78', color: 'white' }}
                      >
                        {path}
                        <button
                          onClick={() => toggleFolderSelection(path)}
                          className="ml-1 hover:bg-white/20 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer avec boutons */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedFolders.length === 0}
                  className="px-8 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                  style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #034a52, #023a42)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #046f78, #034a52)';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Lancement en cours...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Lancer le Tri ({selectedFolders.length} dossier{selectedFolders.length > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
                result.success 
                  ? 'bg-gradient-to-br from-green-100 to-green-200' 
                  : 'bg-gradient-to-br from-red-100 to-red-200'
              }`}>
                {result.success ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <X className="w-10 h-10 text-red-600" />
                )}
              </div>
              <div className={`rounded-xl p-6 max-w-md mx-auto shadow-sm ${
                result.success
                  ? 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200'
                  : 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
              }`}>
                <p className={`text-sm whitespace-pre-line leading-relaxed ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
              </div>
              <div className="flex gap-4 justify-center mt-6">
                {result.success && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setSelectedFolders([]);
                    }}
                    className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                    style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
                  >
                    Trier d'autres dossiers
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NextcloudFormModal;

