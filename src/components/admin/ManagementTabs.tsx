import React from 'react';
import { BarChart3, Ticket, Users2, UserCheck, Bell, Database, Activity, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface ManagementTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function ManagementTabs({ activeTab, setActiveTab }: ManagementTabsProps) {
  const managementTabs = [
    { id: 'analytics', name: 'Analytics', icon: BarChart3, color: 'bg-blue-50 text-blue-700 border-blue-600' },
    { id: 'tickets', name: 'Tickets', icon: Ticket, color: 'bg-orange-50 text-orange-700 border-orange-600' },
    { id: 'community', name: 'Communauté', icon: Users2, color: 'bg-purple-50 text-purple-700 border-purple-600' },
    { id: 'users', name: 'Utilisateurs', icon: UserCheck, color: 'bg-green-50 text-green-700 border-green-600' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'bg-pink-50 text-pink-700 border-pink-600' },
    { id: 'database', name: 'Base de données', icon: Database, color: 'bg-slate-50 text-slate-700 border-slate-600' },
    { id: 'activity', name: 'Activité', icon: Activity, color: 'bg-yellow-50 text-yellow-700 border-yellow-600' },
    { id: 'alerts', name: 'Alertes', icon: AlertTriangle, color: 'bg-red-50 text-red-700 border-red-600' },
    { id: 'performance', name: 'Performance', icon: TrendingUp, color: 'bg-teal-50 text-teal-700 border-teal-600' },
    { id: 'logs', name: 'Logs', icon: Clock, color: 'bg-gray-50 text-gray-700 border-gray-600' },
  ];

  return (
    <div className="flex border-t border-slate-200">
      {managementTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const activeClasses = isActive ? tab.color : 'text-slate-600 hover:bg-slate-50';

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
              isActive
                ? `${tab.color} border-b-2`
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}
