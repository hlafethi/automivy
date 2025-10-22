import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trash2, Edit, Clock, Mail, Loader2, FileText, Grid3X3, Ticket as TicketIcon } from 'lucide-react';
import { userWorkflowService, UserWorkflow } from '../services/userWorkflowService';
import { useAuth } from '../contexts/AuthContext';
import { CreateAutomationModal } from './CreateAutomationModal';
import { EditAutomationModal } from './EditAutomationModal';
import { EditPDFWorkflowModal } from './EditPDFWorkflowModal';
import { EditEmailWorkflowModal } from './EditEmailWorkflowModal';
import { TemplateCatalog } from './TemplateCatalog';
import SmartDeployModal from './SmartDeployModal';
import PDFFormModal from './PDFFormModal';
import { UserTickets } from './UserTickets';

export function UserAutomations() {
  const { user, loading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<UserWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPDFEditModal, setShowPDFEditModal] = useState(false);
  const [showEmailEditModal, setShowEmailEditModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<UserWorkflow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<UserWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<'automations' | 'catalog' | 'tickets'>('automations');
  const [showSmartDeploy, setShowSmartDeploy] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      loadWorkflows();
    }
  }, [user, authLoading]);

  const loadWorkflows = async () => {
    console.log('🔍 [UserAutomations] loadWorkflows appelé');
    console.log('🔍 [UserAutomations] user:', user);
    console.log('🔍 [UserAutomations] user.id:', user?.id);
    
    if (!user) {
      console.log('❌ [UserAutomations] Pas d\'utilisateur connecté');
      return;
    }
    
    if (!user.id) {
      console.log('❌ [UserAutomations] ID utilisateur manquant');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔍 [UserAutomations] Chargement des workflows pour user.id:', user.id);
      const userWorkflows = await userWorkflowService.getUserWorkflows(user.id);
      console.log('✅ [UserAutomations] Workflows chargés:', userWorkflows.length);
      setWorkflows(userWorkflows);
    } catch (error) {
      console.error('❌ [UserAutomations] Erreur chargement workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (workflowId: string, currentActive: boolean) => {
    console.log('🔧 [UserAutomations] handleToggle appelé:', { workflowId, currentActive });
    setActionLoading(workflowId);
    try {
      const updatedWorkflow = await userWorkflowService.toggleUserWorkflow(workflowId, !currentActive);
      console.log('✅ [UserAutomations] Workflow toggled:', updatedWorkflow);
      setWorkflows(workflows.map(w => 
        w.id === workflowId ? { ...w, is_active: updatedWorkflow.is_active } : w
      ));
    } catch (error) {
      console.error('❌ [UserAutomations] Error toggling workflow:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async (workflowId: string) => {
    console.log('🔧 [UserAutomations] handleEdit appelé:', workflowId);
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      console.log('🔧 [UserAutomations] Workflow trouvé:', {
        id: workflow.id,
        name: workflow.name,
        n8nWorkflowId: workflow.n8nWorkflowId,
        hasN8nWorkflowId: !!workflow.n8nWorkflowId
      });
      setEditingWorkflow(workflow);
      
      // Utiliser le bon modal selon le type de workflow
      if (workflow.name.includes('PDF Analysis Complete')) {
        setShowEditModal(false); // Fermer le modal générique
        setShowPDFEditModal(true); // Ouvrir le modal PDF
      } else if (workflow.name.includes('v2 Template fonctionnel resume email')) {
        setShowEditModal(false); // Fermer le modal générique
        setShowEmailEditModal(true); // Ouvrir le modal Email
      } else {
        setShowEditModal(true); // Utiliser le modal générique pour les autres
      }
    }
  };

  const handleDelete = async (workflowId: string) => {
    console.log('🔧 [UserAutomations] handleDelete appelé:', workflowId);
    if (!confirm('Are you sure you want to delete this automation? This will permanently remove the workflow and all associated data.')) return;
    
    setActionLoading(workflowId);
    try {
      await userWorkflowService.deleteUserWorkflow(workflowId);
      console.log('✅ [UserAutomations] Workflow deleted');
      setWorkflows(workflows.filter(w => w.id !== workflowId));
    } catch (error) {
      console.error('❌ [UserAutomations] Error deleting workflow:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingWorkflow(null);
    loadWorkflows(); // Recharger les workflows après édition
  };

  const handlePDFForm = (workflow: UserWorkflow) => {
    setSelectedWorkflow(workflow);
    setShowPDFModal(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Dashboard</h2>
          <p className="text-slate-600 mt-1">
            Manage your automations and browse templates
          </p>
        </div>
        {activeTab === 'automations' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Automation</span>
          </button>
        )}
        {activeTab === 'catalog' && (
          <button
            onClick={() => setShowSmartDeploy(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Smart Deploy</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('automations')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'automations'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Mail className="w-5 h-5" />
              My Automations
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'catalog'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
              Template Catalog
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'tickets'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TicketIcon className="w-5 h-5" />
              Support Tickets
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'automations' && (
            <div className="space-y-6">

              {workflows.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Automations Yet</h3>
                  <p className="text-slate-600 mb-4">
                    Create your first email analysis automation to get started
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
                  >
                    Create Your First Automation
                  </button>
                </div>
              ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-green-300"
            >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {workflow.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              workflow.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {workflow.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          {workflow.description && (
                            <p className="text-slate-600 mb-3">{workflow.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Runs at {workflow.schedule}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span>Email Analysis</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {/* Bouton PDF Form - uniquement pour PDF Analysis Complete */}
                          {workflow.name.includes('PDF Analysis Complete') && (
                            <button
                              onClick={() => handlePDFForm(workflow)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="Lancer le formulaire PDF"
                            >
                              <FileText className="w-5 h-5" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleToggle(workflow.id, workflow.is_active)}
                            disabled={actionLoading === workflow.id}
                            className={`p-2 rounded-lg transition disabled:opacity-50 ${
                              workflow.is_active
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={workflow.is_active ? 'Pause automation' : 'Start automation'}
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
                            onClick={() => handleEdit(workflow.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Edit automation"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(workflow.id)}
                            disabled={actionLoading === workflow.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete automation"
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
          )}

          {activeTab === 'catalog' && (
            <TemplateCatalog />
          )}

          {activeTab === 'tickets' && (
            <UserTickets />
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateAutomationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadWorkflows();
          }}
        />
      )}

      {showEditModal && editingWorkflow && (
        <EditAutomationModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorkflow(null);
          }}
          onSuccess={handleEditSuccess}
          workflow={editingWorkflow}
        />
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

      {showPDFEditModal && editingWorkflow && (
        <EditPDFWorkflowModal
          isOpen={showPDFEditModal}
          onClose={() => {
            setShowPDFEditModal(false);
            setEditingWorkflow(null);
          }}
          onSuccess={handleEditSuccess}
          workflow={editingWorkflow}
        />
      )}

      {showEmailEditModal && editingWorkflow && (
        <EditEmailWorkflowModal
          isOpen={showEmailEditModal}
          onClose={() => {
            setShowEmailEditModal(false);
            setEditingWorkflow(null);
          }}
          onSuccess={handleEditSuccess}
          workflow={editingWorkflow}
        />
      )}

      {/* Bouton flottant + pour Smart Deploy */}
      {activeTab !== 'tickets' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              console.log('🔧 [UserAutomations] Bouton SmartDeploy cliqué');
              setShowSmartDeploy(true);
            }}
            className="bg-green-700 text-white p-4 rounded-full shadow-lg hover:bg-green-800 transition-colors border-2 border-white"
            title="Déployer un workflow intelligent"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Modal Smart Deploy */}
      <SmartDeployModal
        isOpen={showSmartDeploy}
        onClose={() => setShowSmartDeploy(false)}
        onSuccess={(workflow) => {
          console.log('Workflow déployé avec succès:', workflow);
          // Rafraîchir la liste des automations
          loadWorkflows();
        }}
      />
    </div>
  );
}
