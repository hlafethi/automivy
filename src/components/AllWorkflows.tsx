import { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Loader2, Activity, Clock, User, Eye, FileText } from 'lucide-react';
import { Workflow } from '../types';
import { workflowService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import PDFFormModal from './PDFFormModal';

export function AllWorkflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    if (!user) return;

    try {
      // Pour l'admin, on récupère tous les workflows
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkflow = async (workflowId: string, currentActive: boolean) => {
    if (!workflowId) return;

    setActionLoading(workflowId);
    try {
      if (currentActive) {
        await workflowService.toggleWorkflow(workflowId, false);
      } else {
        await workflowService.toggleWorkflow(workflowId, true);
      }
      loadWorkflows();
    } catch (error: any) {
      console.error('Error toggling workflow:', error);
      alert('Failed to toggle workflow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    console.log('🔍 [AllWorkflows] handleDeleteWorkflow appelé avec ID:', workflowId);
    
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      console.log('❌ [AllWorkflows] Suppression annulée par l\'utilisateur');
      return;
    }

    console.log('🔍 [AllWorkflows] Début de la suppression...');
    setActionLoading(workflowId);
    try {
      console.log('🔍 [AllWorkflows] Appel de workflowService.deleteWorkflow...');
      await workflowService.deleteWorkflow(workflowId);
      console.log('✅ [AllWorkflows] Suppression terminée, rechargement des workflows...');
      loadWorkflows();
    } catch (error: any) {
      console.error('❌ [AllWorkflows] Erreur lors de la suppression:', error);
      alert('Failed to delete workflow');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePDFForm = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowPDFModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          All Workflows ({workflows.length})
        </h3>
        <button
          onClick={loadWorkflows}
          className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
        >
          Refresh
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No workflows found</h3>
          <p className="text-slate-600">
            No workflows have been deployed yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-green-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 text-lg mb-1">
                      {workflow.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Workflow ID: {workflow.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  workflow.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {workflow.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>User: {workflow.user_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(workflow.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {workflow.n8n_workflow_id && (
                  <div className="flex items-center gap-1 text-sm text-slate-600 mb-3">
                    <Activity className="w-4 h-4" />
                    <span>n8n ID: {workflow.n8n_workflow_id}</span>
                  </div>
                )}

                {workflow.params && typeof workflow.params === 'object' && (
                  <p className="text-sm text-slate-600 line-clamp-2">
                    <strong>Description:</strong> {workflow.params.description || 'No description'}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Bouton PDF Form - uniquement pour PDF Analysis Complete */}
                  {workflow.name === 'PDF Analysis Complete' && (
                    <button
                      onClick={() => handlePDFForm(workflow)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      title="Lancer le formulaire PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleToggleWorkflow(workflow.id, workflow.active)}
                    disabled={actionLoading === workflow.id}
                    className={`p-2 rounded-lg transition disabled:opacity-50 ${
                      workflow.active 
                        ? 'text-orange-600 hover:bg-orange-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={workflow.active ? 'Deactivate' : 'Activate'}
                  >
                    {actionLoading === workflow.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : workflow.active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('🔍 [AllWorkflows] Bouton supprimer cliqué pour workflow:', workflow.id);
                      handleDeleteWorkflow(workflow.id);
                    }}
                    disabled={actionLoading === workflow.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Delete workflow"
                  >
                    {actionLoading === workflow.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPDFModal && selectedWorkflow && (
        <PDFFormModal
          workflowId={selectedWorkflow.id}
          workflowName={selectedWorkflow.name}
          isOpen={showPDFModal}
          onClose={() => {
            setShowPDFModal(false);
            setSelectedWorkflow(null);
          }}
        />
      )}
    </div>
  );
}
