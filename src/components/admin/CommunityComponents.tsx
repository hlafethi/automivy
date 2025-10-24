import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Users, 
  Calendar, 
  Megaphone, 
  Award, 
  Tag, 
  Eye, 
  Heart, 
  MessageSquare, 
  Pin, 
  Star, 
  Clock, 
  MapPin, 
  Globe, 
  User, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { communityService, CommunityStats, Category, Discussion, CommunityEvent, CommunityAnnouncement, UserBadge, Tag as TagType } from '../../services/communityService';

// Composant pour les statistiques de la communauté
export function CommunityStatsView() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await communityService.getStats();
      setStats(data);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <MessageCircle className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Discussions</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total_discussions}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Réponses</p>
              <p className="text-2xl font-bold text-green-900">{stats.total_replies}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-800">Utilisateurs</p>
              <p className="text-2xl font-bold text-purple-900">{stats.total_users}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-800">Aujourd'hui</p>
              <p className="text-2xl font-bold text-orange-900">{stats.active_discussions_today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Catégories populaires */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Catégories populaires</h3>
        <div className="space-y-3">
          {stats.top_categories.map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: '#3B82F6' }}
                ></div>
                <span className="text-slate-700">{category.name}</span>
              </div>
              <span className="text-slate-500 font-medium">{category.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Activité récente</h3>
        <div className="space-y-3">
          {stats.recent_activity.map((activity, index) => (
            <div key={index} className="flex items-start">
              <MessageCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                <p className="text-xs text-slate-500">
                  par {activity.author} • {new Date(activity.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant pour la vue des discussions
export function CommunityDiscussionsView() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<Discussion | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: '',
    status: 'ACTIVE',
    search: '',
    sort: 'created_at',
    order: 'DESC'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadData();
    loadCategories();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await communityService.getDiscussions(filters);
      setDiscussions(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError('Erreur lors du chargement des discussions');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await communityService.getCategories();
      setCategories(result.data);
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err);
    }
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleCreateDiscussion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const discussionData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        category_id: formData.get('category_id') as string,
        tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      const newDiscussion = await communityService.createDiscussion(discussionData);
      setDiscussions(prev => [newDiscussion, ...prev]);
      setShowCreateModal(false);
      
      // Reset form (vérifier que le form existe encore)
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err) {
      console.error('Erreur lors de la création de la discussion:', err);
      alert('Erreur lors de la création de la discussion');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditDiscussion = (discussionId: string) => {
    const discussion = discussions.find(d => d.id === discussionId);
    if (discussion) {
      setEditingDiscussion(discussion);
      setShowEditModal(true);
    }
  };

  const handleUpdateDiscussion = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!editingDiscussion) return;
    
    e.preventDefault();
    setEditLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const discussionData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        category_id: formData.get('category_id') as string,
        status: formData.get('status') as string || 'ACTIVE'
      };
      
      const updatedDiscussion = await communityService.updateDiscussion(editingDiscussion.id, discussionData);
      setDiscussions(prev => prev.map(d => d.id === editingDiscussion.id ? updatedDiscussion : d));
      setShowEditModal(false);
      setEditingDiscussion(null);
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la discussion:', err);
      alert('Erreur lors de la mise à jour de la discussion');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette discussion ? Cette action est irréversible.')) {
      setDeleteLoading(discussionId);
      
      try {
        await communityService.deleteDiscussion(discussionId);
        setDiscussions(prev => prev.filter(d => d.id !== discussionId));
      } catch (err) {
        console.error('Erreur lors de la suppression de la discussion:', err);
        alert('Erreur lors de la suppression de la discussion');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleLikeDiscussion = async (discussionId: string) => {
    try {
      await communityService.likeDiscussion(discussionId);
      setDiscussions(prev => prev.map(d => 
        d.id === discussionId 
          ? { ...d, likes_count: d.likes_count + 1, is_liked: true }
          : d
      ));
    } catch (err) {
      console.error('Erreur lors du like:', err);
      // Si l'utilisateur a déjà liké, on passe en mode unlike
      if (err.message && err.message.includes('déjà liké')) {
        // Mettre à jour l'état local pour refléter que l'utilisateur a déjà liké
        setDiscussions(prev => prev.map(d => 
          d.id === discussionId 
            ? { ...d, is_liked: true }
            : d
        ));
        // Puis essayer de retirer le like
        setTimeout(() => handleUnlikeDiscussion(discussionId), 100);
      }
    }
  };

  const handleUnlikeDiscussion = async (discussionId: string) => {
    try {
      await communityService.unlikeDiscussion(discussionId);
      setDiscussions(prev => prev.map(d => 
        d.id === discussionId 
          ? { ...d, likes_count: Math.max(0, d.likes_count - 1), is_liked: false }
          : d
      ));
    } catch (err) {
      console.error('Erreur lors de l\'unlike:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Rechercher..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ACTIVE">Actives</option>
              <option value="CLOSED">Fermées</option>
              <option value="ARCHIVED">Archivées</option>
              <option value="LOCKED">Verrouillées</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tri</label>
            <select
              value={`${filters.sort}-${filters.order}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                handleFilterChange('sort', sort);
                handleFilterChange('order', order);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at-DESC">Plus récentes</option>
              <option value="created_at-ASC">Plus anciennes</option>
              <option value="views_count-DESC">Plus vues</option>
              <option value="likes_count-DESC">Plus aimées</option>
              <option value="replies_count-DESC">Plus commentées</option>
            </select>
          </div>
        </div>
      </div>

      {/* En-tête avec bouton de création */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Discussions</h2>
          <p className="text-slate-600">{pagination.total} discussions trouvées</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Créer une discussion
        </button>
      </div>

      {/* Liste des discussions */}
      <div className="space-y-4">
        {discussions.map(discussion => (
          <div key={discussion.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  {discussion.is_pinned && (
                    <Pin className="w-4 h-4 text-blue-500 mr-2" />
                  )}
                  {discussion.is_featured && (
                    <Star className="w-4 h-4 text-yellow-500 mr-2" />
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">{discussion.title}</h3>
                </div>
                
                <p className="text-slate-600 mb-3 line-clamp-2">{discussion.content}</p>
                
                <div className="flex items-center text-sm text-slate-500 space-x-4">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {discussion.author_first_name} {discussion.author_last_name}
                  </span>
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {discussion.views_count}
                  </span>
                  <span className="flex items-center">
                    <Heart className="w-4 h-4 mr-1" />
                    {discussion.likes_count}
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    {discussion.replies_count}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(discussion.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{ 
                    backgroundColor: discussion.category_color + '20',
                    color: discussion.category_color
                  }}
                >
                  {discussion.category_name}
                </span>
                
                {/* Boutons d'action */}
                <div className="flex items-center space-x-1">
                  {/* Bouton Like/Unlike */}
                  <button
                    onClick={() => {
                      if (discussion.is_liked) {
                        handleUnlikeDiscussion(discussion.id);
                      } else {
                        handleLikeDiscussion(discussion.id);
                      }
                    }}
                    className={`p-1 rounded hover:bg-slate-100 ${
                      discussion.is_liked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
                    }`}
                    title={discussion.is_liked ? 'Retirer le like' : 'Aimer cette discussion'}
                  >
                    <Heart className={`w-4 h-4 ${discussion.is_liked ? 'fill-current' : ''}`} />
                  </button>
                  
                  {/* Bouton Éditer */}
                  <button
                    onClick={() => handleEditDiscussion(discussion.id)}
                    disabled={deleteLoading === discussion.id}
                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-50"
                    title="Éditer la discussion"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  {/* Bouton Supprimer */}
                  <button
                    onClick={() => handleDeleteDiscussion(discussion.id)}
                    disabled={deleteLoading === discussion.id}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Supprimer la discussion"
                  >
                    {deleteLoading === discussion.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          
          <span className="px-3 py-2 text-sm text-slate-700">
            Page {pagination.page} sur {pagination.pages}
          </span>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Modale de création de discussion */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Créer une nouvelle discussion</h3>
            
            <form onSubmit={handleCreateDiscussion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre de la discussion
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de votre discussion..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Catégorie
                </label>
                <select 
                  name="category_id"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contenu
                </label>
                <textarea
                  name="content"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Décrivez votre discussion en détail..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tags (séparés par des virgules)
                </label>
                <input
                  name="tags"
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="exemple, tag1, tag2..."
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-slate-700">Épingler cette discussion</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm text-slate-700">Mettre en vedette</span>
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {createLoading ? 'Création...' : 'Créer la discussion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale d'édition */}
      {showEditModal && editingDiscussion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Modifier la discussion</h3>
            
            <form onSubmit={handleUpdateDiscussion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre de la discussion
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editingDiscussion.title}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de votre discussion..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Catégorie
                </label>
                <select 
                  name="category_id"
                  required
                  defaultValue={editingDiscussion.category_id}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contenu
                </label>
                <textarea
                  name="content"
                  required
                  defaultValue={editingDiscussion.content}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Décrivez votre discussion en détail..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Statut
                </label>
                <select 
                  name="status"
                  defaultValue={editingDiscussion.status}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Fermée</option>
                  <option value="ARCHIVED">Archivée</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDiscussion(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editLoading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour la vue des événements
export function CommunityEventsView() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsFilters, setParticipantsFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: ''
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    type: '',
    status: 'PUBLISHED',
    search: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await communityService.getEvents(filters);
      setEvents(result.data);
    } catch (err) {
      setError('Erreur lors du chargement des événements');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const eventData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        event_type: formData.get('event_type') as string,
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        location: formData.get('location') as string,
        is_virtual: formData.get('is_virtual') === 'on',
        max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants') as string) : null,
        status: formData.get('status') as string || 'PUBLISHED'
      };
      const newEvent = await communityService.createEvent(eventData);
      setEvents(prev => [newEvent, ...prev]);
      setShowCreateModal(false);
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err) {
      console.error('Erreur lors de la création de l\'événement:', err);
      alert('Erreur lors de la création de l\'événement');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setEditingEvent(event);
      setShowEditModal(true);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!editingEvent) return;
    e.preventDefault();
    setEditLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const eventData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        event_type: formData.get('event_type') as string,
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        location: formData.get('location') as string,
        is_virtual: formData.get('is_virtual') === 'on',
        max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants') as string) : null,
        status: formData.get('status') as string || 'PUBLISHED'
      };
      const updatedEvent = await communityService.updateEvent(editingEvent.id, eventData);
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? updatedEvent : e));
      setShowEditModal(false);
      setEditingEvent(null);
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'événement:', err);
      alert('Erreur lors de la mise à jour de l\'événement');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) {
      setDeleteLoading(eventId);
      try {
        await communityService.deleteEvent(eventId);
        setEvents(prev => prev.filter(e => e.id !== eventId));
      } catch (err) {
        console.error('Erreur lors de la suppression de l\'événement:', err);
        alert('Erreur lors de la suppression de l\'événement');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleViewParticipants = async (event: CommunityEvent) => {
    setSelectedEvent(event);
    setShowParticipantsModal(true);
    setParticipantsFilters({ page: 1, limit: 20, search: '', status: '' });
    await loadParticipants(event.id);
  };

  const loadParticipants = async (eventId: string) => {
    setParticipantsLoading(true);
    try {
      const result = await communityService.getEventParticipants(eventId, participantsFilters);
      console.log('🔍 [CommunityEventsView] Résultat participants:', result);
      console.log('🔍 [CommunityEventsView] result.data:', result.data);
      console.log('🔍 [CommunityEventsView] result.data length:', result.data?.length);
      setParticipants(result.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des participants:', err);
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedEvent) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) return;

    try {
      await communityService.removeEventParticipant(selectedEvent.id, participantId);
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    } catch (err) {
      console.error('Erreur lors de la suppression du participant:', err);
      alert('Erreur lors de la suppression du participant');
    }
  };

  useEffect(() => {
    if (showParticipantsModal && selectedEvent) {
      loadParticipants(selectedEvent.id);
    }
  }, [participantsFilters, showParticipantsModal, selectedEvent]);

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'MEETUP': return <Users className="w-5 h-5" />;
      case 'WEBINAR': return <Globe className="w-5 h-5" />;
      case 'WORKSHOP': return <MessageCircle className="w-5 h-5" />;
      case 'CONTEST': return <Award className="w-5 h-5" />;
      case 'ANNOUNCEMENT': return <Megaphone className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'MEETUP': return 'bg-blue-100 text-blue-800';
      case 'WEBINAR': return 'bg-green-100 text-green-800';
      case 'WORKSHOP': return 'bg-purple-100 text-purple-800';
      case 'CONTEST': return 'bg-yellow-100 text-yellow-800';
      case 'ANNOUNCEMENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton de création */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-900">Événements</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Créer un événement
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Rechercher..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les types</option>
              <option value="MEETUP">Meetup</option>
              <option value="WEBINAR">Webinaire</option>
              <option value="WORKSHOP">Atelier</option>
              <option value="CONTEST">Concours</option>
              <option value="ANNOUNCEMENT">Annonce</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PUBLISHED">Publiés</option>
              <option value="DRAFT">Brouillons</option>
              <option value="CANCELLED">Annulés</option>
              <option value="COMPLETED">Terminés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)} mr-3`}>
                  {getEventTypeIcon(event.event_type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                  <p className="text-sm text-slate-500">
                    par {event.organizer_first_name} {event.organizer_last_name}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-slate-600 mb-4 line-clamp-3">{event.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-slate-500">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(event.start_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              
              <div className="flex items-center text-sm text-slate-500">
                {event.is_virtual ? (
                  <Globe className="w-4 h-4 mr-2" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {event.location}
              </div>
              
              {event.max_participants && (
                <div className="flex items-center text-sm text-slate-500">
                  <Users className="w-4 h-4 mr-2" />
                  {event.current_participants} / {event.max_participants} participants
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.event_type)}`}>
                {event.event_type}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewParticipants(event)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  Participants
                </button>
                <button
                  onClick={() => handleEditEvent(event.id)}
                  disabled={deleteLoading === event.id}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  Éditer
                </button>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  disabled={deleteLoading === event.id}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                >
                  {deleteLoading === event.id ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modale de création d'événement */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Créer un nouvel événement</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'événement</label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de votre événement..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  name="description"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Description de l'événement..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type d'événement</label>
                  <select
                    name="event_type"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un type</option>
                    <option value="MEETUP">Meetup</option>
                    <option value="WEBINAR">Webinaire</option>
                    <option value="WORKSHOP">Atelier</option>
                    <option value="CONTEST">Concours</option>
                    <option value="ANNOUNCEMENT">Annonce</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUBLISHED">Publié</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                  <input
                    name="start_date"
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
                  <input
                    name="end_date"
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label>
                <input
                  name="location"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lieu de l'événement..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre maximum de participants</label>
                <input
                  name="max_participants"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionnel"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  name="is_virtual"
                  type="checkbox"
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Événement virtuel</span>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {createLoading ? 'Création...' : 'Créer l\'événement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale d'édition */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Modifier l'événement</h3>
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'événement</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editingEvent.title}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre de votre événement..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  name="description"
                  required
                  defaultValue={editingEvent.description}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Description de l'événement..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type d'événement</label>
                  <select
                    name="event_type"
                    required
                    defaultValue={editingEvent.event_type}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MEETUP">Meetup</option>
                    <option value="WEBINAR">Webinaire</option>
                    <option value="WORKSHOP">Atelier</option>
                    <option value="CONTEST">Concours</option>
                    <option value="ANNOUNCEMENT">Annonce</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                  <select
                    name="status"
                    defaultValue={editingEvent.status}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUBLISHED">Publié</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="CANCELLED">Annulé</option>
                    <option value="COMPLETED">Terminé</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                  <input
                    name="start_date"
                    type="datetime-local"
                    required
                    defaultValue={new Date(editingEvent.start_date).toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
                  <input
                    name="end_date"
                    type="datetime-local"
                    required
                    defaultValue={new Date(editingEvent.end_date).toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label>
                <input
                  name="location"
                  type="text"
                  required
                  defaultValue={editingEvent.location}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lieu de l'événement..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre maximum de participants</label>
                <input
                  name="max_participants"
                  type="number"
                  min="1"
                  defaultValue={editingEvent.max_participants || ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionnel"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  name="is_virtual"
                  type="checkbox"
                  defaultChecked={editingEvent.is_virtual}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Événement virtuel</span>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingEvent(null); }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editLoading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal des participants */}
      {showParticipantsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Participants de "{selectedEvent.title}"
              </h3>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filtres */}
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="Rechercher un participant..."
                value={participantsFilters.search}
                onChange={(e) => setParticipantsFilters(prev => ({ ...prev, search: e.target.value }))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={participantsFilters.status}
                onChange={(e) => setParticipantsFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="REGISTERED">Inscrit</option>
                <option value="ATTENDED">Présent</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>

            {/* Liste des participants */}
            <div className="overflow-y-auto max-h-96">
              {participantsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Chargement des participants...</p>
                </div>
              ) : !participants || participants.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucun participant trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {participant.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {participant.email}
                          </p>
                          <p className="text-sm text-slate-500">Rôle: {participant.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          participant.status === 'REGISTERED' ? 'bg-green-100 text-green-800' :
                          participant.status === 'ATTENDED' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {participant.status === 'REGISTERED' ? 'Inscrit' :
                           participant.status === 'ATTENDED' ? 'Présent' : 'Annulé'}
                        </span>
                        <button
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour la vue des badges
export function CommunityBadgesView() {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBadge, setEditingBadge] = useState<UserBadge | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await communityService.getBadges();
      setBadges(data);
    } catch (err) {
      setError('Erreur lors du chargement des badges');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBadge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const badgeData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        icon: formData.get('icon') as string || '🏆',
        color: formData.get('color') as string || '#4CAF50',
        criteria: { type: 'manual', count: 1 }
      };
      
      const newBadge = await communityService.createBadge(badgeData);
      setBadges(prev => [...prev, newBadge]);
      setShowCreateModal(false);
      
      // Reset form (vérifier que le form existe encore)
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err) {
      console.error('Erreur lors de la création du badge:', err);
      alert('Erreur lors de la création du badge');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditBadge = (badgeId: string) => {
    const badge = badges.find(b => b.id === badgeId);
    if (badge) {
      setEditingBadge(badge);
      setShowEditModal(true);
    }
  };

  const handleUpdateBadge = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!editingBadge) return;
    
    e.preventDefault();
    setEditLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const badgeData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        icon: formData.get('icon') as string || '🏆',
        color: formData.get('color') as string || '#4CAF50',
        criteria: { type: 'manual', count: 1 }
      };
      
      const updatedBadge = await communityService.updateBadge(editingBadge.id, badgeData);
      setBadges(prev => prev.map(b => b.id === editingBadge.id ? updatedBadge : b));
      setShowEditModal(false);
      setEditingBadge(null);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du badge:', err);
      alert('Erreur lors de la mise à jour du badge');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce badge ? Cette action est irréversible.')) {
      setDeleteLoading(badgeId);
      
      try {
        await communityService.deleteBadge(badgeId);
        setBadges(prev => prev.filter(b => b.id !== badgeId));
      } catch (err) {
        console.error('Erreur lors de la suppression du badge:', err);
        alert('Erreur lors de la suppression du badge');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête avec bouton de création */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Badges de la communauté</h2>
          <p className="text-slate-600">Gérez les badges et récompenses des utilisateurs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Créer un badge
        </button>
      </div>

      {/* Grille des badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map(badge => (
          <div key={badge.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div 
                className="p-3 rounded-lg mr-4"
                style={{ backgroundColor: badge.color + '20' }}
              >
                <Award className="w-6 h-6" style={{ color: badge.color }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{badge.name}</h3>
                <p className="text-sm text-slate-500">{badge.assigned_count} attributions</p>
              </div>
            </div>
            
            <p className="text-slate-600 mb-4">{badge.description}</p>
            
            <div className="flex items-center justify-between">
              <span 
                className="px-2 py-1 text-xs font-medium rounded-full"
                style={{ 
                  backgroundColor: badge.color + '20',
                  color: badge.color
                }}
              >
                {badge.assigned_count} utilisateurs
              </span>
              
              <div className="flex gap-2">
                     <button
                       onClick={() => handleEditBadge(badge.id)}
                       disabled={deleteLoading === badge.id}
                       className="text-blue-600 hover:text-blue-800 disabled:opacity-50 text-sm font-medium p-1 hover:bg-blue-50 rounded"
                       title="Éditer le badge"
                     >
                       <Edit className="w-4 h-4" />
                     </button>
                     <button
                       onClick={() => handleDeleteBadge(badge.id)}
                       disabled={deleteLoading === badge.id}
                       className="text-red-600 hover:text-red-800 disabled:opacity-50 text-sm font-medium p-1 hover:bg-red-50 rounded"
                       title="Supprimer le badge"
                     >
                       {deleteLoading === badge.id ? (
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                       ) : (
                         <Trash2 className="w-4 h-4" />
                       )}
                     </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modale de création de badge */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Créer un nouveau badge</h3>
            
            <form onSubmit={handleCreateBadge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du badge
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Premier Pas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description du badge..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Icône
                  </label>
                  <input
                    name="icon"
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="🏆"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Couleur
                  </label>
                  <input
                    name="color"
                    type="color"
                    className="w-full h-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="#4CAF50"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {createLoading ? 'Création...' : 'Créer le badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale d'édition */}
      {showEditModal && editingBadge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Modifier le badge</h3>
            
            <form onSubmit={handleUpdateBadge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du badge
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingBadge.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Premier Pas"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  defaultValue={editingBadge.description}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description du badge..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Icône
                  </label>
                  <input
                    name="icon"
                    type="text"
                    defaultValue={editingBadge.icon}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="🏆"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Couleur
                  </label>
                  <input
                    name="color"
                    type="color"
                    defaultValue={editingBadge.color}
                    className="w-full h-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBadge(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editLoading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
