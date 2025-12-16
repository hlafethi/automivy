export interface CredentialRequirement {
  type: 'oauth' | 'api_key' | 'email';
  provider: string;
  displayName: string;
  description: string;
  credentialIds: string[];
}

export interface DetectedCredentials {
  oauth: CredentialRequirement[];
  apiKeys: CredentialRequirement[];
  email: CredentialRequirement[];
}

class CredentialDetectionService {
  detectCredentials(workflowJson: any): DetectedCredentials {
    const jsonString = JSON.stringify(workflowJson);
    const oauth: CredentialRequirement[] = [];
    const apiKeys: CredentialRequirement[] = [];
    const email: CredentialRequirement[] = [];
    const seenProviders = new Set<string>();

    const nodes = workflowJson.nodes || [];

    for (const node of nodes) {
      if (!node.credentials) continue;

      for (const [credType, credInfo] of Object.entries(node.credentials)) {
        const credData = credInfo as any;

        if (credType === 'gmailOAuth2' && !seenProviders.has('gmail')) {
          seenProviders.add('gmail');
          oauth.push({
            type: 'oauth',
            provider: 'gmail',
            displayName: 'Gmail',
            description: 'Connect your Gmail account',
            credentialIds: [credData.id],
          });
        }

        if (credType === 'googleSheetsOAuth2Api' && !seenProviders.has('google_sheets')) {
          seenProviders.add('google_sheets');
          oauth.push({
            type: 'oauth',
            provider: 'google_sheets',
            displayName: 'Google Sheets',
            description: 'Connect your Google Sheets account',
            credentialIds: [credData.id],
          });
        }

        if ((credType === 'googleDriveOAuth2' || credType === 'googleDriveOAuth2Api') && !seenProviders.has('google_drive')) {
          seenProviders.add('google_drive');
          oauth.push({
            type: 'oauth',
            provider: 'google_drive',
            displayName: 'Google Drive',
            description: 'Connect your Google Drive account',
            credentialIds: [credData.id],
          });
        }

        if (credType === 'microsoftOutlookOAuth2Api' && !seenProviders.has('microsoft_outlook')) {
          seenProviders.add('microsoft_outlook');
          oauth.push({
            type: 'oauth',
            provider: 'microsoft_outlook',
            displayName: 'Microsoft Outlook',
            description: 'Connect your Microsoft Outlook account',
            credentialIds: [credData.id],
          });
        }

        if (credType === 'openRouterApi' && !seenProviders.has('openrouter')) {
          seenProviders.add('openrouter');
          const existingKey = apiKeys.find(k => k.provider === 'openrouter');
          if (existingKey) {
            existingKey.credentialIds.push(credData.id);
          } else {
            apiKeys.push({
              type: 'api_key',
              provider: 'openrouter',
              displayName: 'OpenRouter API',
              description: 'Enter your OpenRouter API key',
              credentialIds: [credData.id],
            });
          }
        }

        if (credType === 'openAiApi' && !seenProviders.has('openai')) {
          seenProviders.add('openai');
          const existingKey = apiKeys.find(k => k.provider === 'openai');
          if (existingKey) {
            existingKey.credentialIds.push(credData.id);
          } else {
            apiKeys.push({
              type: 'api_key',
              provider: 'openai',
              displayName: 'OpenAI API',
              description: 'Enter your OpenAI API key (or OpenRouter)',
              credentialIds: [credData.id],
            });
          }
        }

        if (credType === 'imap' && !seenProviders.has('imap')) {
          seenProviders.add('imap');
          email.push({
            type: 'email',
            provider: 'imap',
            displayName: 'Email (IMAP)',
            description: 'Configure your email IMAP/SMTP settings',
            credentialIds: [credData.id],
          });
        }
      }
    }


    if (jsonString.includes('n8n-nodes-base.anthropic') && !seenProviders.has('anthropic')) {
      seenProviders.add('anthropic');
      apiKeys.push({
        type: 'api_key',
        provider: 'anthropic',
        displayName: 'Anthropic API',
        description: 'Enter your Anthropic API key',
        credentialIds: [],
      });
    }

    return { oauth, apiKeys, email };
  }

  replaceCredentialIds(
    workflowJson: any,
    credentialMapping: Record<string, string>
  ): any {
    const workflowCopy = JSON.parse(JSON.stringify(workflowJson));

    if (!workflowCopy.nodes) return workflowCopy;

    for (const node of workflowCopy.nodes) {
      if (!node.credentials) continue;

      for (const [, credInfo] of Object.entries(node.credentials)) {
        const credData = credInfo as any;
        const oldId = credData.id;

        if (credentialMapping[oldId]) {
          credData.id = credentialMapping[oldId];
        }
      }
    }

    return workflowCopy;
  }
}

export const credentialDetectionService = new CredentialDetectionService();
