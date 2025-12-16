import { useState, useEffect } from 'react';
import { X, Loader2, Save, Clock, Mail } from 'lucide-react';
import { UserWorkflow } from '../types';
import { userWorkflowService } from '../services/userWorkflowService';

interface EditAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workflow: UserWorkflow | null;
}

export function EditAutomationModal({ isOpen, onClose, onSuccess, workflow }: EditAutomationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workflow && isOpen) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setSchedule(workflow.schedule || '');
      setError(null);
      
      // Logger les champs du workflow pour debug
      console.log('🔍 [EditAutomationModal] Workflow reçu:', {
        id: workflow.id,
        name: workflow.name,
        n8n_workflow_id: (workflow as any).n8n_workflow_id,
        n8nWorkflowId: (workflow as any).n8nWorkflowId,
        webhook_path: (workflow as any).webhook_path,
        user_id: (workflow as any).user_id,
        userId: (workflow as any).userId
      });
    }
  }, [workflow, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow) return;

    setLoading(true);
    setError(null);

    try {
      // Mettre à jour en base de données
      await userWorkflowService.updateUserWorkflow(workflow.id, {
        name,
        description,
        schedule
      });

      // Synchroniser le schedule avec n8n
      // Utiliser le webhook unique stocké dans la base de données
      const n8nWorkflowId = (workflow as any).n8n_workflow_id || workflow.n8nWorkflowId;
      const webhookPath = (workflow as any).webhook_path;
      const userId = (workflow as any).user_id || workflow.userId;
      const userWorkflowId = workflow.id;
      
      console.log('🔧 [EditAutomationModal] Paramètres workflow:', {
        userWorkflowId: userWorkflowId,
        n8nWorkflowId: n8nWorkflowId,
        webhookPath: webhookPath,
        schedule: schedule,
        userId: userId
      });
      
      if (n8nWorkflowId) {
        console.log('🔧 [EditAutomationModal] Utilisation du système de planification avec webhook unique');
        try {
          // Utiliser le système de planification avec userWorkflowId pour récupérer le webhook unique
          await userWorkflowService.scheduleUserWorkflowWithWebhook(
            userId,
            n8nWorkflowId,
            schedule,
            userWorkflowId
          );
          console.log('✅ [EditAutomationModal] Planification avec webhook unique réussie');
        } catch (error) {
          console.error('❌ [EditAutomationModal] Erreur planification avec webhook unique:', error);
          // Fallback: utiliser le webhook path directement si disponible
          if (webhookPath) {
            const webhookUrl = `https://n8n.globalsaas.eu/webhook/${webhookPath}`;
            console.log('🔧 [EditAutomationModal] Fallback: utilisation directe du webhook path:', webhookUrl);
            await userWorkflowService.scheduleDirectWebhook(webhookUrl, schedule, userId, n8nWorkflowId);
            console.log('✅ [EditAutomationModal] Planification directe réussie (fallback)');
          } else {
            throw error;
          }
        }
      } else {
        console.log('⚠️ [EditAutomationModal] Pas de n8nWorkflowId, utilisation du système de planification direct');
        // Fallback: utiliser le webhook path si disponible
        if (webhookPath) {
          const webhookUrl = `https://n8n.globalsaas.eu/webhook/${webhookPath}`;
          console.log('🔧 [EditAutomationModal] Utilisation directe du webhook path:', webhookUrl);
          // Extraire le n8nWorkflowId du webhookPath si possible
          const extractedN8nWorkflowId = webhookPath.replace(/^workflow-/, '');
          await userWorkflowService.scheduleDirectWebhook(webhookUrl, schedule, userId, extractedN8nWorkflowId || null);
          console.log('✅ [EditAutomationModal] Planification directe réussie');
        } else {
          console.warn('⚠️ [EditAutomationModal] Aucun webhook path disponible, planification impossible');
        }
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating workflow:', err);
      setError(err.message || 'Failed to update automation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !workflow) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Edit Automation</h3>
            <p className="text-sm text-slate-600 mt-1">Modify your automation settings</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Automation Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter automation name"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Describe what this automation does"
            />
          </div>

          <div>
            <label htmlFor="schedule" className="block text-sm font-medium text-slate-700 mb-1">
              Heure d'exécution quotidienne
            </label>
            <input
              type="time"
              id="schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              L'automation s'exécutera une fois par jour à cette heure
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
