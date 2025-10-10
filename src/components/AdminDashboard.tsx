import { useState } from 'react';
import { Upload, Sparkles, List, Key, Activity } from 'lucide-react';
import { TemplateUpload } from './TemplateUpload';
import { AIWorkflowGenerator } from './AIWorkflowGenerator';
import { TemplateList } from './TemplateList';
import { ApiKeysManager } from './ApiKeysManager';
import { AllWorkflows } from './AllWorkflows';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'ai' | 'apikeys' | 'workflows'>('list');

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
          <div className="flex">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'list'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="w-5 h-5" />
              All Templates
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'upload'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload Template
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'ai'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              AI Generator
            </button>
            <button
              onClick={() => setActiveTab('apikeys')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'apikeys'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Key className="w-5 h-5" />
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'workflows'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-5 h-5" />
              All Workflows
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'list' && <TemplateList />}
          {activeTab === 'upload' && <TemplateUpload />}
          {activeTab === 'ai' && <AIWorkflowGenerator />}
          {activeTab === 'apikeys' && <ApiKeysManager />}
          {activeTab === 'workflows' && <AllWorkflows />}
        </div>
      </div>
    </div>
  );
}
