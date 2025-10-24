import React, { useState } from 'react';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  HardDrive, 
  Clock, 
  Users, 
  FileText, 
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { 
  DatabaseMetric, 
  SlowQuery, 
  ActiveConnection, 
  DatabaseError, 
  TableStatistics, 
  DatabaseBackup,
  DatabaseStats 
} from '../../services/databaseService';

// Composant pour afficher les métriques
export const DatabaseMetricsView: React.FC<{
  metrics: DatabaseMetric[];
  pagination: any;
  onPageChange: (page: number) => void;
  onViewDetails: (metric: DatabaseMetric) => void;
}> = ({ metrics, pagination, onPageChange, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{metric.metric_name}</h3>
              <span className="text-sm text-gray-500">{metric.metric_unit}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {typeof metric.metric_value === 'number' ? metric.metric_value.toFixed(2) : metric.metric_value}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {metric.category}
              </span>
              <button
                onClick={() => onViewDetails(metric)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                Détails
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} sur {pagination.pages} ({pagination.total} métriques)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher les requêtes lentes
export const DatabaseSlowQueriesView: React.FC<{
  queries: SlowQuery[];
  pagination: any;
  onPageChange: (page: number) => void;
  onViewDetails: (query: SlowQuery) => void;
}> = ({ queries, pagination, onPageChange, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requête
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temps (ms)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lignes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queries.map((query) => (
                <tr key={query.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {query.query_text}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {query.execution_time_ms}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {query.rows_examined} / {query.rows_sent}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {query.database_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(query.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewDetails(query)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} sur {pagination.pages} ({pagination.total} requêtes)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher les connexions actives
export const DatabaseConnectionsView: React.FC<{
  connections: ActiveConnection[];
  pagination: any;
  onPageChange: (page: number) => void;
  onViewDetails: (connection: ActiveConnection) => void;
}> = ({ connections, pagination, onPageChange, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {connections.map((connection) => (
                <tr key={connection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {connection.connection_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {connection.user_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {connection.database_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      connection.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {connection.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {connection.command}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {connection.time_seconds}s
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewDetails(connection)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} sur {pagination.pages} ({pagination.total} connexions)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher les erreurs
export const DatabaseErrorsView: React.FC<{
  errors: DatabaseError[];
  pagination: any;
  onPageChange: (page: number) => void;
  onViewDetails: (error: DatabaseError) => void;
}> = ({ errors, pagination, onPageChange, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sévérité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errors.map((error) => (
                <tr key={error.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {error.error_code}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {error.error_message}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      error.error_severity === 'FATAL' ? 'bg-red-100 text-red-800' :
                      error.error_severity === 'ERROR' ? 'bg-red-100 text-red-800' :
                      error.error_severity === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {error.error_severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {error.database_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(error.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewDetails(error)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} sur {pagination.pages} ({pagination.total} erreurs)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher les statistiques des tables
export const DatabaseTablesView: React.FC<{
  tables: TableStatistics[];
  pagination: any;
  onPageChange: (page: number) => void;
  onViewDetails: (table: TableStatistics) => void;
}> = ({ tables, pagination, onPageChange, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lignes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taille
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Index
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {table.table_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {table.database_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {table.table_rows?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {table.table_size_bytes ? (table.table_size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {table.index_size_bytes ? (table.index_size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {table.total_size_bytes ? (table.total_size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {table.table_engine}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewDetails(table)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} sur {pagination.pages} ({pagination.total} tables)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher les sauvegardes
export const DatabaseBackupsView: React.FC<{
  backups: DatabaseBackup[];
  pagination: any;
  onPageChange: (page: number) => void;
  onViewDetails: (backup: DatabaseBackup) => void;
}> = ({ backups, pagination, onPageChange, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taille
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {backup.backup_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {backup.backup_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {backup.database_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      backup.backup_status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      backup.backup_status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      backup.backup_status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {backup.backup_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {backup.file_size_bytes ? (backup.file_size_bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {backup.duration_seconds ? `${backup.duration_seconds}s` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewDetails(backup)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} sur {pagination.pages} ({pagination.total} sauvegardes)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
            {pagination.page}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour afficher les statistiques générales
export const DatabaseStatsView: React.FC<{
  stats: DatabaseStats;
}> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connexions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_connections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Requêtes lentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.slow_queries_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Erreurs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.database_errors_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taille totale</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_size_gb} GB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques et détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Erreurs par sévérité</h3>
          <div className="space-y-2">
            {Object.entries(stats.errors_by_severity || {}).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{severity}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top requêtes lentes</h3>
          <div className="space-y-2">
            {stats.top_slow_queries?.slice(0, 5).map((query, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate max-w-xs">{query.query}</span>
                <span className="text-sm font-medium text-gray-900">{query.time}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de détails
export const DatabaseDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: string;
}> = ({ isOpen, onClose, data, type }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Détails {type}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="border-b border-gray-200 pb-2">
              <dt className="text-sm font-medium text-gray-600 capitalize">
                {key.replace(/_/g, ' ')}
              </dt>
              <dd className="text-sm text-gray-900 mt-1">
                {typeof value === 'object' ? (
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  String(value)
                )}
              </dd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
