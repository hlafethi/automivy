import { useState } from 'react';
import { Library, Activity } from 'lucide-react';
import { TemplateCatalog } from './TemplateCatalog';
import { MyAutomations } from './MyAutomations';
import { UserAutomations } from './UserAutomations';

export function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'automations'>('catalog');

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
              activeTab === 'catalog'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Library className="w-5 h-5" />
            Template Catalog
          </button>
          <button
            onClick={() => setActiveTab('automations')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
              activeTab === 'automations'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-5 h-5" />
            My Automations
          </button>
        </div>
      </div>

      {activeTab === 'catalog' ? <TemplateCatalog /> : <UserAutomations />}
    </div>
  );
}
