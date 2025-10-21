import React, { useState } from 'react';
import { Upload, Image, Video, X, Eye } from 'lucide-react';
import { MediaService } from '../services/mediaService';

interface MediaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'image' | 'video' | 'any';
  className?: string;
  id?: string;
}

export function MediaField({ label, value, onChange, type = 'any', className = '', id }: MediaFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Debug logs
  console.log(`🔍 [MediaField] ${label}:`, { value, hasMedia: value && value.trim() !== '', type });

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const response = await MediaService.uploadFile(file);
      console.log('🔍 [MediaField] Nouvelle image uploadée:', response.url);
      onChange(response.url);
      console.log('🔍 [MediaField] onChange appelé avec:', response.url);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const isImage = MediaService.isImageFile(value);
  const isVideo = MediaService.isVideoFile(value);
  const hasMedia = Boolean(value && value.trim() !== '');

  const getAcceptTypes = () => {
    switch (type) {
      case 'image': return 'image/*,.gif';
      case 'video': return 'video/*';
      default: return 'image/*,video/*,.gif';
    }
  };

  const getMediaIcon = () => {
    if (isImage) return <Image className="w-4 h-4 text-blue-500" />;
    if (isVideo) return <Video className="w-4 h-4 text-purple-500" />;
    return <Upload className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      
      <div className="space-y-3">
        {/* Aperçu du média */}
        {hasMedia && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Aperçu :</p>
            {isImage ? (
              <img 
                src={`http://localhost:3004${value}?v=${Date.now()}`} 
                alt="Aperçu" 
                className="w-full h-20 object-cover rounded border"
              />
            ) : isVideo ? (
              <video 
                src={`http://localhost:3004${value}?v=${Date.now()}`} 
                className="w-full h-20 object-cover rounded border"
                controls
                muted
              />
            ) : (
              <div className="w-full h-20 bg-slate-200 rounded border flex items-center justify-center">
                <span className="text-slate-500 text-xs">Aperçu non disponible</span>
              </div>
            )}
          </div>
        )}
        
        {/* Boutons alignés horizontalement */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bouton d'upload - TOUJOURS visible */}
          <div className="relative">
            <input
              type="file"
              id={id || `media-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
              accept={getAcceptTypes()}
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor={id || `media-upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                uploading
                  ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                getMediaIcon()
              )}
              <span className="text-sm font-medium">
                {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
              </span>
            </label>
          </div>
          
          {/* Bouton de prévisualisation - seulement si fichier */}
          {hasMedia && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
          )}
          
          {/* Bouton de suppression - seulement si fichier */}
          {hasMedia && (
            <button
              onClick={() => {
                console.log('🔍 [MediaField] Clear cliqué - effacement de l\'image');
                onChange('');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Clear</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Prévisualisation */}
      {showPreview && hasMedia && (
        <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-slate-700">Prévisualisation</h4>
            <button
              onClick={() => setShowPreview(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {isImage ? (
            <img
              src={`http://localhost:3004${value}`}
              alt="Preview"
              className="max-w-full h-auto max-h-48 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : isVideo ? (
            <video
              src={`http://localhost:3004${value}`}
              controls
              className="max-w-full h-auto max-h-48 rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          
          <div className="hidden text-sm text-slate-500 mt-2">
            Impossible de charger le média. Vérifiez l'URL.
          </div>
          
          <div className="mt-2 text-xs text-slate-500">
            URL: <code className="bg-slate-200 px-1 rounded">{value}</code>
          </div>
        </div>
      )}
    </div>
  );
}
