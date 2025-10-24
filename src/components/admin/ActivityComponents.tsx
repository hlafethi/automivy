import React from 'react';
import { Activity, Clock, BarChart3, Eye, Filter, Download, User, Calendar, Monitor, Globe } from 'lucide-react';
import { ActivityService } from '../../services/activityService';

// Composant pour la vue des activités
export function ActivityTableView({ 
  activities, 
  pagination, 
  filters, 
  showFilters, 
  onFilterChange, 
  onPageChange, 
  onViewActivityDetails, 
  onToggleFilters, 
  onExport 
}: any) {
  return (
    <div className="space-y-4">
      {/* Filtres et actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg"
        >
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les catégories</option>
                <option value="AUTH">Authentification</option>
                <option value="USER">Utilisateur</option>
                <option value="TEMPLATE">Template</option>
                <option value="WORKFLOW">Workflow</option>
                <option value="FILE">Fichier</option>
                <option value="ADMIN">Administration</option>
                <option value="API">API</option>
                <option value="ERROR">Erreur</option>
                <option value="SYSTEM">Système</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => onFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les actions</option>
                <option value="LOGIN">Connexion</option>
                <option value="LOGOUT">Déconnexion</option>
                <option value="CREATE">Création</option>
                <option value="UPDATE">Modification</option>
                <option value="DELETE">Suppression</option>
                <option value="EXECUTE">Exécution</option>
                <option value="UPLOAD">Upload</option>
                <option value="DOWNLOAD">Téléchargement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="SUCCESS">Succès</option>
                <option value="FAILED">Échec</option>
                <option value="PENDING">En attente</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recherche</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table des activités */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Activité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {activities.map((activity: any) => (
                <tr key={activity.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.activity_color ? `bg-${activity.activity_color}-100` : 'bg-slate-100'
                        }`}>
                          <Activity className={`w-4 h-4 ${
                            activity.activity_color ? `text-${activity.activity_color}-600` : 'text-slate-600'
                          }`} />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-900">{activity.title}</div>
                        <div className="text-sm text-slate-500">{activity.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ActivityService.getCategoryColor(activity.category)}`}>
                      {activity.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ActivityService.getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {activity.user_id ? (
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {activity.user_id.substring(0, 8)}...
                      </div>
                    ) : (
                      'Système'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {activity.duration_ms ? ActivityService.formatDuration(activity.duration_ms) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {ActivityService.formatDate(activity.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onViewActivityDetails(activity)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50">
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
    </div>
  );
}

// Composant pour les sessions d'activité
export function ActivitySessionsView({ 
  sessions, 
  pagination, 
  filters, 
  onFilterChange, 
  onPageChange 
}: any) {
  return (
    <div className="space-y-4">
      {/* Table des sessions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Début
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sessions.map((session: any) => (
                <tr key={session.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {session.session_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {session.user_id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {ActivityService.formatDate(session.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {session.end_time ? ActivityService.formatDate(session.end_time) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {session.duration_minutes ? `${session.duration_minutes} min` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.is_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                    }`}>
                      {session.is_active ? 'Active' : 'Terminée'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      {session.ip_address}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50">
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
    </div>
  );
}

// Composant pour les statistiques d'activité
export function ActivityStatsView({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <div className="text-slate-500">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-600">Total activités</h4>
              <p className="text-2xl font-bold text-blue-900">{stats.total_activities || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-600">Succès</h4>
              <p className="text-2xl font-bold text-green-900">{stats.successful_activities || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-600">Échecs</h4>
              <p className="text-2xl font-bold text-red-900">{stats.failed_activities || 0}</p>
            </div>
            <Monitor className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-purple-600">Durée moyenne</h4>
              <p className="text-2xl font-bold text-purple-900">
                {stats.avg_duration_ms ? ActivityService.formatDuration(stats.avg_duration_ms) : '-'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Répartition par catégorie */}
      {stats.by_category && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-slate-900 mb-4">Répartition par catégorie</h4>
          <div className="space-y-3">
            {Object.entries(stats.by_category).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{category}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ActivityService.getCategoryColor(category)}`}>
                  {count as number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Utilisateurs les plus actifs */}
      {stats.most_active_users && stats.most_active_users.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-slate-900 mb-4">Utilisateurs les plus actifs</h4>
          <div className="space-y-3">
            {stats.most_active_users.map((user: any, index: number) => (
              <div key={user.user_id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-slate-700">#{index + 1}</span>
                  <span className="text-sm text-slate-500 ml-2">{user.user_id.substring(0, 8)}...</span>
                </div>
                <span className="text-sm font-medium text-slate-900">{user.count} activités</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de détails d'activité
export function ActivityDetailsModal({ 
  activity, 
  onClose 
}: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-900">Détails de l'activité</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <h4 className="text-lg font-medium text-slate-900">{activity.title}</h4>
            <p className="text-slate-600 mt-1">{activity.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Catégorie</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ActivityService.getCategoryColor(activity.category)}`}>
                  {activity.category}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ActivityService.getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Action</label>
              <p className="text-slate-900">{activity.action}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Durée</label>
              <p className="text-slate-900">{activity.duration_ms ? ActivityService.formatDuration(activity.duration_ms) : '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Utilisateur</label>
              <p className="text-slate-900">{activity.user_id || 'Système'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Date</label>
              <p className="text-slate-900">{ActivityService.formatDate(activity.created_at)}</p>
            </div>
          </div>

          {activity.metadata && (
            <div>
              <label className="text-sm font-medium text-slate-700">Métadonnées</label>
              <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            </div>
          )}

          {activity.old_values && (
            <div>
              <label className="text-sm font-medium text-slate-700">Anciennes valeurs</label>
              <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(activity.old_values, null, 2)}
              </pre>
            </div>
          )}

          {activity.new_values && (
            <div>
              <label className="text-sm font-medium text-slate-700">Nouvelles valeurs</label>
              <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(activity.new_values, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
