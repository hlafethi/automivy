import { useState, useEffect } from 'react';
import { X, Rocket, Loader2, Link as LinkIcon, Key, Mail } from 'lucide-react';
import { Template } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { credentialDetectionService, CredentialRequirement } from '../services/credentialDetectionService';
import { templateParserService, WorkflowTemplate } from '../services/templateParserService';
import { DynamicTemplateForm } from './DynamicTemplateForm';
import { workflowService, oauthService, emailCredentialService, apiKeyService } from '../services';
import { n8nService } from '../services/n8nService';

interface Props {
  template: Template;
  onClose: () => void;
  onSuccess: () => void;
}

export function WorkflowDeployModal({ template, onClose, onSuccess }: Props) {
  console.log('WorkflowDeployModal RENDERED with template:', template.name);

  const { user } = useAuth();
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthRequirements, setOauthRequirements] = useState<CredentialRequirement[]>([]);
  const [apiKeyRequirements, setApiKeyRequirements] = useState<CredentialRequirement[]>([]);
  const [emailRequirements, setEmailRequirements] = useState<CredentialRequirement[]>([]);
  const [oauthConnected, setOauthConnected] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [emailCredentials, setEmailCredentials] = useState<Partial<EmailCredentialData>>({
    imap_port: 993,
    smtp_port: 587,
    smtp_secure: true,
  });
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [parsedTemplate, setParsedTemplate] = useState<WorkflowTemplate | null>(null);
  const [useDynamicForm, setUseDynamicForm] = useState(false);

  interface DetectedParam {
    key: string;
    type: 'email' | 'schedule' | 'text';
    description: string;
    placeholder: string;
    defaultValue?: string;
  }

  useEffect(() => {
    const checkCredentialRequirements = async () => {
      console.log('WorkflowDeployModal useEffect triggered, template.json type:', typeof template.json);
      console.log('WorkflowDeployModal template.json keys:', Object.keys(template.json || {}));

      try {
        console.log('About to stringify/parse template.json...');
        const templateJson = typeof template.json === 'string'
          ? template.json
          : JSON.stringify(template.json);
        console.log('Template stringified successfully, length:', templateJson.length);
        console.log('Calling parseTemplate...');
        const parsed = templateParserService.parseTemplate(templateJson);
        console.log('Template parsed successfully:', parsed);
        setParsedTemplate(parsed);
        setUseDynamicForm(true);

        const detected = credentialDetectionService.detectCredentials(parsed.workflowDefinition);
        setOauthRequirements(detected.oauth);
        setApiKeyRequirements(detected.apiKeys);
        setEmailRequirements(detected.email);

        // Vérifier les connexions OAuth
        for (const req of detected.oauth) {
          const hasValid = await oauthService.hasValidCredentials(req.provider);
          setOauthConnected(prev => ({ ...prev, [req.provider]: hasValid }));
        }

        // Vérifier les credentials email
        if (detected.email.length > 0) {
          const hasEmail = await emailCredentialService.hasEmailCredentials();
          setEmailConfigured(hasEmail);
        }

        // Charger les clés API
        const adminApiKeys = await apiKeyService.getActiveApiKeys();
        const keysToLoad: Record<string, string> = {};
        for (const req of detected.apiKeys) {
          if (adminApiKeys[req.provider]) {
            keysToLoad[req.provider] = adminApiKeys[req.provider];
          } else if (req.provider === 'openai' && adminApiKeys['openrouter']) {
            keysToLoad['openrouter'] = adminApiKeys['openrouter'];
          }
        }
        setApiKeys(keysToLoad);
      } catch (err) {
        console.error('CAUGHT ERROR in WorkflowDeployModal:', err);
        const detected = credentialDetectionService.detectCredentials(template.json);

        setOauthRequirements(detected.oauth);
        setApiKeyRequirements(detected.apiKeys);
        setEmailRequirements(detected.email);

        // Vérifier les connexions OAuth
        for (const req of detected.oauth) {
          const hasValid = await oauthService.hasValidCredentials(req.provider);
          setOauthConnected(prev => ({ ...prev, [req.provider]: hasValid }));
        }

        // Vérifier les credentials email
        if (detected.email.length > 0) {
          const hasEmail = await emailCredentialService.hasEmailCredentials();
          setEmailConfigured(hasEmail);
        }
      }
    };

    checkCredentialRequirements();
  }, [template]);

  // Listen for OAuth success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth_success') {
        setOauthConnected(prev => ({ ...prev, [event.data.provider]: true }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const extractParams = (): DetectedParam[] => {
    const jsonString = JSON.stringify(template.json);
    const detectedParams: DetectedParam[] = [];
    const seenKeys = new Set<string>();

    // 1. Extract {{placeholder}} patterns
    const placeholderMatches = jsonString.match(/\{\{(\w+)\}\}/g);
    if (placeholderMatches) {
      placeholderMatches.forEach(m => {
        const param = m.replace(/[{}]/g, '');
        const reservedKeys = [
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'GOOGLE_API_KEY',
          'DEEPSEEK_API_KEY',
          'OPENROUTER_API_KEY',
          'HUGGINGFACE_API_KEY',
          'MISTRAL_API_KEY',
          'COHERE_API_KEY',
        ];
        if (!reservedKeys.includes(param) && !seenKeys.has(param)) {
          seenKeys.add(param);

          const isEmail = param.toLowerCase().includes('email') || param.toLowerCase().includes('mail');
          const isSchedule = param.toLowerCase().includes('schedule') || param.toLowerCase().includes('interval');

          detectedParams.push({
            key: param,
            type: isEmail ? 'email' : isSchedule ? 'schedule' : 'text',
            description: isEmail ? 'Your Gmail address to monitor' : isSchedule ? 'How often to check for new emails' : '',
            placeholder: isEmail ? 'your.email@example.com' : isSchedule ? 'Every 5 minutes' : `Enter ${param.toLowerCase()}`,
          });
        }
      });
    }

    // 2. Auto-detect hardcoded email addresses (suggest as configurable)
    const emailMatches = jsonString.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches && emailMatches.length > 0) {
      const uniqueEmails = Array.from(new Set(emailMatches));
      if (uniqueEmails.length === 1 && !seenKeys.has('USER_EMAIL')) {
        seenKeys.add('USER_EMAIL');
        detectedParams.push({
          key: 'USER_EMAIL',
          type: 'email',
          description: 'Your Gmail address to monitor',
          placeholder: 'your.email@example.com',
          defaultValue: uniqueEmails[0], // Store the original value to replace
        });
      }
    }

    // 3. Auto-detect poll schedule (in Gmail Trigger node)
    const pollTimeMatch = jsonString.match(/"pollTimes":\s*\{[^}]*"mode":\s*"([^"]+)"/);
    if (pollTimeMatch && !seenKeys.has('CHECK_INTERVAL')) {
      const currentMode = pollTimeMatch[1];
      seenKeys.add('CHECK_INTERVAL');
      detectedParams.push({
        key: 'CHECK_INTERVAL',
        type: 'schedule',
        description: 'How often to check for new emails',
        placeholder: 'Select interval',
        defaultValue: currentMode, // Store current value
      });
    }

    return detectedParams;
  };

  const detectedParams = extractParams();
  // const paramKeys = detectedParams.map(p => p.key);

  const handleConnectOAuth = async (provider: string) => {
    try {
      await oauthService.startOAuthFlow(provider);
      setOauthConnected(prev => ({ ...prev, [provider]: true }));
    } catch (err: any) {
      setError(err.message || `Failed to connect ${provider}`);
    }
  };

  const handleSaveEmailCredentials = async () => {
    if (!emailCredentials.email_address || !emailCredentials.imap_host ||
        !emailCredentials.imap_user || !emailCredentials.imap_password) {
      setError('Please fill in all required email fields');
      return;
    }

    try {
      await emailCredentialService.createOrUpdateEmailCredential(emailCredentials as EmailCredentialData);
      setEmailConfigured(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save email credentials');
    }
  };

  const handleDeployImmediately = async () => {
    if (!user || !parsedTemplate) return;

    setLoading(true);
    setError('');

    try {
      // Créer des valeurs par défaut pour le déploiement immédiat
      const defaultValues: Record<string, any> = {};
      
      // Remplir avec des valeurs par défaut basées sur le type d'input
      for (const input of parsedTemplate.userInputs) {
        switch (input.type) {
          case 'email':
            defaultValues[input.key] = 'user@heleam.com';
            break;
          case 'password':
            defaultValues[input.key] = 'defaultPassword123';
            break;
          case 'text':
            defaultValues[input.key] = `Default ${input.label}`;
            break;
          default:
            defaultValues[input.key] = `Default ${input.label}`;
        }
      }

      console.log('Déploiement immédiat avec valeurs par défaut:', defaultValues);

      const processedWorkflow = await templateParserService.createWorkflowFromTemplate(
        parsedTemplate,
        defaultValues
      );

      console.log('Déploiement sur n8n...');
      
      // Générer un nom descriptif pour le workflow
      const workflowName = n8nService.buildWorkflowName(
        template.name,
        user.id,
        defaultValues.USER_EMAIL || user.email
      );
      
      // Ajouter le nom au workflow
      const workflowWithName = {
        ...processedWorkflow,
        name: workflowName
      };
      
      // Déployer sur n8n
      const n8nWorkflow = await n8nService.createWorkflow(workflowWithName);
      console.log('Workflow créé sur n8n:', n8nWorkflow);

      // Sauvegarder en base de données
      await workflowService.createWorkflow(
        workflowName,
        template.description || 'Workflow déployé automatiquement',
        processedWorkflow,
        n8nWorkflow.id,
        template.id
      );
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to deploy workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicFormSubmit = async (userInputValues: Record<string, any>) => {
    if (!user || !parsedTemplate) return;

    setLoading(true);
    setError('');

    try {
      const processedWorkflow = await templateParserService.createWorkflowFromTemplate(
        parsedTemplate,
        userInputValues
      );

      // Générer un nom descriptif pour le workflow
      const workflowName = n8nService.buildWorkflowName(
        template.name,
        user.id,
        userInputValues.USER_EMAIL || user.email
      );
      
      // Ajouter le nom au workflow
      const workflowWithName = {
        ...processedWorkflow,
        name: workflowName
      };
      
      // Déployer sur n8n
      const n8nWorkflow = await n8nService.createWorkflow(workflowWithName);
      console.log('Workflow créé sur n8n:', n8nWorkflow);

      // Sauvegarder en base de données
      await workflowService.createWorkflow(
        workflowName,
        template.description || 'Workflow déployé avec formulaire',
        processedWorkflow,
        n8nWorkflow.id,
        template.id
      );
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to deploy workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!user) return;

    const missingOAuth = oauthRequirements.filter(req => !oauthConnected[req.provider]);
    if (missingOAuth.length > 0) {
      setError(`Please connect: ${missingOAuth.map(r => r.displayName).join(', ')}`);
      return;
    }

    const missingApiKeys = apiKeyRequirements.filter(req => !apiKeys[req.provider]);
    if (missingApiKeys.length > 0) {
      setError(`Please provide API keys for: ${missingApiKeys.map(r => r.displayName).join(', ')}`);
      return;
    }

    if (emailRequirements.length > 0 && !emailConfigured) {
      setError('Please configure your email credentials');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const processedWorkflow = await templateParserService.createWorkflowFromTemplate(
        parsedTemplate,
        {}
      );

      const n8nWorkflow = await n8nService.createWorkflow(processedWorkflow);
      
      await workflowService.createWorkflow(
        template.name,
        template.description,
        processedWorkflow,
        n8nWorkflow.id
      );

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to deploy workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Deploy Workflow</h3>
            <p className="text-sm text-slate-600 mt-1">{template.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {useDynamicForm && parsedTemplate ? (
            <>
              <p className="text-sm text-slate-600 mb-4">
                {parsedTemplate.templateMetadata.description}
              </p>
              <DynamicTemplateForm
                userInputs={parsedTemplate.userInputs}
                onSubmit={handleDynamicFormSubmit}
                onCancel={onClose}
                loading={loading}
              />
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          ) : (
          <>
          {oauthRequirements.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Connect Required Services:
              </p>
              {oauthRequirements.map(req => (
                <div key={req.provider} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {req.displayName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {req.description}
                      </div>
                    </div>
                  </div>
                  {oauthConnected[req.provider] ? (
                    <span className="text-xs text-green-600 font-medium">✓ Connected</span>
                  ) : (
                    <button
                      onClick={() => handleConnectOAuth(req.provider)}
                      className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {apiKeyRequirements.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                API Keys Required:
              </p>
              {apiKeyRequirements.map(req => (
                <div key={req.provider} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-500" />
                    <label className="text-sm font-medium text-slate-700">
                      {req.displayName}
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">{req.description}</p>
                  <input
                    type="password"
                    value={apiKeys[req.provider] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [req.provider]: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder={`Enter ${req.displayName} key`}
                  />
                </div>
              ))}
            </div>
          )}

          {emailRequirements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">
                    Email Configuration (IMAP/SMTP)
                  </p>
                </div>
                {emailConfigured && (
                  <span className="text-xs text-green-600 font-medium">✓ Configured</span>
                )}
              </div>

              {!emailConfigured && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={emailCredentials.email_address || ''}
                        onChange={(e) => setEmailCredentials({ ...emailCredentials, email_address: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="direction@hla-holding.fr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        IMAP Host *
                      </label>
                      <input
                        type="text"
                        value={emailCredentials.imap_host || ''}
                        onChange={(e) => setEmailCredentials({ ...emailCredentials, imap_host: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="imap.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        IMAP Port *
                      </label>
                      <input
                        type="number"
                        value={emailCredentials.imap_port || 993}
                        onChange={(e) => setEmailCredentials({ ...emailCredentials, imap_port: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        IMAP Username *
                      </label>
                      <input
                        type="text"
                        value={emailCredentials.imap_user || ''}
                        onChange={(e) => setEmailCredentials({ ...emailCredentials, imap_user: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Usually your email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        IMAP Password *
                      </label>
                      <input
                        type="password"
                        value={emailCredentials.imap_password || ''}
                        onChange={(e) => setEmailCredentials({ ...emailCredentials, imap_password: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">SMTP (Optional - for sending emails)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={emailCredentials.smtp_host || ''}
                          onChange={(e) => setEmailCredentials({ ...emailCredentials, smtp_host: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          value={emailCredentials.smtp_port || 587}
                          onChange={(e) => setEmailCredentials({ ...emailCredentials, smtp_port: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveEmailCredentials}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Save Email Configuration
                  </button>
                </div>
              )}
            </div>
          )}

          {detectedParams.length > 0 && (
            <>
              <p className="text-sm text-slate-600">
                Configure the following parameters for your workflow:
              </p>
              {detectedParams.map((param) => {
                const formatLabel = (str: string) => {
                  return str
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ')
                    .trim();
                };

                return (
                  <div key={param.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {formatLabel(param.key)}
                    </label>
                    {param.description && (
                      <p className="text-xs text-slate-500 mb-2">{param.description}</p>
                    )}

                    {param.type === 'schedule' ? (
                      <select
                        value={params[param.key] || param.defaultValue || ''}
                        onChange={(e) => setParams({ ...params, [param.key]: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      >
                        <option value="">Select interval</option>
                        <option value="everyMinute">Every minute</option>
                        <option value="every5Minutes">Every 5 minutes</option>
                        <option value="every10Minutes">Every 10 minutes</option>
                        <option value="every15Minutes">Every 15 minutes</option>
                        <option value="every30Minutes">Every 30 minutes</option>
                        <option value="everyHour">Every hour</option>
                      </select>
                    ) : (
                      <input
                        type={param.type === 'email' ? 'email' : 'text'}
                        value={params[param.key] || ''}
                        onChange={(e) => setParams({ ...params, [param.key]: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder={param.placeholder}
                      />
                    )}
                  </div>
                );
              })}
            </>
          )}

          {detectedParams.length === 0 && oauthRequirements.length === 0 && apiKeyRequirements.length === 0 && emailRequirements.length === 0 && (
            <p className="text-sm text-slate-600">
              This workflow has no configurable parameters.
            </p>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          </>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDeployImmediately}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Deploy Now (Default) 🚀
                </>
              )}
            </button>
            
            <button
              onClick={handleDeploy}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Deploy with Form
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
