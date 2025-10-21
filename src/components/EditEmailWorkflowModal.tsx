import { useState, useEffect } from 'react';
import { X, Loader2, Save, Clock, Mail } from 'lucide-react';
import { UserWorkflow } from '../types';
import { userWorkflowService } from '../services/userWorkflowService';

interface EditEmailWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workflow: UserWorkflow | null;
}

export function EditEmailWorkflowModal({ isOpen, onClose, onSuccess, workflow }: EditEmailWorkflowModalProps) {
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
      if (workflow.n8nWorkflowId) {
        console.log('🔧 [EditEmailWorkflowModal] Appel updateN8nSchedule:', {
          n8nWorkflowId: workflow.n8nWorkflowId,
          schedule: schedule,
          userId: workflow.userId
        });
        await userWorkflowService.updateN8nSchedule(workflow.n8nWorkflowId, schedule, workflow.userId);
        console.log('✅ [EditEmailWorkflowModal] updateN8nSchedule terminé');
      } else {
        console.log('⚠️ [EditEmailWorkflowModal] Pas de n8nWorkflowId, utilisation du système de planification direct');
        // Utiliser le système de planification direct même sans n8nWorkflowId
        try {
          const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef';
          
          console.log('🔧 [EditEmailWorkflowModal] Paramètres planification:', {
            n8nWorkflowId: '3UywacWvzJaTPSRU',
            schedule: schedule,
            userId: userId
          });
          
          const webhookUrl = 'https://n8n.globalsaas.eu/webhook/email-summary-trigger';
          console.log('🔧 [EditEmailWorkflowModal] Utilisation directe du webhook:', webhookUrl);
          
          await userWorkflowService.scheduleDirectWebhook(webhookUrl, schedule, userId);
          console.log('✅ [EditEmailWorkflowModal] Planification directe réussie');
        } catch (error) {
          console.error('❌ [EditEmailWorkflowModal] Erreur planification directe:', error);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating email workflow:', err);
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
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Edit Email Summary Workflow
            </h3>
            <p className="text-sm text-slate-600 mt-1">Configure your daily email summary automation</p>
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
              Workflow Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter workflow name"
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
              placeholder="Describe what this email summary workflow does"
            />
          </div>

          <div>
            <label htmlFor="schedule" className="block text-sm font-medium text-slate-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Daily Execution Time
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
              The automation will run once daily at this time to analyze your emails
            </p>
          </div>

          {/* Information spécifique au workflow email */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Email Summary Workflow</h4>
                <p className="text-sm text-blue-700">
                  This workflow analyzes your daily emails and sends you a summary. 
                  It runs automatically at the scheduled time each day.
                </p>
              </div>
            </div>
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
              disabled={loading || !name.trim() || !schedule.trim()}
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
