import { useState, useEffect } from 'react';
import { X, Save, Loader2, Mail, Clock, Settings } from 'lucide-react';
import { userWorkflowService, UserWorkflowConfig } from '../services/userWorkflowService';
import { templateService } from '../services/templateService';
import { useAuth } from '../contexts/AuthContext';

interface CreateAutomationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAutomationModal({ onClose, onSuccess }: CreateAutomationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    templateId: '',
    name: '',
    description: '',
    email: '',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    schedule: '09:00',
    userPreferences: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const visibleTemplates = await templateService.getVisibleTemplates();
      setTemplates(visibleTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTemplate) return;

    setLoading(true);
    setError(null);

    try {
      const config: UserWorkflowConfig = {
        templateId: formData.templateId,
        name: formData.name,
        description: formData.description,
        email: formData.email,
        imapHost: formData.imapHost,
        imapPort: formData.imapPort,
        imapUser: formData.imapUser,
        imapPassword: formData.imapPassword,
        schedule: formData.schedule,
        userPreferences: formData.userPreferences
      };

      await userWorkflowService.createUserWorkflow(config, user.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create automation');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      name: template.name || '',
      description: template.description || ''
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-slate-900">Create New Automation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Choose Template
            </label>
            <div className="grid gap-3 max-h-40 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-slate-500" />
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-slate-600">{template.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Automation Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="My Email Analysis"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Schedule Time
                  </label>
                  <input
                    type="time"
                    value={formData.schedule}
                    onChange={(e) => handleChange('schedule', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Describe what this automation does..."
                  rows={2}
                />
              </div>

              {/* Email Configuration */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Configuration</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="your-email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      IMAP Server
                    </label>
                    <input
                      type="text"
                      value={formData.imapHost}
                      onChange={(e) => handleChange('imapHost', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="imap.gmail.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      IMAP Username
                    </label>
                    <input
                      type="text"
                      value={formData.imapUser}
                      onChange={(e) => handleChange('imapUser', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="your-email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      IMAP Password
                    </label>
                    <input
                      type="password"
                      value={formData.imapPassword}
                      onChange={(e) => handleChange('imapPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Your email password or app password"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* User Preferences */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Analysis Preferences (Optional)
                </label>
                <textarea
                  value={formData.userPreferences}
                  onChange={(e) => handleChange('userPreferences', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Describe your email analysis preferences..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Automation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
