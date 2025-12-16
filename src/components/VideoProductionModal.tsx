import React, { useState, useEffect } from 'react';
import { X, Video, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface VideoProductionModalProps {
  workflowId: string;
  workflowName: string;
  webhookPath?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DailyLimit {
  canCreate: boolean;
  usedToday: number;
  limit: number;
  nextResetAt: string;
}

const VideoProductionModal: React.FC<VideoProductionModalProps> = ({ 
  workflowId, 
  workflowName,
  webhookPath,
  isOpen, 
  onClose 
}) => {
  const [theme, setTheme] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState<DailyLimit | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(true);
  const { user } = useAuth();

  // Vérifier la limite quotidienne au chargement
  useEffect(() => {
    if (isOpen && user) {
      checkDailyLimit();
    }
  }, [isOpen, user]);

  const checkDailyLimit = async () => {
    setLoadingLimit(true);
    try {
      const response = await fetch(`http://localhost:3004/api/video-production/check-limit/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDailyLimit(data.data || data);
      } else {
        // Si l'API n'existe pas encore, permettre par défaut
        setDailyLimit({ canCreate: true, usedToday: 0, limit: 1, nextResetAt: '' });
      }
    } catch (err) {
      console.error('Erreur vérification limite:', err);
      // Permettre par défaut en cas d'erreur
      setDailyLimit({ canCreate: true, usedToday: 0, limit: 1, nextResetAt: '' });
    } finally {
      setLoadingLimit(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!theme.trim()) {
      setError('Veuillez entrer un thème pour votre vidéo');
      return;
    }

    if (dailyLimit && !dailyLimit.canCreate) {
      setError('Vous avez atteint votre limite quotidienne de 1 vidéo par jour');
      return;
    }

    setIsLaunching(true);
    setError(null);
    
    try {
      console.log('🎬 [VideoProductionModal] Lancement production vidéo:', { workflowId, theme });
      
      // Appeler l'API pour déclencher le workflow
      const response = await fetch('http://localhost:3004/api/video-production/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          workflowId,
          webhookPath,
          theme: theme.trim(),
          userId: user?.id
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Erreur lors du lancement');
      }
      
      console.log('✅ [VideoProductionModal] Vidéo lancée:', data);
      setSuccess(true);
      
      // Fermer le modal après un délai
      setTimeout(() => {
        setSuccess(false);
        setTheme('');
        onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ [VideoProductionModal] Erreur:', err);
      setError(err.message || 'Erreur lors du lancement de la production');
    } finally {
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #046f78 0%, #75ccd5 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Production Vidéo IA</h2>
                <p className="text-sm text-white/80">Créez votre vidéo automatiquement</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all"
              disabled={isLaunching}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Limite quotidienne */}
          {loadingLimit ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
              <span className="ml-2 text-gray-600">Vérification de votre quota...</span>
            </div>
          ) : dailyLimit && !dailyLimit.canCreate ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Limite quotidienne atteinte</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Vous avez déjà créé {dailyLimit.usedToday} vidéo(s) aujourd'hui.
                    <br />
                    Limite : {dailyLimit.limit} vidéo par jour.
                  </p>
                  {dailyLimit.nextResetAt && (
                    <p className="text-xs text-amber-600 mt-2">
                      Prochain reset : {new Date(dailyLimit.nextResetAt).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-teal-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  {dailyLimit ? `${dailyLimit.limit - dailyLimit.usedToday} vidéo(s) restante(s) aujourd'hui` : 'Quota disponible'}
                </span>
              </div>
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Production lancée ! 🎬</h3>
              <p className="text-gray-600">
                Votre vidéo sur le thème "{theme}" est en cours de création.
                <br />
                Vous recevrez un email avec le lien Google Drive.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 Thème de votre vidéo
                </label>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex: Les 5 tendances tech de 2025, Comment créer une startup en 30 jours..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
                  rows={3}
                  disabled={isLaunching || (dailyLimit && !dailyLimit.canCreate)}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLaunching || (dailyLimit && !dailyLimit.canCreate) || !theme.trim()}
                className="w-full py-3 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: isLaunching || (dailyLimit && !dailyLimit.canCreate) 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #046f78 0%, #75ccd5 100%)' 
                }}
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Production en cours...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Lancer la production
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            La vidéo sera générée par IA et uploadée automatiquement sur votre Google Drive.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoProductionModal;

