import React, { useState } from 'react';
import { AlertTriangle, BarChart3, Database, Eye, Check, Loader2, Filter, X } from 'lucide-react';
import { AlertsService } from '../../services/alertsService';

// Composant pour la vue des alertes
export function AlertsTableView({ 
  alerts, 
  pagination, 
  filters, 
  showFilters, 
  onFilterChange, 
  onPageChange, 
  onViewAlertDetails, 
  onAcknowledgeAlert, 
  onResolveAlert, 
  onSuppressAlert, 
  onToggleFilters, 
  actionLoading 
}: any) {
  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleFilters}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tous les statuts</option>
                <option value="ACTIVE">Actives</option>
                <option value="ACKNOWLEDGED">Reconnues</option>
                <option value="RESOLVED">Résolues</option>
                <option value="SUPPRESSED">Supprimées</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sévérité</label>
              <select
                value={filters.severity}
                onChange={(e) => onFilterChange('severity', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Toutes les sévérités</option>
                <option value="CRITICAL">Critique</option>
                <option value="HIGH">Élevée</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="LOW">Faible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select
                value={filters.source}
                onChange={(e) => onFilterChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Toutes les sources</option>
                <option value="SYSTEM">Système</option>
                <option value="DATABASE">Base de données</option>
                <option value="API">API</option>
                <option value="SECURITY">Sécurité</option>
                <option value="WORKFLOW">Workflow</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table des alertes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Alerte
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Sévérité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Déclenchée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {alerts.map((alert: any) => (
                <tr key={alert.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{alert.title}</div>
                      <div className="text-sm text-slate-500">{alert.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${AlertsService.getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${AlertsService.getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {alert.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {AlertsService.formatDate(alert.triggered_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewAlertDetails(alert)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {alert.status === 'ACTIVE' && (
                        <button
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          disabled={actionLoading === alert.id}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                          title="Reconnaître"
                        >
                          {actionLoading === alert.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      )}
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

// Composant pour les statistiques des alertes
export function AlertsStatsView({ stats }: { stats: any }) {
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
        <div className="bg-red-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-600">Alertes actives</h4>
              <p className="text-2xl font-bold text-red-900">{stats.active_alerts || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-yellow-600">Reconnues</h4>
              <p className="text-2xl font-bold text-yellow-900">{stats.acknowledged_alerts || 0}</p>
            </div>
            <Check className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-600">Résolues</h4>
              <p className="text-2xl font-bold text-green-900">{stats.resolved_alerts || 0}</p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-600">Total</h4>
              <p className="text-2xl font-bold text-blue-900">{stats.total_alerts || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Répartition par sévérité */}
      {stats.by_severity && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-slate-900 mb-4">Répartition par sévérité</h4>
          <div className="space-y-3">
            {Object.entries(stats.by_severity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{severity}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${AlertsService.getSeverityColor(severity)}`}>
                  {count as number}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Temps de résolution moyen */}
      {stats.avg_resolution_time && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-slate-900 mb-4">Temps de résolution moyen</h4>
          <p className="text-2xl font-bold text-slate-900">
            {AlertsService.formatDuration(stats.avg_resolution_time)}
          </p>
        </div>
      )}
    </div>
  );
}

// Composant pour les types d'alertes
export function AlertsTypesView({ types }: { types: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h4 className="text-lg font-medium text-slate-900">Types d'alertes</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sévérité
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {types.map((type: any) => (
              <tr key={type.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {type.name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {type.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${AlertsService.getSeverityColor(type.severity)}`}>
                    {type.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {type.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    type.is_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                  }`}>
                    {type.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Modal de détails d'alerte
export function AlertDetailsModal({ 
  alert, 
  onClose, 
  onAcknowledge, 
  onResolve, 
  onSuppress, 
  actionLoading 
}: any) {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showSuppressForm, setShowSuppressForm] = useState(false);
  const [resolveReason, setResolveReason] = useState('');
  const [suppressReason, setSuppressReason] = useState('');

  const handleResolve = () => {
    if (resolveReason.trim()) {
      onResolve(alert.id, resolveReason);
      setShowResolveForm(false);
      setResolveReason('');
    }
  };

  const handleSuppress = () => {
    if (suppressReason.trim()) {
      onSuppress(alert.id, suppressReason);
      setShowSuppressForm(false);
      setSuppressReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-900">Détails de l'alerte</h3>
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
            <h4 className="text-lg font-medium text-slate-900">{alert.title}</h4>
            <p className="text-slate-600 mt-1">{alert.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Sévérité</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${AlertsService.getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${AlertsService.getStatusColor(alert.status)}`}>
                  {alert.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Source</label>
              <p className="text-slate-900">{alert.source}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Déclenchée</label>
              <p className="text-slate-900">{AlertsService.formatDate(alert.triggered_at)}</p>
            </div>
          </div>

          {alert.metadata && (
            <div>
              <label className="text-sm font-medium text-slate-700">Métadonnées</label>
              <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(alert.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-200">
            {alert.status === 'ACTIVE' && (
              <>
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  disabled={actionLoading === alert.id}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg disabled:opacity-50"
                >
                  {actionLoading === alert.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reconnaître'
                  )}
                </button>
                <button
                  onClick={() => setShowResolveForm(true)}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg"
                >
                  Résoudre
                </button>
                <button
                  onClick={() => setShowSuppressForm(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Supprimer
                </button>
              </>
            )}
          </div>

          {/* Formulaire de résolution */}
          {showResolveForm && (
            <div className="p-4 bg-green-50 rounded-lg">
              <label className="block text-sm font-medium text-green-700 mb-2">
                Raison de la résolution
              </label>
              <textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={3}
                placeholder="Expliquez pourquoi cette alerte est résolue..."
              />
              <div className="flex items-center space-x-3 mt-3">
                <button
                  onClick={handleResolve}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowResolveForm(false)}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Formulaire de suppression */}
          {showSuppressForm && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison de la suppression
              </label>
              <textarea
                value={suppressReason}
                onChange={(e) => setSuppressReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                rows={3}
                placeholder="Expliquez pourquoi cette alerte est supprimée..."
              />
              <div className="flex items-center space-x-3 mt-3">
                <button
                  onClick={handleSuppress}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowSuppressForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
