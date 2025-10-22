import { useState, useEffect } from 'react';
import { BarChart3, Ticket as TicketIcon, Users2, UserCheck, Bell, Database, Activity, AlertTriangle, TrendingUp, Clock, Loader2, Check, Eye, Edit, Key, Pause, Play, Trash2, Search } from 'lucide-react';
import { AnalyticsService, AnalyticsData } from '../../services/analyticsService';
import { UserManagementService, User, UserStats } from '../../services/userManagementService';
import { UserDetailsModal } from './UserDetailsModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { TicketDetailsModal } from '../TicketDetailsModal';
import { NotificationManager } from '../NotificationManager';
import { TicketsService, Ticket, TicketStats } from '../../services/ticketsService';

// Composant pour la section Analytics
export function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await AnalyticsService.getAnalytics();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des analytics:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Chargement des données analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
        </div>
        <div className="bg-red-50 rounded-lg p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
      </div>

      {/* Statistiques utilisateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-600">Total Utilisateurs</h4>
              <p className="text-2xl font-bold text-blue-900">{analytics?.users.total || 0}</p>
            </div>
            <Users2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-600">Utilisateurs Actifs</h4>
              <p className="text-2xl font-bold text-green-900">{analytics?.users.active || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-purple-600">Nouveaux ce Mois</h4>
              <p className="text-2xl font-bold text-purple-900">{analytics?.users.newThisMonth || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-orange-600">Croissance</h4>
              <p className="text-2xl font-bold text-orange-900">+{analytics?.users.growth || 0}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Statistiques workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-600">Total Workflows</h4>
              <p className="text-2xl font-bold text-slate-900">{analytics?.workflows.total || 0}</p>
            </div>
            <Database className="w-8 h-8 text-slate-600" />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-emerald-600">Workflows Exécutés</h4>
              <p className="text-2xl font-bold text-emerald-900">{analytics?.workflows.executed || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-teal-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-teal-600">Taux de Succès</h4>
              <p className="text-2xl font-bold text-teal-900">{analytics?.workflows.successRate || 0}%</p>
            </div>
            <Check className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-indigo-600">Temps Moyen</h4>
              <p className="text-2xl font-bold text-indigo-900">{analytics?.workflows.avgExecutionTime || 0}ms</p>
            </div>
            <Clock className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Statistiques performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-600">Temps de Réponse</h4>
              <p className="text-2xl font-bold text-blue-900">{analytics?.performance.responseTime || 0}ms</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-600">Uptime</h4>
              <p className="text-2xl font-bold text-green-900">{analytics?.performance.uptime || 0}%</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-600">Taux d'Erreur</h4>
              <p className="text-2xl font-bold text-red-900">{analytics?.performance.errorRate || 0}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">Activité Récente</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h5 className="text-sm font-medium text-slate-600">Aujourd'hui</h5>
            <p className="text-2xl font-bold text-slate-900">{analytics?.activity.today || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h5 className="text-sm font-medium text-slate-600">Cette Semaine</h5>
            <p className="text-2xl font-bold text-slate-900">{analytics?.activity.thisWeek || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h5 className="text-sm font-medium text-slate-600">Ce Mois</h5>
            <p className="text-2xl font-bold text-slate-900">{analytics?.activity.thisMonth || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// Composant pour la section Communauté
export function CommunitySection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users2 className="w-8 h-8 text-purple-600" />
        <h3 className="text-xl font-semibold text-slate-900">Communauté</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <Users2 className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Communauté en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section permettra de gérer les forums, les discussions et l'engagement de la communauté.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Utilisateurs
export function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  // Filtrage des utilisateurs
  useEffect(() => {
    let filtered = users;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((user as any).first_name && (user as any).first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ((user as any).last_name && (user as any).last_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.is_active : !user.is_active
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await UserManagementService.getAllUsers();
      setUsers(response.users);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await UserManagementService.getUserStats();
      setStats(statsData);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await UserManagementService.toggleUserStatus(userId);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ));
      loadStats(); // Recharger les stats
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userEmail} ? Cette action est irréversible.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      await UserManagementService.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      loadStats(); // Recharger les stats
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-green-600" />
          <h3 className="text-xl font-semibold text-slate-900">Gestion des utilisateurs</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-slate-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-green-600" />
          <h3 className="text-xl font-semibold text-slate-900">Gestion des utilisateurs</h3>
        </div>
        <div className="bg-red-50 rounded-lg p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="w-8 h-8 text-green-600" />
        <h3 className="text-xl font-semibold text-slate-900">Gestion des utilisateurs</h3>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-600">Total Utilisateurs</h4>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Users2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-600">Utilisateurs Actifs</h4>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-purple-600">Nouveaux cette Semaine</h4>
                <p className="text-2xl font-bold text-purple-900">{stats.newThisWeek}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-orange-600">Admins</h4>
                <p className="text-2xl font-bold text-orange-900">{stats.admins}</p>
              </div>
              <UserCheck className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par email, nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Filtre par rôle */}
          <div className="lg:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Admin</option>
              <option value="user">Utilisateur</option>
            </select>
          </div>

          {/* Filtre par statut */}
          <div className="lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          {/* Bouton de réinitialisation */}
          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* Résultats du filtrage */}
        <div className="mt-4 text-sm text-slate-600">
          {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900">Liste des utilisateurs</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Workflows
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{user.email}</div>
                        <div className="text-sm text-slate-500">
                          Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    <div className="flex items-center space-x-2">
                      <span>{user.workflows_count} total</span>
                      <span className="text-green-600">({user.active_workflows} actifs)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString('fr-FR')
                      : 'Jamais'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-green-600 hover:text-green-900"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Réinitialiser le mot de passe"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        disabled={actionLoading === user.id}
                        className={`${
                          user.is_active 
                            ? 'text-orange-600 hover:text-orange-900' 
                            : 'text-green-600 hover:text-green-900'
                        } disabled:opacity-50`}
                        title={user.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.is_active ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={actionLoading === user.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={showUserDetails}
          onClose={() => {
            setShowUserDetails(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}

      {showPasswordModal && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Composant pour la section Notifications
export function NotificationsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-pink-600" />
        <h3 className="text-xl font-semibold text-slate-900">Notifications</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <Bell className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Système de notifications en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section permettra de gérer les notifications push, email et in-app.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Base de données
export function DatabaseSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-slate-600" />
        <h3 className="text-xl font-semibold text-slate-900">Base de données</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <Database className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Gestion de base de données en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section permettra de gérer les sauvegardes, optimisations et monitoring de la base de données.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Activité
export function ActivitySection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-yellow-600" />
        <h3 className="text-xl font-semibold text-slate-900">Activité récente</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <Activity className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Journal d'activité en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section affichera l'historique des actions, connexions et événements système.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Alertes
export function AlertsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-8 h-8 text-red-600" />
        <h3 className="text-xl font-semibold text-slate-900">Alertes système</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Système d'alertes en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section permettra de configurer et gérer les alertes système, erreurs et notifications critiques.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Performance
export function PerformanceSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-teal-600" />
        <h3 className="text-xl font-semibold text-slate-900">Performance</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <TrendingUp className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Monitoring de performance en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section affichera les métriques de performance, utilisation des ressources et optimisations.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Tickets
export function TicketsSection() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    loadTickets();
    loadStats();
    loadUnreadNotifications();
  }, []);

  // Charger les notifications non lues
  const loadUnreadNotifications = async () => {
    try {
      const notifications = await TicketsService.getUnreadNotifications();
      setUnreadNotifications(notifications.length);
    } catch (err: any) {
      console.error('Erreur lors du chargement des notifications:', err);
    }
  };

  // Filtrage des tickets
  useEffect(() => {
    let filtered = tickets;

    // Filtre par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.created_by_email && ticket.created_by_email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Filtre par priorité
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Filtre par catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === categoryFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await TicketsService.getAllTickets();
      setTickets(response);
      setError(null);
    } catch (err: any) {
      console.error('Erreur lors du chargement des tickets:', err);
      setError(err.message || 'Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await TicketsService.getTicketStats();
      setStats(response);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      setActionLoading(ticketId);
      await TicketsService.updateTicket(ticketId, { status: newStatus as any });
      await loadTickets();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Chargement des tickets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Erreur</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadTickets}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Gestion des Tickets</h2>
              {unreadNotifications > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  </div>
                  <span className="text-sm text-slate-600">
                    {unreadNotifications} notification{unreadNotifications > 1 ? 's' : ''} non lue{unreadNotifications > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            <p className="text-slate-600">Gérez et suivez les demandes de support</p>
          </div>
          <button
            onClick={() => {/* TODO: Implémenter la création de ticket */}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <TicketIcon className="w-4 h-4" />
            Nouveau Ticket
          </button>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <TicketIcon className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Ouverts</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.open}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-800">En cours</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.inProgress}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Urgents</p>
                  <p className="text-2xl font-bold text-red-900">{stats.urgent}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par titre, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Filtre par statut */}
          <div className="lg:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
          </div>

          {/* Filtre par priorité */}
          <div className="lg:w-48">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Toutes les priorités</option>
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Élevée</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Filtre par catégorie */}
          <div className="lg:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">Toutes les catégories</option>
              <option value="general">Général</option>
              <option value="technical">Technique</option>
              <option value="billing">Facturation</option>
              <option value="feature_request">Demande de fonctionnalité</option>
              <option value="bug_report">Rapport de bug</option>
            </select>
          </div>

          {/* Bouton de réinitialisation */}
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setCategoryFilter('all');
            }}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* Résultats du filtrage */}
        <div className="mt-4 text-sm text-slate-600">
          {filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''} trouvé{filteredTickets.length > 1 ? 's' : ''}
          {searchTerm && ` pour "${searchTerm}"`}
        </div>
      </div>

      {/* Liste des tickets */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900">Liste des tickets</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Créateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Assigné à
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <TicketIcon className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 max-w-xs truncate">
                          {ticket.title}
                        </div>
                        <div className="text-sm text-slate-500 max-w-xs truncate">
                          {ticket.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {ticket.created_by_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {ticket.assigned_to_email || 'Non assigné'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getStatusColor(ticket.status)}`}>
                      {TicketsService.getStatusLabel(ticket.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${TicketsService.getPriorityColor(ticket.priority)}`}>
                      {TicketsService.getPriorityLabel(ticket.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {TicketsService.getCategoryLabel(ticket.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {TicketsService.formatDate(ticket.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(ticket)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, ticket.status === 'open' ? 'in_progress' : 'open')}
                        disabled={actionLoading === ticket.id}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        title={ticket.status === 'open' ? 'Marquer en cours' : 'Rouvrir'}
                      >
                        {actionLoading === ticket.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de détails du ticket */}
      {showTicketDetails && selectedTicket && (
        <TicketDetailsModal
          isOpen={showTicketDetails}
          onClose={() => {
            setShowTicketDetails(false);
            setSelectedTicket(null);
          }}
          ticket={selectedTicket}
          onTicketUpdate={() => {
            loadTickets(); // Recharger la liste des tickets
            loadStats(); // Recharger les statistiques
          }}
          onTicketDetailsUpdate={(updatedTicket) => {
            setSelectedTicket(updatedTicket); // Mettre à jour le ticket sélectionné
          }}
        />
      )}

      {/* Gestionnaire de notifications pour les nouveaux tickets et réponses */}
      <NotificationManager
        onViewTicket={(ticketId) => {
          const ticket = tickets.find(t => t.id === ticketId);
          if (ticket) {
            handleViewDetails(ticket);
          }
        }}
        onNotificationRead={() => {
          // Recharger le compteur de notifications quand une notification est lue
          loadUnreadNotifications();
        }}
        isAdmin={true}
      />
    </div>
  );
}

// Composant pour la section Logs
export function LogsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-gray-600" />
        <h3 className="text-xl font-semibold text-slate-900">Logs système</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <Clock className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Journal des logs en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section affichera les logs système, erreurs, débogage et historique des événements.
          </p>
        </div>
      </div>
    </div>
  );
}
