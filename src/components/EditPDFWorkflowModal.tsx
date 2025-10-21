import { useState, useEffect } from 'react';
import { X, Loader2, Save, FileText, Mail } from 'lucide-react';
import { UserWorkflow } from '../types';
import { userWorkflowService } from '../services/userWorkflowService';

interface EditPDFWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workflow: UserWorkflow | null;
}

export function EditPDFWorkflowModal({ isOpen, onClose, onSuccess, workflow }: EditPDFWorkflowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workflow && isOpen) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
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
        schedule: '' // Pas de schedule pour les workflows PDF
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating PDF workflow:', err);
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
              <FileText className="w-5 h-5 text-purple-600" />
              Edit PDF Analysis Workflow
            </h3>
            <p className="text-sm text-slate-600 mt-1">Configure your PDF analysis automation</p>
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              placeholder="Describe what this PDF analysis workflow does"
            />
          </div>

          {/* Information spécifique au workflow PDF */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 mb-1">PDF Analysis Workflow</h4>
                <p className="text-sm text-purple-700">
                  This workflow is triggered by webhook when PDF files are uploaded. 
                  No scheduling is needed - it runs automatically when files are submitted.
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
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
