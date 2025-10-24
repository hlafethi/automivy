import React, { useState, useEffect } from 'react';
import { Mail, Save, TestTube, CheckCircle, AlertCircle, Settings, Bell, Send } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface NotificationSettings {
  smtp: SMTPConfig;
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    webhook_enabled: boolean;
    webhook_url: string;
  };
}

export const NotificationSettingsView: React.FC = () => {
  const [config, setConfig] = useState<NotificationSettings>({
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
      from: ''
    },
    notifications: {
      email_enabled: true,
      push_enabled: false,
      webhook_enabled: false,
      webhook_url: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await notificationService.getAdminSettings();
      console.log('🔍 Paramètres chargés:', settings);
      
      if (settings && settings.value) {
        setConfig({
          smtp: {
            host: settings.value.smtp_host || '',
            port: settings.value.smtp_port || 587,
            secure: settings.value.smtp_port === 465,
            user: settings.value.smtp_user || '',
            password: settings.value.smtp_pass || '',
            from: settings.value.smtp_user || ''
          },
          notifications: {
            email_enabled: settings.value.email_enabled || false,
            push_enabled: settings.value.push_enabled || false,
            webhook_enabled: settings.value.webhook_enabled || false,
            webhook_url: ''
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const settingsData = {
        smtp_host: config.smtp.host,
        smtp_port: config.smtp.port,
        smtp_user: config.smtp.user,
        smtp_pass: config.smtp.password,
        email_enabled: config.notifications.email_enabled,
        push_enabled: config.notifications.push_enabled,
        webhook_enabled: config.notifications.webhook_enabled,
        retry_attempts: 3,
        retry_delay: 5000
      };
      
      await notificationService.updateAdminSettings(settingsData);
      console.log('✅ Paramètres sauvegardés:', settingsData);
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      const result = await notificationService.testSmtpConnection();
      setTestResult(result);
    } catch (error) {
      console.error('Erreur lors du test SMTP:', error);
      setTestResult({
        success: false,
        message: 'Erreur lors du test SMTP'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Configuration des Notifications</h3>
          <p className="text-sm text-slate-600">Configurez l'envoi d'emails et les notifications</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Configuration SMTP */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-slate-900">Configuration SMTP</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Serveur SMTP</label>
              <input
                type="text"
                value={config.smtp.host}
                onChange={(e) => setConfig({
                  ...config,
                  smtp: { ...config.smtp, host: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="smtp.gmail.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
              <input
                type="number"
                value={config.smtp.port}
                onChange={(e) => setConfig({
                  ...config,
                  smtp: { ...config.smtp, port: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Utilisateur</label>
              <input
                type="email"
                value={config.smtp.user}
                onChange={(e) => setConfig({
                  ...config,
                  smtp: { ...config.smtp, user: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@heleam.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
              <input
                type="password"
                value={config.smtp.password}
                onChange={(e) => setConfig({
                  ...config,
                  smtp: { ...config.smtp, password: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Email expéditeur</label>
              <input
                type="email"
                value={config.smtp.from}
                onChange={(e) => setConfig({
                  ...config,
                  smtp: { ...config.smtp, from: e.target.value }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="noreply@heleam.com"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleTestSMTP}
              disabled={testing || !config.smtp.host || !config.smtp.user}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {testing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              {testing ? 'Test en cours...' : 'Tester SMTP'}
            </button>
            
            {testResult && (
              <div className={`flex items-center gap-2 ${
                testResult.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Types de notifications */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-slate-900">Types de Notifications</h4>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.notifications.email_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  notifications: { ...config.notifications, email_enabled: e.target.checked }
                })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Notifications par email</span>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.notifications.push_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  notifications: { ...config.notifications, push_enabled: e.target.checked }
                })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Bell className="w-4 h-4 text-slate-500" />
              <span>Notifications push (navigateur)</span>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.notifications.webhook_enabled}
                onChange={(e) => setConfig({
                  ...config,
                  notifications: { ...config.notifications, webhook_enabled: e.target.checked }
                })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Send className="w-4 h-4 text-slate-500" />
              <span>Webhooks (intégrations externes)</span>
            </label>
            
            {config.notifications.webhook_enabled && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-slate-700 mb-2">URL Webhook</label>
                <input
                  type="url"
                  value={config.notifications.webhook_url}
                  onChange={(e) => setConfig({
                    ...config,
                    notifications: { ...config.notifications, webhook_url: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
