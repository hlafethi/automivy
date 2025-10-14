import { useState } from 'react';
import { Library, Activity, Plus } from 'lucide-react';
import { TemplateCatalog } from './TemplateCatalog';
import { MyAutomations } from './MyAutomations';
import { UserAutomations } from './UserAutomations';
import SmartDeployModal from './SmartDeployModal';
import { SmartDeployTest } from './SmartDeployTest';

export function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'automations'>('catalog');
  const [showSmartDeploy, setShowSmartDeploy] = useState(false);

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
      
      {/* Test Smart Deploy */}
      <div className="mt-8">
        <SmartDeployTest />
      </div>
      
      {/* Bouton de déploiement intelligent */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            console.log('🔧 [UserDashboard] Bouton SmartDeploy cliqué');
            setShowSmartDeploy(true);
          }}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
          title="Déployer un workflow intelligent"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modal de déploiement intelligent */}
      <SmartDeployModal
        isOpen={showSmartDeploy}
        onClose={() => setShowSmartDeploy(false)}
        onSuccess={(workflow) => {
          console.log('Workflow déployé avec succès:', workflow);
          // Rafraîchir la liste des automations si nécessaire
          setActiveTab('automations');
        }}
      />
    </div>
  );
}
