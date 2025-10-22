import React, { useState } from 'react';
import { X, Ticket as TicketIcon, Save, Loader2, AlertTriangle } from 'lucide-react';
import { TicketsService, CreateTicketData } from '../services/ticketsService';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: any) => void;
}

export function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Le titre est requis');
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('La description est requise');
      setLoading(false);
      return;
    }

    if (formData.description.length < 10) {
      setError('La description doit contenir au moins 10 caractères');
      setLoading(false);
      return;
    }

    try {
      const newTicket = await TicketsService.createTicket(formData);
      onSuccess(newTicket);
      handleClose();
    } catch (err: any) {
      console.error('Erreur lors de la création du ticket:', err);
      setError(err.message || 'Erreur lors de la création du ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'general'
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <TicketIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Créer un nouveau ticket</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Titre du ticket *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={100}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                placeholder="Décrivez brièvement votre problème"
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.title.length}/100 caractères
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description détaillée *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                minLength={10}
                maxLength={2000}
                rows={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-none"
                placeholder="Décrivez votre problème en détail. Plus vous fournirez d'informations, plus nous pourrons vous aider rapidement."
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.description.length}/2000 caractères (minimum 10)
              </p>
            </div>

            {/* Priorité et Catégorie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Priorité
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                >
                  <option value="low">Faible - Question générale</option>
                  <option value="medium">Moyenne - Problème standard</option>
                  <option value="high">Élevée - Problème important</option>
                  <option value="urgent">Urgente - Problème critique</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                >
                  <option value="general">Général</option>
                  <option value="technical">Technique</option>
                  <option value="billing">Facturation</option>
                  <option value="feature_request">Demande de fonctionnalité</option>
                  <option value="bug_report">Rapport de bug</option>
                </select>
              </div>
            </div>

            {/* Conseils */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Conseils pour un ticket efficace</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Soyez précis dans votre description</li>
                <li>• Incluez les étapes pour reproduire le problème</li>
                <li>• Mentionnez votre navigateur et système d'exploitation si pertinent</li>
                <li>• Joignez des captures d'écran si nécessaire</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.description.trim()}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Créer le ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
