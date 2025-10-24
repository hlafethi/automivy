import { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Loader2, Activity, Clock, User, Eye, FileText, Search, Filter, RefreshCw, Calendar, Mail, Users, BarChart3, ChevronDown } from 'lucide-react';
import { Workflow } from '../types';
import { workflowService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import PDFFormModal from './PDFFormModal';

export function AllWorkflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'user_id' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  // Effet pour appliquer les filtres
  useEffect(() => {
    applyFilters();
  }, [workflows, searchTerm, statusFilter, userFilter, dateFilter, sortBy, sortOrder]);

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

  // Fonction pour appliquer les filtres et le tri
  const applyFilters = () => {
    let filtered = [...workflows];

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(workflow => 
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (workflow.params?.description && workflow.params.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(workflow => 
        statusFilter === 'active' ? workflow.active : !workflow.active
      );
    }

    // Filtre par utilisateur
    if (userFilter !== 'all') {
      filtered = filtered.filter(workflow => workflow.user_id === userFilter);
    }

    // Filtre par date
    const now = new Date();
    if (dateFilter !== 'all') {
      filtered = filtered.filter(workflow => {
        const createdDate = new Date(workflow.created_at);
        switch (dateFilter) {
          case 'today':
            return createdDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return createdDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return createdDate >= monthAgo;
          default:
            return true;
        }
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
        case 'user_id':
          comparison = a.user_id.localeCompare(b.user_id);
          break;
        case 'status':
          comparison = (a.active ? 1 : 0) - (b.active ? 1 : 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredWorkflows(filtered);
  };

  // Obtenir la liste unique des utilisateurs
  const getUniqueUsers = () => {
    const users = workflows.map(w => w.user_id);
    return Array.from(new Set(users));
  };

  // Statistiques
  const getStats = () => {
    const total = workflows.length;
    const active = workflows.filter(w => w.active).length;
    const inactive = total - active;
    const today = workflows.filter(w => {
      const createdDate = new Date(w.created_at);
      const now = new Date();
      return createdDate.toDateString() === now.toDateString();
    }).length;

    return { total, active, inactive, today };
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

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              All Workflows Dashboard
            </h3>
            <p className="text-slate-600">
              Gestion centralisée de tous les workflows utilisateurs
            </p>
          </div>
          <button
            onClick={loadWorkflows}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-white transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-600">Total Workflows</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-slate-600">Active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Pause className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
                <p className="text-sm text-slate-600">Inactive</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.today}</p>
                <p className="text-sm text-slate-600">Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h4 className="font-semibold text-slate-900">Filtres et Recherche</h4>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              <Filter className="w-4 h-4" />
              Filtres
              <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="text-sm text-slate-600">
            {filteredWorkflows.length} workflow(s) trouvé(s)
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher par nom, utilisateur ou description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Utilisateur</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Tous les utilisateurs</option>
                {getUniqueUsers().map(userId => (
                  <option key={userId} value={userId}>{userId}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Période</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tri par</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="created_at">Date de création</option>
                  <option value="name">Nom</option>
                  <option value="user_id">Utilisateur</option>
                  <option value="status">Statut</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  title={`Tri ${sortOrder === 'asc' ? 'décroissant' : 'croissant'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredWorkflows.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {workflows.length === 0 ? 'No workflows found' : 'No workflows match your filters'}
          </h3>
          <p className="text-slate-600 mb-4">
            {workflows.length === 0 
              ? 'No workflows have been deployed yet' 
              : 'Try adjusting your search criteria or filters'
            }
          </p>
          {workflows.length > 0 && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setUserFilter('all');
                setDateFilter('all');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-green-300 group"
            >
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    workflow.active 
                      ? 'bg-gradient-to-br from-green-50 to-green-100' 
                      : 'bg-gradient-to-br from-gray-50 to-gray-100'
                  }`}>
                    <Activity className={`w-6 h-6 ${
                      workflow.active ? 'text-green-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0 max-w-[200px]">
                    <h4 className="font-semibold text-slate-900 text-sm mb-1 truncate" title={workflow.name}>
                      {workflow.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      ID: {workflow.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                  workflow.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {workflow.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Informations du workflow */}
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate" title={workflow.user_id}>
                      {workflow.user_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{new Date(workflow.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                
                {workflow.n8n_workflow_id && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Activity className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate max-w-[200px]" title={workflow.n8n_workflow_id}>
                      n8n: {workflow.n8n_workflow_id.slice(0, 12)}...
                    </span>
                  </div>
                )}

                {workflow.params && typeof workflow.params === 'object' && workflow.params.description && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 line-clamp-2">
                      <strong>Description:</strong> {workflow.params.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions du workflow */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {/* Bouton PDF Form - uniquement pour PDF Analysis Complete */}
                  {workflow.name === 'PDF Analysis Complete' && (
                    <button
                      onClick={() => handlePDFForm(workflow)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition group-hover:bg-purple-50"
                      title="Lancer le formulaire PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleToggleWorkflow(workflow.id, workflow.active)}
                    disabled={actionLoading === workflow.id}
                    className={`p-2 rounded-lg transition disabled:opacity-50 group-hover:bg-opacity-50 ${
                      workflow.active 
                        ? 'text-orange-600 hover:bg-orange-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={workflow.active ? 'Désactiver le workflow' : 'Activer le workflow'}
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
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 group-hover:bg-red-50"
                    title="Supprimer le workflow"
                  >
                    {actionLoading === workflow.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {/* Indicateur de statut visuel */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    workflow.active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-slate-500">
                    {workflow.active ? 'En cours' : 'Arrêté'}
                  </span>
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
