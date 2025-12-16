import { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Loader2, Activity, Clock, Sparkles, FileText, X } from 'lucide-react';
import { Workflow } from '../types';
import { workflowService } from '../services';
import { useAuth } from '../contexts/AuthContext';

interface LinkedInPost {
  id: string;
  theme: string;
  content: string;
  status: string;
  createdAt: string;
  publishedAt?: string;
  linkedinPostId?: string;
}

export function MyAutomations() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // États pour LinkedIn
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPostsModal, setShowPostsModal] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [theme, setTheme] = useState('');
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    if (!user) return;

    try {
      const data = await workflowService.getUserWorkflows(user.id);
      console.log('🔍 [MyAutomations] Workflows chargés:', data.length);
      data.forEach((wf: any) => {
        console.log(`  - ${wf.name} (ID: ${wf.id}, Active: ${wf.is_active || wf.active})`);
      });
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

  // Vérifier si un workflow est LinkedIn
  const isLinkedInWorkflow = (workflow: Workflow) => {
    const name = workflow.name || '';
    const nameLower = name.toLowerCase();
    const description = (workflow.description || '').toLowerCase();
    const templateId = (workflow as any).template_id || '';
    
    // IDs des templates LinkedIn (récupérés depuis les logs de déploiement)
    const linkedInTemplateIds = [
      '8f7cf302-523a-49c2-961f-7da9692e7397', // LinkedIn Post Generator - Principal
      // Ajouter d'autres IDs de templates LinkedIn si nécessaire
    ];
    
    // Détection par template_id (plus fiable)
    const isLinkedInByTemplateId = linkedInTemplateIds.includes(templateId);
    
    // Détection par nom (fallback)
    const isLinkedInByName = nameLower.includes('linkedin') || 
                             nameLower.includes('linked-in') ||
                             nameLower.includes('post generator') ||
                             nameLower.includes('token monitor') ||
                             nameLower.includes('oauth handler') ||
                             description.includes('linkedin') ||
                             description.includes('post generator');
    
    const isLinkedIn = isLinkedInByTemplateId || isLinkedInByName;
    
    // Log pour diagnostic (toujours logger pour voir tous les workflows)
    console.log(`🔍 [MyAutomations] Vérification workflow: "${name}"`, {
      nameLower,
      description: description.substring(0, 50),
      templateId,
      isLinkedInByTemplateId,
      isLinkedInByName,
      isLinkedIn,
      workflowKeys: Object.keys(workflow)
    });
    
    if (isLinkedIn) {
      console.log('✅ [MyAutomations] Workflow LinkedIn détecté:', name, isLinkedInByTemplateId ? '(par template_id)' : '(par nom)');
    }
    
    return isLinkedIn;
  };

  // Ouvrir le modal de génération de post
  const handleGeneratePost = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setTheme('');
    setShowGenerateModal(true);
  };

  // Générer un post LinkedIn
  const handleGeneratePostSubmit = async () => {
    if (!selectedWorkflowId || !theme.trim()) {
      alert('Veuillez entrer un thème pour votre post');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3004/api/linkedin/generate-post', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId: selectedWorkflowId,
          theme: theme.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Erreur lors de la génération');
      }

      const result = await response.json();
      alert('Post LinkedIn en cours de génération ! Vous recevrez un email une fois terminé.');
      setShowGenerateModal(false);
      setTheme('');
      setSelectedWorkflowId(null);
    } catch (error: any) {
      console.error('❌ [MyAutomations] Erreur génération post:', error);
      alert(error.message || 'Erreur lors de la génération du post');
    } finally {
      setGenerating(false);
    }
  };

  // Charger les posts LinkedIn de l'utilisateur
  const loadLinkedInPosts = async () => {
    setLoadingPosts(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3004/api/linkedin/posts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Erreur lors du chargement');
      }

      const result = await response.json();
      setPosts(result.data || []);
      setShowPostsModal(true);
    } catch (error: any) {
      console.error('❌ [MyAutomations] Erreur chargement posts:', error);
      alert(error.message || 'Erreur lors du chargement des posts');
    } finally {
      setLoadingPosts(false);
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
                        (workflow.is_active || workflow.active)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {(workflow.is_active || workflow.active) ? 'Active' : 'Inactive'}
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
                  {/* Boutons spécifiques LinkedIn */}
                  {(() => {
                    const isLinkedIn = isLinkedInWorkflow(workflow);
                    console.log(`🔵 [MyAutomations] Workflow "${workflow.name}" - isLinkedIn: ${isLinkedIn}`);
                    if (isLinkedIn) {
                      console.log('🔵 [MyAutomations] ✅ Affichage des boutons LinkedIn pour:', workflow.name);
                    } else {
                      console.log('🔵 [MyAutomations] ❌ Pas de boutons LinkedIn pour:', workflow.name);
                    }
                    return isLinkedIn;
                  })() && (
                    <>
                      <button
                        onClick={() => {
                          console.log('🔵 [MyAutomations] Clic sur "Générer un post" pour workflow:', workflow.id);
                          handleGeneratePost(workflow.id);
                        }}
                        disabled={actionLoading === workflow.id || !(workflow.is_active || workflow.active)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition disabled:opacity-50"
                        title="Générer un post LinkedIn"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔵 [MyAutomations] Clic sur "Voir mes posts"');
                          loadLinkedInPosts();
                        }}
                        disabled={loadingPosts}
                        className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition disabled:opacity-50"
                        title="Voir mes posts générés"
                      >
                        {loadingPosts ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleToggle(workflow.id, workflow.is_active || workflow.active || false)}
                    disabled={actionLoading === workflow.id}
                    className={`p-2 rounded-lg transition ${
                      (workflow.is_active || workflow.active)
                        ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-700'
                    } disabled:opacity-50`}
                    title={(workflow.is_active || workflow.active) ? 'Stop' : 'Start'}
                  >
                    {actionLoading === workflow.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (workflow.is_active || workflow.active) ? (
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

      {/* Modal de génération de post LinkedIn */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Générer un post LinkedIn</h3>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setTheme('');
                  setSelectedWorkflowId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Thème du post
              </label>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Les tendances de l'IA en 2025, Mes conseils pour réussir en freelance..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setTheme('');
                  setSelectedWorkflowId(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
                disabled={generating}
              >
                Annuler
              </button>
              <button
                onClick={handleGeneratePostSubmit}
                disabled={generating || !theme.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 inline-block animate-spin mr-2" />
                    Génération...
                  </>
                ) : (
                  'Générer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'affichage des posts LinkedIn */}
      {showPostsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Mes posts LinkedIn générés</h3>
              <button
                onClick={() => setShowPostsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Aucun post généré pour le moment</p>
                <p className="text-sm text-slate-500 mt-1">
                  Utilisez le bouton "Générer un post" pour créer votre premier post
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">
                          {post.theme || 'Sans thème'}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2 line-clamp-3">
                          {post.content || 'Contenu non disponible'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            Créé le: {post.createdAt ? new Date(post.createdAt).toLocaleString('fr-FR') : 'N/A'}
                          </span>
                          {post.publishedAt && (
                            <span>
                              Publié le: {new Date(post.publishedAt).toLocaleString('fr-FR')}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full ${
                            post.status === 'published' ? 'bg-green-100 text-green-700' :
                            post.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {post.status === 'published' ? 'Publié' :
                             post.status === 'pending' ? 'En attente' :
                             post.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
