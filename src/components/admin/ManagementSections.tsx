import React from 'react';
import { BarChart3, Ticket, Users2, UserCheck, Bell, Database, Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

// Composant pour la section Analytics
export function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <BarChart3 className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Analytics en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section affichera les statistiques d'utilisation, les métriques de performance et les insights sur l'utilisation de la plateforme.
          </p>
        </div>
      </div>
    </div>
  );
}

// Composant pour la section Tickets
export function TicketsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="w-8 h-8 text-orange-600" />
        <h3 className="text-xl font-semibold text-slate-900">Gestion des tickets</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <Ticket className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Système de tickets en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section permettra de gérer les demandes de support, les bugs et les demandes d'amélioration.
          </p>
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
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="w-8 h-8 text-green-600" />
        <h3 className="text-xl font-semibold text-slate-900">Gestion des utilisateurs</h3>
      </div>
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="text-slate-500 mb-4">
          <UserCheck className="w-16 h-16 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-slate-700">Gestion des utilisateurs en cours de développement</h4>
          <p className="text-sm text-slate-500 mt-2">
            Cette section permettra de gérer les utilisateurs, leurs rôles, permissions et statistiques.
          </p>
        </div>
      </div>
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
