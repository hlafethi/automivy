import { useState, useEffect, useMemo } from 'react';
import { Plus, Play, Pause, Trash2, Edit, Clock, Mail, Loader2, FileText, Grid3X3, Ticket as TicketIcon, Users2, User, Search, Filter, X } from 'lucide-react';
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
import { UserCommunityView } from './user/UserCommunityComponents';
import { UserProfileView } from './user/UserProfileComponents';
import { MAIN_CATEGORIES, getSubcategories } from '../constants/categories';
import { templateService } from '../services';

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
  const [activeTab, setActiveTab] = useState<'automations' | 'catalog' | 'tickets' | 'community' | 'profile'>('automations');
  const [showSmartDeploy, setShowSmartDeploy] = useState(false);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [templatesMap, setTemplatesMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (user && !authLoading) {
      loadWorkflows();
      loadTemplatesMap();
    }
  }, [user, authLoading]);

  // Réinitialiser la sous-catégorie quand la catégorie change
  useEffect(() => {
    if (categoryFilter === 'all') {
      setSubcategoryFilter('all');
    }
  }, [categoryFilter]);

  const loadTemplatesMap = async () => {
    try {
      const allTemplates = await templateService.getAllTemplates();
      const map = new Map();
      allTemplates.forEach(template => {
        map.set(template.id, template);
      });
      setTemplatesMap(map);
    } catch (error) {
      console.error('Failed to load templates map:', error);
    }
  };

  // Filtrer et trier les workflows
  const filteredWorkflows = useMemo(() => {
    let filtered = [...workflows];

    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(workflow =>
        workflow.name.toLowerCase().includes(searchLower) ||
        (workflow.description || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(workflow =>
        statusFilter === 'active' ? workflow.is_active : !workflow.is_active
      );
    }

    // Filtre par catégorie (via le template associé)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(workflow => {
        const template = templatesMap.get(workflow.templateId);
        return template?.category === categoryFilter;
      });
    }

    // Filtre par sous-catégorie (via le template associé)
    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter(workflow => {
        const template = templatesMap.get(workflow.templateId);
        return template?.subcategory === subcategoryFilter;
      });
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = a.is_active === b.is_active ? 0 : (a.is_active ? 1 : -1);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [workflows, searchTerm, statusFilter, categoryFilter, subcategoryFilter, sortBy, sortOrder, templatesMap]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const availableSubcategories = categoryFilter !== 'all' ? getSubcategories(categoryFilter) : [];

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
      // Nettoyer automatiquement les workflows orphelins avant de charger
      try {
        console.log('🧹 [UserAutomations] Nettoyage automatique des workflows orphelins...');
        const cleanupResult = await userWorkflowService.cleanupOrphanedWorkflows();
        if (cleanupResult.cleanedCount > 0) {
          console.log(`✅ [UserAutomations] ${cleanupResult.cleanedCount} workflow(s) orphelin(s) supprimé(s)`);
        }
      } catch (cleanupError) {
        console.warn('⚠️ [UserAutomations] Erreur nettoyage workflows orphelins (non bloquant):', cleanupError);
        // Continuer même si le nettoyage échoue
      }
      
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
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('automations')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'automations'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'automations' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <Mail className="w-5 h-5" />
              My Automations
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'catalog'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'catalog' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
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
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'community'
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users2 className="w-5 h-5" />
              Communauté
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'profile'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'profile' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <User className="w-5 h-5" />
              Mon Profil
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'automations' && (
            <div className="space-y-6">
              {/* Barre de recherche et filtres - Design compact harmonisé */}
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Recherche */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Catégorie */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setSubcategoryFilter('all');
                    }}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
                    style={{ 
                      '--tw-ring-color': '#046f78',
                    } as React.CSSProperties & { '--tw-ring-color'?: string }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  >
                    <option value="all">Toutes catégories</option>
                    {MAIN_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Sous-catégorie */}
                  {categoryFilter !== 'all' && (
                    <select
                      value={subcategoryFilter}
                      onChange={(e) => setSubcategoryFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <option value="all">Toutes sous-catégories</option>
                      {availableSubcategories.map(subcat => (
                        <option key={subcat} value={subcat}>{subcat}</option>
                      ))}
                    </select>
                  )}

                  {/* Statut */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
                    style={{ 
                      '--tw-ring-color': '#046f78',
                    } as React.CSSProperties & { '--tw-ring-color'?: string }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  >
                    <option value="all">Tous statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                  </select>

                  {/* Tri */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:outline-none transition"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <option value="created_at">Date</option>
                      <option value="name">Nom</option>
                      <option value="status">Statut</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 transition text-sm"
                      title={`Tri ${sortOrder === 'asc' ? 'décroissant' : 'croissant'}`}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>

                  {/* Réinitialiser */}
                  {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || subcategoryFilter !== 'all') && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              {filteredWorkflows.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                  <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Automations Yet</h3>
                  <p className="text-slate-600 mb-4">
                    Create your first email analysis automation to get started
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 text-white rounded-lg transition"
                    style={{ backgroundColor: '#046f78' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#034a52'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#046f78'}
                  >
                    Create Your First Automation
                  </button>
                </div>
              ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#75ccd5'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {workflow.name}
                            </h3>
                            <span 
                              className="px-2 py-1 text-xs font-medium rounded-full"
                              style={workflow.is_active ? {
                                backgroundColor: '#e0f4f6',
                                color: '#046f78',
                                border: '1px solid #75ccd5'
                              } : {
                                backgroundColor: '#f1f5f9',
                                color: '#64748b'
                              }}
                            >
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
                            className="p-2 rounded-lg transition disabled:opacity-50"
                            style={workflow.is_active ? {
                              color: '#f97316'
                            } : {
                              color: '#046f78'
                            }}
                            onMouseEnter={(e) => {
                              if (!workflow.is_active) {
                                e.currentTarget.style.backgroundColor = '#e0f4f6';
                              } else {
                                e.currentTarget.style.backgroundColor = '#fff7ed';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
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
                            className="p-2 rounded-lg transition"
                            style={{ color: '#046f78' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f4f6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

          {activeTab === 'community' && (
            <UserCommunityView />
          )}


          {activeTab === 'profile' && (
            <UserProfileView />
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


      {/* Bouton flottant + pour Create Automation (onglet automations) */}
      {activeTab === 'automations' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              console.log('🔧 [UserAutomations] Bouton Create Automation cliqué');
              setShowCreateModal(true);
            }}
            className="text-white p-4 rounded-full shadow-lg transition-colors border-2 border-white"
            style={{ backgroundColor: '#046f78' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#034a52'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#046f78'}
            title="Créer une automation"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Bouton flottant + pour Smart Deploy (onglet catalog) */}
      {activeTab === 'catalog' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              console.log('🔧 [UserAutomations] Bouton SmartDeploy cliqué');
              setShowSmartDeploy(true);
            }}
            className="text-white p-4 rounded-full shadow-lg transition-colors border-2 border-white"
            style={{ backgroundColor: '#046f78' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#034a52'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#046f78'}
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
