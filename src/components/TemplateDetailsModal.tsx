import { X, FileCode, Clock, Zap } from 'lucide-react';
import { Template } from '../types';

interface TemplateDetailsModalProps {
  template: Template | null;
  onClose: () => void;
}

export function TemplateDetailsModal({ template, onClose }: TemplateDetailsModalProps) {
  if (!template) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden border border-slate-200 flex flex-col">
        {/* Header avec gradient vert sapin */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <FileCode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{template.name}</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Détails du template
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-8 max-h-[calc(95vh-200px)]">
          <div className="space-y-6">
            {template.description && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FileCode className="w-5 h-5" style={{ color: '#046f78' }} />
                  Description complète
                </h3>
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {template.description}
                  </p>
                </div>
              </div>
            )}

            {(template.setup_time !== null && template.setup_time !== undefined) ||
            (template.execution_time !== null && template.execution_time !== undefined) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {template.setup_time !== null && template.setup_time !== undefined && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5" style={{ color: '#046f78' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Temps de paramétrage</p>
                        <p className="text-2xl font-bold" style={{ color: '#046f78' }}>
                          {template.setup_time} min
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {template.execution_time !== null && template.execution_time !== undefined && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5" style={{ color: '#046f78' }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600">Temps d'exécution</p>
                        <p className="text-2xl font-bold" style={{ color: '#046f78' }}>
                          {template.execution_time} min
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {(!template.description || template.description.trim() === '') && (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">Aucune description disponible pour ce template.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #034a52, #023a42)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #046f78, #034a52)';
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

