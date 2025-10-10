import { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Loader2, Activity, Clock } from 'lucide-react';
import { Workflow } from '../types';
import { workflowService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export function MyAutomations() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    if (!user) return;

    try {
      const data = await workflowService.getUserWorkflows(user.id);
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (workflowId: string, currentState: boolean) => {
    setActionLoading(workflowId);
    try {
      await workflowService.toggleWorkflow(workflowId, !currentState);
      loadWorkflows();
    } catch (error: any) {
      alert(error.message || 'Failed to toggle workflow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (workflowId: string) => {
    console.log('🔍 [MyAutomations] handleDelete appelé avec ID:', workflowId);
    
    if (!confirm('Are you sure you want to delete this workflow?')) {
      console.log('❌ [MyAutomations] Suppression annulée par l\'utilisateur');
      return;
    }

    console.log('🔍 [MyAutomations] Début de la suppression...');
    setActionLoading(workflowId);
    try {
      console.log('🔍 [MyAutomations] Appel de workflowService.deleteWorkflow...');
      await workflowService.deleteWorkflow(workflowId);
      console.log('✅ [MyAutomations] Suppression terminée, rechargement des workflows...');
      loadWorkflows();
    } catch (error: any) {
      console.error('❌ [MyAutomations] Erreur lors de la suppression:', error);
      alert(error.message || 'Failed to delete workflow');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">My Automations</h2>
        <p className="text-slate-600 mt-1">
          Manage your deployed workflow automations
        </p>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No automations yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Deploy a template from the catalog to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {workflow.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        workflow.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(workflow.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {workflow.n8n_workflow_id && (
                      <div className="text-xs font-mono bg-slate-50 px-2 py-1 rounded">
                        {workflow.n8n_workflow_id}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(workflow.id, workflow.is_active)}
                    disabled={actionLoading === workflow.id}
                    className={`p-2 rounded-lg transition ${
                      workflow.is_active
                        ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-700'
                    } disabled:opacity-50`}
                    title={workflow.is_active ? 'Stop' : 'Start'}
                  >
                    {actionLoading === workflow.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : workflow.is_active ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      console.log('🔍 [MyAutomations] Bouton supprimer cliqué pour workflow:', workflow.id);
                      handleDelete(workflow.id);
                    }}
                    disabled={actionLoading === workflow.id}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
