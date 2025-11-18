import { useState } from 'react';
import { Upload, Sparkles, List, Key, Activity, Globe } from 'lucide-react';
import { TemplateUpload } from './TemplateUpload';
import { AIWorkflowGenerator } from './AIWorkflowGenerator';
import { TemplateList } from './TemplateList';
import { ApiKeysManager } from './ApiKeysManager';
import { AllWorkflows } from './AllWorkflows';
import { ManagementTabs } from './admin/ManagementTabs';
import { 
  AnalyticsSection, 
  TicketsSection, 
  CommunitySection, 
  UsersSection, 
  DatabaseSection, 
  ActivitySection, 
  AlertsSection, 
  NotificationSection,
  LogsSection 
} from './admin/ManagementSections';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'ai' | 'apikeys' | 'workflows' | 'landing' | 'analytics' | 'tickets' | 'community' | 'users' | 'database' | 'activity' | 'alerts' | 'notifications' | 'logs'>('list');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="text-slate-600 mt-1">
          Manage workflow templates and generate new automations
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200">
          {/* Première ligne - Sections principales */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'list'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'list' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <List className="w-5 h-5" />
              All Templates
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'upload'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'upload' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <Upload className="w-5 h-5" />
              Upload Template
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'ai'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'ai' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <Sparkles className="w-5 h-5" />
              AI Generator
            </button>
            <button
              onClick={() => setActiveTab('apikeys')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'apikeys'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'apikeys' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <Key className="w-5 h-5" />
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'workflows'
                  ? 'border-b-2'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={activeTab === 'workflows' ? {
                backgroundColor: '#e0f4f6',
                color: '#046f78',
                borderBottomColor: '#046f78'
              } : {}}
            >
              <Activity className="w-5 h-5" />
              All Workflows
            </button>
            <button
              onClick={() => window.location.href = '/admin/landing'}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition text-slate-600 hover:bg-slate-50"
            >
              <Globe className="w-5 h-5" />
              Landing Page
            </button>
          </div>
          
          {/* Deuxième ligne - Sections de gestion */}
          <ManagementTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="p-6">
          {activeTab === 'list' && <TemplateList />}
          {activeTab === 'upload' && <TemplateUpload />}
          {activeTab === 'ai' && <AIWorkflowGenerator />}
          {activeTab === 'apikeys' && <ApiKeysManager />}
          {activeTab === 'workflows' && <AllWorkflows />}
          
          {/* Nouvelles sections de gestion */}
          {activeTab === 'analytics' && <AnalyticsSection />}
          {activeTab === 'tickets' && <TicketsSection />}
          {activeTab === 'community' && <CommunitySection />}
          {activeTab === 'users' && <UsersSection />}
          {activeTab === 'database' && <DatabaseSection />}
          {activeTab === 'activity' && <ActivitySection />}
          {activeTab === 'alerts' && <AlertsSection />}
          {activeTab === 'notifications' && <NotificationSection />}
          {activeTab === 'logs' && <LogsSection />}
        </div>
      </div>
    </div>
  );
}
