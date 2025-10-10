// import { db } from '../lib/database'; // TODO: Utiliser quand nécessaire
import { ApiKeyService } from './apiKeyService';

export interface UserInput {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'slider' | 'time';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  conditionalDisplay?: {
    dependsOn: string;
    values: string[];
  };
}

export interface AdminCredential {
  key: string;
  type: string;
  description: string;
  requiredFields: string[];
}

export interface ReplacementRule {
  placeholder: string;
  source: 'userInput' | 'adminCredential' | 'generated' | 'context';
  key: string;
  transform?: string;
  validation?: string;
}

export interface WorkflowTemplate {
  templateMetadata: {
    name: string;
    description: string;
    category: string;
    author: string;
    version: string;
    tags: string[];
  };
  userInputs: UserInput[];
  adminCredentials: AdminCredential[];
  workflowDefinition: any;
  replacementRules: ReplacementRule[];
}

export const templateParserService = {
  parseTemplate(templateJson: string): WorkflowTemplate {
    console.log('parseTemplate called with:', {
      isString: typeof templateJson === 'string',
      length: templateJson?.length,
      preview: templateJson?.substring(0, 200)
    });

    try {
      const template = JSON.parse(templateJson);

      console.log('JSON parsed, checking fields:', {
        hasMetadata: !!template.templateMetadata,
        hasUserInputs: !!template.userInputs,
        hasWorkflowDef: !!template.workflowDefinition,
        hasN8nFormat: !!(template.nodes && template.connections),
        topLevelKeys: Object.keys(template)
      });

      // Format Automivy (nouveau format)
      if (template.templateMetadata && template.userInputs && template.workflowDefinition) {
        console.log('Detected Automivy format');
        return template as WorkflowTemplate;
      }

      // Format n8n direct (ancien format)
      if (template.nodes && template.connections) {
        console.log('Detected n8n direct format, converting...');
        return {
          templateMetadata: {
            name: template.name || 'Untitled Template',
            description: template.description || '',
            version: '1.0.0',
            author: 'System',
            category: 'General'
          },
          userInputs: this.extractUserInputsFromN8n(template),
          workflowDefinition: {
            nodes: template.nodes,
            connections: template.connections,
            settings: template.settings || {},
            active: template.active || false
          },
          replacementRules: this.extractReplacementRulesFromN8n(template)
        } as WorkflowTemplate;
      }

      throw new Error('Invalid template format: missing required fields');
    } catch (error) {
      throw new Error(`Failed to parse template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  extractUserInputsFromN8n(n8nTemplate: any): UserInput[] {
    const userInputs: UserInput[] = [];
    
    // Chercher les nodes qui ont des paramètres utilisateur
    n8nTemplate.nodes?.forEach((node: any) => {
      if (node.parameters) {
        Object.entries(node.parameters).forEach(([key, value]) => {
          if (typeof value === 'string' && value.includes('{{$json.USER_')) {
            const inputName = value.match(/\{\{\$json\.USER_([^}]+)\}\}/)?.[1];
            if (inputName && !userInputs.find(input => input.name === inputName)) {
              userInputs.push({
                name: inputName,
                label: inputName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'text',
                required: true,
                placeholder: `Enter ${inputName.replace(/_/g, ' ').toLowerCase()}`
              });
            }
          }
        });
      }
    });

    return userInputs;
  },

  extractReplacementRulesFromN8n(n8nTemplate: any): ReplacementRule[] {
    const replacementRules: ReplacementRule[] = [];
    
    // Chercher les nodes qui ont des paramètres avec des placeholders utilisateur
    n8nTemplate.nodes?.forEach((node: any) => {
      if (node.parameters) {
        Object.entries(node.parameters).forEach(([key, value]) => {
          if (typeof value === 'string' && value.includes('{{$json.USER_')) {
            const inputName = value.match(/\{\{\$json\.USER_([^}]+)\}\}/)?.[1];
            if (inputName) {
              replacementRules.push({
                source: 'userInput',
                sourceType: 'userInput',
                sourceKey: inputName,
                key: key,
                target: `{{$json.USER_${inputName}}}`
              });
            }
          }
        });
      }
    });

    return replacementRules;
  },

  async replacePlaceholders(
    workflow: any,
    userInputValues: Record<string, any>,
    replacementRules: ReplacementRule[]
  ): Promise<any> {
    console.log('replacePlaceholders input workflow:', {
      hasNodes: !!workflow?.nodes,
      nodeCount: workflow?.nodes?.length || 0,
      hasConnections: !!workflow?.connections,
      keys: Object.keys(workflow || {})
    });

    console.log('replacePlaceholders replacementRules:', {
      isArray: Array.isArray(replacementRules),
      length: replacementRules?.length || 0,
      rules: replacementRules
    });

    // Si pas de règles de remplacement, retourner le workflow tel quel
    if (!replacementRules || !Array.isArray(replacementRules) || replacementRules.length === 0) {
      console.log('No replacement rules found, returning workflow as-is');
      return workflow;
    }

    let workflowString = JSON.stringify(workflow);

    for (const rule of replacementRules) {
      const source = (rule as any).sourceType || rule.source;
      const key = (rule as any).sourceKey || rule.key;
      const placeholder = rule.placeholder;

      let value: any;

      switch (source) {
        case 'userInput':
          value = userInputValues[key];
          break;

        case 'adminCredential':
          // TODO: Implémenter la récupération des clés API via l'API backend
          value = 'placeholder-api-key';
          break;

        case 'generated':
          value = this.generateValue(key);
          break;

        case 'context':
          value = await this.getContextValue(key);
          break;

        default:
          continue;
      }

      if (rule.transform) {
        value = this.applyTransform(value, rule.transform);
      }

      if (rule.validation) {
        if (!this.validateValue(value, rule.validation)) {
          throw new Error(`Validation failed for ${placeholder}`);
        }
      }

      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      workflowString = workflowString.replace(regex, String(value));
    }

    const result = JSON.parse(workflowString);
    console.log('replacePlaceholders output workflow:', {
      hasNodes: !!result?.nodes,
      nodeCount: result?.nodes?.length || 0,
      hasConnections: !!result?.connections,
      keys: Object.keys(result || {})
    });

    return result;
  },

  generateValue(key: string): string {
    switch (key) {
      case 'uniqueId':
      case 'uuid':
        return crypto.randomUUID();

      case 'timestamp':
        return new Date().toISOString();

      case 'webhookId':
        return `webhook_${crypto.randomUUID().split('-')[0]}`;

      default:
        return '';
    }
  },

  async getContextValue(key: string): Promise<string> {
    // TODO: Récupérer la session depuis le contexte d'authentification
    const data = { session: { access_token: 'placeholder-token', user: { id: 'current-user-id', email: 'user@example.com' } } }; // Placeholder

    switch (key) {
      case 'userId':
        return data.session?.user?.id || '';

      case 'userEmail':
        return data.session?.user?.email || '';

      default:
        return '';
    }
  },

  applyTransform(value: any, transform: string): any {
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'trim':
        return String(value).trim();

      case 'number':
        return Number(value);

      case 'boolean':
        return Boolean(value);

      case 'json':
        return JSON.stringify(value);

      default:
        return value;
    }
  },

  validateValue(value: any, validation: string): boolean {
    try {
      const validationFn = new Function('value', `return ${validation}`);
      return validationFn(value);
    } catch {
      return true;
    }
  },

  async createWorkflowFromTemplate(
    template: WorkflowTemplate,
    userInputValues: Record<string, any>
  ): Promise<any> {
    const missingInputs = template.userInputs
      .filter(input => input.required && !userInputValues[input.key])
      .map(input => input.label);

    if (missingInputs.length > 0) {
      throw new Error(`Missing required inputs: ${missingInputs.join(', ')}`);
    }

    for (const input of template.userInputs) {
      const value = userInputValues[input.key];

      if (value && input.validation) {
        if (input.validation.minLength && String(value).length < input.validation.minLength) {
          throw new Error(`${input.label} must be at least ${input.validation.minLength} characters`);
        }

        if (input.validation.maxLength && String(value).length > input.validation.maxLength) {
          throw new Error(`${input.label} must be at most ${input.validation.maxLength} characters`);
        }

        if (input.validation.pattern && !new RegExp(input.validation.pattern).test(String(value))) {
          throw new Error(`${input.label} format is invalid`);
        }

        if (input.validation.min !== undefined && Number(value) < input.validation.min) {
          throw new Error(`${input.label} must be at least ${input.validation.min}`);
        }

        if (input.validation.max !== undefined && Number(value) > input.validation.max) {
          throw new Error(`${input.label} must be at most ${input.validation.max}`);
        }
      }
    }

    const processedWorkflow = await this.replacePlaceholders(
      template.workflowDefinition,
      userInputValues,
      template.replacementRules
    );

    console.log('Processed workflow:', {
      hasNodes: !!processedWorkflow?.nodes,
      nodeCount: processedWorkflow?.nodes?.length || 0,
      hasConnections: !!processedWorkflow?.connections,
      keys: Object.keys(processedWorkflow || {})
    });

    return processedWorkflow;
  },

  generateFormSchema(userInputs: UserInput[]): UserInput[] {
    return userInputs.map(input => ({
      ...input,
      visible: !input.conditionalDisplay
    }));
  },

  shouldDisplayInput(
    input: UserInput,
    formValues: Record<string, any>
  ): boolean {
    if (!input.conditionalDisplay) {
      return true;
    }

    const dependentValue = formValues[input.conditionalDisplay.dependsOn];
    return input.conditionalDisplay.values && input.conditionalDisplay.values.includes(dependentValue);
  }
};
