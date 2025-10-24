import { useState, useEffect } from 'react';
import { BarChart3, Ticket as TicketIcon, Users2, UserCheck, Bell, Database, Activity, AlertTriangle, TrendingUp, Clock, Loader2, Check, Eye, Edit, Key, Pause, Play, Trash2, Search, Filter, ChevronDown, HardDrive, RefreshCw } from 'lucide-react';
import { AnalyticsService, AnalyticsData } from '../../services/analyticsService';
import { UserManagementService, User, UserStats } from '../../services/userManagementService';
import { UserDetailsModal } from './UserDetailsModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { TicketDetailsModal } from '../TicketDetailsModal';
import { NotificationManager } from '../NotificationManager';
import { TicketsService, Ticket, TicketStats } from '../../services/ticketsService';
import { logsService, LogsService } from '../../services/logsService';
import { alertsService } from '../../services/alertsService';
import { activityService } from '../../services/activityService';
import { databaseService } from '../../services/databaseService';
import { AlertsTableView, AlertsStatsView, AlertsTypesView, AlertDetailsModal } from './AlertsComponents';
import { ActivityTableView, ActivitySessionsView, ActivityStatsView, ActivityDetailsModal } from './ActivityComponents';
import { DatabaseMetricsView, DatabaseSlowQueriesView, DatabaseConnectionsView, DatabaseErrorsView, DatabaseTablesView, DatabaseBackupsView, DatabaseStatsView, DatabaseDetailsModal } from './DatabaseComponents';
import { CommunityStatsView, CommunityDiscussionsView, CommunityEventsView, CommunityBadgesView } from './CommunityComponents';
import { NotificationSettingsView } from './NotificationSettings';

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
  const [activeTab, setActiveTab] = useState<'stats' | 'discussions' | 'events' | 'announcements' | 'badges'>('stats');

  const tabs = [
    { id: 'stats', name: 'Statistiques', icon: BarChart3 },
    { id: 'discussions', name: 'Discussions', icon: Users2 },
    { id: 'events', name: 'Événements', icon: Clock },
    { id: 'badges', name: 'Badges', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users2 className="w-8 h-8 text-purple-600" />
        <h3 className="text-xl font-semibold text-slate-900">Communauté</h3>
      </div>

      {/* Navigation par onglets */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="mt-6">
        {activeTab === 'stats' && <CommunityStatsView />}
        {activeTab === 'discussions' && <CommunityDiscussionsView />}
        {activeTab === 'events' && <CommunityEventsView />}
        {activeTab === 'badges' && <CommunityBadgesView />}
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

// Composant pour la section Base de données
export function DatabaseSection() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'slow-queries' | 'connections' | 'errors' | 'tables' | 'backups' | 'stats'>('metrics');
  const [metrics, setMetrics] = useState<any[]>([]);
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    category: '',
    metric_name: '',
    severity: '',
    database_name: '',
    backup_type: '',
    backup_status: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'stats') {
        const statsData = await databaseService.getDatabaseStats(filters.startDate, filters.endDate);
        setStats(statsData);
      } else if (activeTab === 'slow-queries') {
        const response = await databaseService.getSlowQueries(filters);
        setSlowQueries(response.queries);
        setPagination(response.pagination);
      } else if (activeTab === 'connections') {
        const response = await databaseService.getConnections(filters);
        setConnections(response.connections);
        setPagination(response.pagination);
      } else if (activeTab === 'errors') {
        const response = await databaseService.getErrors(filters);
        setErrors(response.errors);
        setPagination(response.pagination);
      } else if (activeTab === 'tables') {
        const response = await databaseService.getTables(filters);
        setTables(response.tables);
        setPagination(response.pagination);
      } else if (activeTab === 'backups') {
        const response = await databaseService.getBackups(filters);
        setBackups(response.backups);
        setPagination(response.pagination);
      } else {
        const response = await databaseService.getMetrics(filters);
        setMetrics(response.metrics);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        setError('Le système de monitoring de base de données n\'est pas encore configuré sur le serveur. Cette fonctionnalité sera disponible prochainement.');
      } else {
        setError(err.message || 'Erreur lors du chargement des données de base de données');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewDetails = (item: any) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

  const handleCleanup = async () => {
    try {
      await databaseService.cleanupOldData();
      loadData(); // Recharger les données
    } catch (err: any) {
      console.error('Erreur lors du nettoyage:', err);
    }
  };

  const handleCollectMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3004/api/database/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Collecte de métriques réussie:', result);
        loadData(); // Recharger les données
      } else {
        throw new Error('Erreur lors de la collecte des métriques');
      }
    } catch (err: any) {
      console.error('Erreur lors de la collecte des métriques:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Base de données</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Chargement des données de base de données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Base de données</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="text-red-800 font-medium">Erreur de chargement</h4>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Base de données</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
          <button
            onClick={handleCollectMetrics}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Collecter
          </button>
          <button
            onClick={handleCleanup}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Nettoyer
          </button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'metrics', label: 'Métriques', icon: TrendingUp },
            { id: 'slow-queries', label: 'Requêtes lentes', icon: Clock },
            { id: 'connections', label: 'Connexions', icon: Users2 },
            { id: 'errors', label: 'Erreurs', icon: AlertTriangle },
            { id: 'tables', label: 'Tables', icon: Database },
            { id: 'backups', label: 'Sauvegardes', icon: HardDrive },
            { id: 'stats', label: 'Statistiques', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recherche</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base de données</label>
              <input
                type="text"
                value={filters.database_name}
                onChange={(e) => handleFilterChange('database_name', e.target.value)}
                placeholder="Nom de la base"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenu des onglets */}
      {activeTab === 'stats' && stats && (
        <DatabaseStatsView stats={stats} />
      )}
      
      {activeTab === 'metrics' && (
        <DatabaseMetricsView
          metrics={metrics}
          pagination={pagination}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      )}
      
      {activeTab === 'slow-queries' && (
        <DatabaseSlowQueriesView
          queries={slowQueries}
          pagination={pagination}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      )}
      
      {activeTab === 'connections' && (
        <DatabaseConnectionsView
          connections={connections}
          pagination={pagination}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      )}
      
      {activeTab === 'errors' && (
        <DatabaseErrorsView
          errors={errors}
          pagination={pagination}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      )}
      
      {activeTab === 'tables' && (
        <DatabaseTablesView
          tables={tables}
          pagination={pagination}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      )}
      
      {activeTab === 'backups' && (
        <DatabaseBackupsView
          backups={backups}
          pagination={pagination}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Modal de détails */}
      <DatabaseDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        data={selectedItem}
        type={activeTab}
      />
    </div>
  );
}

// Composant pour la section Activité
export function ActivitySection() {
  const [activeTab, setActiveTab] = useState<'activities' | 'sessions' | 'stats'>('activities');
  const [activities, setActivities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    category: '',
    action: '',
    status: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [showActivityDetails, setShowActivityDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'stats') {
        const statsData = await activityService.getActivityStats(filters.startDate, filters.endDate, filters.userId);
        setStats(statsData);
      } else if (activeTab === 'sessions') {
        const response = await activityService.getActivitySessions(filters);
        setSessions(response.sessions);
        setPagination(response.pagination);
      } else {
        const response = await activityService.getActivities(filters);
        setActivities(response.activities);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        setError('Le système d\'activité n\'est pas encore configuré sur le serveur. Cette fonctionnalité sera disponible prochainement.');
      } else {
        setError(err.message || 'Erreur lors du chargement des activités');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewActivityDetails = (activity: any) => {
    setSelectedActivity(activity);
    setShowActivityDetails(true);
  };

  const handleExportActivities = async () => {
    try {
      const blob = await activityService.exportActivities({
        format: 'csv',
        ...filters
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Erreur lors de l\'export des activités:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Activité système</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Chargement des activités...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <h3 className="text-xl font-semibold text-slate-900">Activité système</h3>
        </div>
        <div className="bg-red-50 rounded-lg p-8 text-center">
          <Activity className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-blue-600" />
        <h3 className="text-xl font-semibold text-slate-900">Activité système</h3>
      </div>

      {/* Onglets */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'activities', label: 'Activités', icon: Activity },
            { id: 'sessions', label: 'Sessions', icon: Clock },
            { id: 'stats', label: 'Statistiques', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'activities' && (
        <ActivityTableView
          activities={activities}
          pagination={pagination}
          filters={filters}
          showFilters={showFilters}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onViewActivityDetails={handleViewActivityDetails}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onExport={handleExportActivities}
        />
      )}

      {activeTab === 'sessions' && (
        <ActivitySessionsView
          sessions={sessions}
          pagination={pagination}
          filters={filters}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
        />
      )}

      {activeTab === 'stats' && (
        <ActivityStatsView stats={stats} />
      )}

      {/* Modal de détails d'activité */}
      {showActivityDetails && selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setShowActivityDetails(false)}
        />
      )}
    </div>
  );
}

// Composant pour la section Alertes
export function AlertsSection() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'stats' | 'types'>('alerts');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [alertTypes, setAlertTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    status: '',
    severity: '',
    source: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'stats') {
        const statsData = await alertsService.getAlertsStats(filters.startDate, filters.endDate);
        setStats(statsData);
      } else if (activeTab === 'types') {
        const typesData = await alertsService.getAlertTypes();
        setAlertTypes(typesData);
      } else {
        const response = await alertsService.getAlerts(filters);
        setAlerts(response.alerts);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        setError('Le système d\'alertes n\'est pas encore configuré sur le serveur. Cette fonctionnalité sera disponible prochainement.');
      } else {
        setError(err.message || 'Erreur lors du chargement des alertes');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleViewAlertDetails = (alert: any) => {
    setSelectedAlert(alert);
    setShowAlertDetails(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    setActionLoading(alertId);
    try {
      await alertsService.acknowledgeAlert(alertId);
      await loadData();
    } catch (err: any) {
      console.error('Erreur lors de la reconnaissance de l\'alerte:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveAlert = async (alertId: string, reason: string) => {
    setActionLoading(alertId);
    try {
      await alertsService.resolveAlert(alertId, reason);
      await loadData();
    } catch (err: any) {
      console.error('Erreur lors de la résolution de l\'alerte:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuppressAlert = async (alertId: string, reason: string) => {
    setActionLoading(alertId);
    try {
      await alertsService.suppressAlert(alertId, reason);
      await loadData();
    } catch (err: any) {
      console.error('Erreur lors de la suppression de l\'alerte:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <h3 className="text-xl font-semibold text-slate-900">Alertes système</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-slate-600">Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <h3 className="text-xl font-semibold text-slate-900">Alertes système</h3>
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
        <AlertTriangle className="w-8 h-8 text-red-600" />
        <h3 className="text-xl font-semibold text-slate-900">Alertes système</h3>
      </div>

      {/* Onglets */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
            { id: 'stats', label: 'Statistiques', icon: BarChart3 },
            { id: 'types', label: 'Types', icon: Database }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'alerts' && (
        <AlertsTableView
          alerts={alerts}
          pagination={pagination}
          filters={filters}
          showFilters={showFilters}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
          onViewAlertDetails={handleViewAlertDetails}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onResolveAlert={handleResolveAlert}
          onSuppressAlert={handleSuppressAlert}
          onToggleFilters={() => setShowFilters(!showFilters)}
          actionLoading={actionLoading}
        />
      )}

      {activeTab === 'stats' && (
        <AlertsStatsView stats={stats} />
      )}

      {activeTab === 'types' && (
        <AlertsTypesView types={alertTypes} />
      )}

      {/* Modal de détails d'alerte */}
      {showAlertDetails && selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          onClose={() => setShowAlertDetails(false)}
          onAcknowledge={handleAcknowledgeAlert}
          onResolve={handleResolveAlert}
          onSuppress={handleSuppressAlert}
          actionLoading={actionLoading}
        />
      )}
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
  const [activeTab, setActiveTab] = useState<'system' | 'audit' | 'errors' | 'performance' | 'stats'>('system');
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    level: '',
    category: '',
    action: '',
    resourceType: '',
    userId: '',
    errorType: '',
    operation: '',
    resolved: undefined as boolean | undefined,
    success: undefined as boolean | undefined,
    startDate: '',
    endDate: '',
    search: '',
    minDuration: undefined as number | undefined,
    maxDuration: undefined as number | undefined
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  useEffect(() => {
    // Charger les données pour tous les onglets
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'stats') {
        const statsData = await logsService.getLogsStats(filters.startDate, filters.endDate);
        setStats(statsData);
      } else {
        let response;
        switch (activeTab) {
          case 'system':
            response = await logsService.getSystemLogs(filters);
            break;
          case 'audit':
            response = await logsService.getAuditLogs(filters);
            break;
          case 'errors':
            response = await logsService.getErrorLogs(filters);
            break;
          case 'performance':
            response = await logsService.getPerformanceLogs(filters);
            break;
        }
        setLogs(response.logs);
        setPagination(response.pagination);
      }
    } catch (err: any) {
      // Si l'endpoint n'existe pas (erreur 500), afficher un message informatif
      if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        setError('Le système de logs n\'est pas encore configuré sur le serveur. Cette fonctionnalité sera disponible prochainement.');
      } else {
        setError(err.message || 'Erreur lors du chargement des logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleExport = async () => {
    try {
      const blob = await logsService.exportLogs(activeTab as any, 'csv', filters.startDate, filters.endDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'export');
    }
  };

  const handleResolveError = async (errorId: string) => {
    try {
      await logsService.resolveError(errorId);
      loadData(); // Recharger les données
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la résolution');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les anciens logs ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      await logsService.cleanupLogs();
      loadData(); // Recharger les données
    } catch (err: any) {
      setError(err.message || 'Erreur lors du nettoyage');
    }
  };

  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
      level: '',
      category: '',
      action: '',
      resourceType: '',
      userId: '',
      errorType: '',
      operation: '',
      resolved: undefined,
      success: undefined,
      startDate: '',
      endDate: '',
      search: '',
      minDuration: undefined,
      maxDuration: undefined
    });
  };

  const handleViewLogDetails = (log: any) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-gray-600" />
        <h3 className="text-xl font-semibold text-slate-900">Logs système</h3>
      </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Exporter
          </button>
          <button
            onClick={handleCleanup}
            className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Nettoyer
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-slate-200">
          {[
            { id: 'system', label: 'Système', icon: Activity },
            { id: 'audit', label: 'Audit', icon: UserCheck },
            { id: 'errors', label: 'Erreurs', icon: AlertTriangle },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'stats', label: 'Statistiques', icon: BarChart3 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Filtres */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900">Filtres et Recherche</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  <Filter className="w-4 h-4" />
                  Filtres
                  <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher dans les logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Filtres avancés */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                {/* Filtres communs */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date de début</label>
                  <input
                    type="datetime-local"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date de fin</label>
                  <input
                    type="datetime-local"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Filtres spécifiques par onglet */}
                {activeTab === 'system' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Niveau</label>
                      <select
                        value={filters.level}
                        onChange={(e) => handleFilterChange('level', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Tous les niveaux</option>
                        <option value="DEBUG">DEBUG</option>
                        <option value="INFO">INFO</option>
                        <option value="WARN">WARN</option>
                        <option value="ERROR">ERROR</option>
                        <option value="FATAL">FATAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Catégorie</label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Toutes les catégories</option>
                        <option value="AUTH">AUTH</option>
                        <option value="API">API</option>
                        <option value="WORKFLOW">WORKFLOW</option>
                        <option value="DATABASE">DATABASE</option>
                        <option value="SECURITY">SECURITY</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'audit' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Action</label>
                      <input
                        type="text"
                        placeholder="Ex: LOGIN, CREATE_WORKFLOW"
                        value={filters.action}
                        onChange={(e) => handleFilterChange('action', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Type de ressource</label>
                      <select
                        value={filters.resourceType}
                        onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Tous les types</option>
                        <option value="USER">USER</option>
                        <option value="WORKFLOW">WORKFLOW</option>
                        <option value="TEMPLATE">TEMPLATE</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'errors' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Type d'erreur</label>
                      <input
                        type="text"
                        placeholder="Ex: VALIDATION_ERROR"
                        value={filters.errorType}
                        onChange={(e) => handleFilterChange('errorType', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                      <select
                        value={filters.resolved === undefined ? '' : filters.resolved.toString()}
                        onChange={(e) => handleFilterChange('resolved', e.target.value === '' ? undefined : e.target.value === 'true')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Tous</option>
                        <option value="false">Non résolues</option>
                        <option value="true">Résolues</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'performance' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Opération</label>
                      <input
                        type="text"
                        placeholder="Ex: API_REQUEST"
                        value={filters.operation}
                        onChange={(e) => handleFilterChange('operation', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Durée min (ms)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.minDuration || ''}
                        onChange={(e) => handleFilterChange('minDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Durée max (ms)</label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={filters.maxDuration || ''}
                        onChange={(e) => handleFilterChange('maxDuration', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Contenu principal */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">Chargement des logs...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Erreur</h3>
                  <p className="text-red-700">{error}</p>
                  <button
                    onClick={loadData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'stats' ? (
            <LogsStatsView stats={stats} />
          ) : (
            <LogsTableView 
              logs={logs} 
              pagination={pagination} 
              activeTab={activeTab}
              onPageChange={handlePageChange}
              onResolveError={handleResolveError}
              onViewLogDetails={handleViewLogDetails}
            />
          )}
        </div>
      </div>

      {/* Modal de détails du log */}
      {showLogDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Détails du log</h3>
              <button
                onClick={() => {
                  setShowLogDetails(false);
                  setSelectedLog(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID</label>
                  <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timestamp</label>
                  <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">
                    {LogsService.formatTimestamp(selectedLog.timestamp)}
                  </p>
                </div>
              </div>

              {/* Niveau et catégorie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${LogsService.getLevelBgColor(selectedLog.level)}`}>
                    {selectedLog.level}
                  </span>
                </div>
                {selectedLog.category && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${LogsService.getCategoryColor(selectedLog.category)}`}>
                      {selectedLog.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded whitespace-pre-wrap">
                  {selectedLog.message}
                </p>
              </div>

              {/* Détails spécifiques selon le type de log */}
              {activeTab === 'system' && selectedLog.details && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Détails</label>
                  <pre className="text-sm text-slate-900 bg-slate-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                    <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedLog.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedLog.success ? 'Succès' : 'Échec'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'errors' && (
                <div className="space-y-4">
                  {selectedLog.error_type && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Type d'erreur</label>
                      <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">{selectedLog.error_type}</p>
                    </div>
                  )}
                  {selectedLog.stack_trace && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Stack trace</label>
                      <pre className="text-sm text-slate-900 bg-slate-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                        {selectedLog.stack_trace}
                      </pre>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedLog.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedLog.resolved ? 'Résolu' : 'Non résolu'}
                      </span>
                    </div>
                    {selectedLog.resolved_at && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Résolu le</label>
                        <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">
                          {LogsService.formatTimestamp(selectedLog.resolved_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Opération</label>
                    <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">{selectedLog.operation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Durée</label>
                    <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded">
                      {LogsService.formatDuration(selectedLog.duration_ms)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Code</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedLog.status_code >= 200 && selectedLog.status_code < 300 ? 'bg-green-100 text-green-800' :
                      selectedLog.status_code >= 400 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedLog.status_code || '-'}
                    </span>
                  </div>
                </div>
              )}

              {/* Informations techniques */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Informations techniques</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedLog.user_id && (
                    <div>
                      <span className="font-medium text-slate-600">User ID:</span>
                      <span className="ml-2 text-slate-900">{selectedLog.user_id}</span>
                    </div>
                  )}
                  {selectedLog.session_id && (
                    <div>
                      <span className="font-medium text-slate-600">Session ID:</span>
                      <span className="ml-2 text-slate-900">{selectedLog.session_id}</span>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div>
                      <span className="font-medium text-slate-600">IP:</span>
                      <span className="ml-2 text-slate-900">{selectedLog.ip_address}</span>
                    </div>
                  )}
                  {selectedLog.request_id && (
                    <div>
                      <span className="font-medium text-slate-600">Request ID:</span>
                      <span className="ml-2 text-slate-900">{selectedLog.request_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour afficher les statistiques
function LogsStatsView({ stats }: { stats: any }) {
  console.log('LogsStatsView - stats:', stats);
  
  if (!stats) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <div className="text-slate-500">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-600">Logs Système</h4>
              <p className="text-2xl font-bold text-blue-900">{stats.system_logs?.total || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-600">Logs d'Audit</h4>
              <p className="text-2xl font-bold text-green-900">{stats.audit_logs?.total || 0}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-600">Erreurs</h4>
              <p className="text-2xl font-bold text-red-900">{stats.error_logs?.total || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-purple-600">Performance</h4>
              <p className="text-2xl font-bold text-purple-900">
                {stats.performance?.avg_duration_ms || 0}ms
          </p>
        </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
      </div>
        </div>
      </div>

      {/* Détails par niveau */}
      {stats.system_logs?.by_level && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Logs par niveau</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.system_logs.by_level).map(([level, count]) => (
              <div key={level} className="text-center">
                <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${LogsService.getLevelBgColor(level)}`}>
                  {level}
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erreurs non résolues */}
      {stats.error_logs?.unresolved > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h4 className="text-lg font-semibold text-red-800">Erreurs non résolues</h4>
              <p className="text-red-700">{stats.error_logs.unresolved} erreur(s) nécessitent votre attention</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Composant pour afficher le tableau des logs
function LogsTableView({ 
  logs, 
  pagination, 
  activeTab, 
  onPageChange, 
  onResolveError,
  onViewLogDetails
}: { 
  logs: any[]; 
  pagination: any; 
  activeTab: string; 
  onPageChange: (page: number) => void;
  onResolveError: (id: string) => void;
  onViewLogDetails: (log: any) => void;
}) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun log trouvé</h3>
        <p className="text-slate-600">Aucun log ne correspond aux critères de recherche</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tableau des logs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Timestamp
                </th>
                {activeTab === 'system' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Message
                    </th>
                  </>
                )}
                {activeTab === 'audit' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ressource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </>
                )}
                {activeTab === 'errors' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Statut
                    </th>
                  </>
                )}
                {activeTab === 'performance' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Opération
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Durée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {LogsService.formatTimestamp(log.timestamp)}
                  </td>
                  
                  {activeTab === 'system' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${LogsService.getLevelBgColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`font-medium ${LogsService.getCategoryColor(log.category)}`}>
                          {log.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 max-w-xs">
                        <div className="truncate" title={log.message}>
                          {LogsService.truncateText(log.message, 80)}
                        </div>
                      </td>
                    </>
                  )}

                  {activeTab === 'audit' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.user_id ? LogsService.truncateText(log.user_id, 20) : 'Système'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.resource_type} {log.resource_id ? `(${log.resource_id.slice(0, 8)}...)` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Succès' : 'Échec'}
                        </span>
                      </td>
                    </>
                  )}

                  {activeTab === 'errors' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${LogsService.getLevelBgColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.error_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 max-w-xs">
                        <div className="truncate" title={log.message}>
                          {LogsService.truncateText(log.message, 80)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.resolved ? 'Résolu' : 'Non résolu'}
                        </span>
                      </td>
                    </>
                  )}

                  {activeTab === 'performance' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {log.operation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`font-medium ${
                          log.duration_ms > 5000 ? 'text-red-600' : 
                          log.duration_ms > 1000 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {LogsService.formatDuration(log.duration_ms)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {log.endpoint ? `${log.method} ${log.endpoint}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status_code >= 200 && log.status_code < 300 ? 'bg-green-100 text-green-800' :
                          log.status_code >= 400 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.status_code || '-'}
                        </span>
                      </td>
                    </>
                  )}

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewLogDetails(log)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {activeTab === 'errors' && !log.resolved && (
                        <button
                          onClick={() => onResolveError(log.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Marquer comme résolu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} résultats
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} sur {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Composant pour la section Notifications
export function NotificationSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <NotificationSettingsView />
      </div>
    </div>
  );
}
