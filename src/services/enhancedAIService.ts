// Service frontend pour l'AI Generator amélioré
import { apiClient } from '../lib/api';

export interface IntelligentWorkflowRequest {
  description: string;
  aiProvider?: string;
  aiModel?: string;
}

export interface OptimizedWorkflowRequest {
  description: string;
  aiProvider?: string;
  aiModel?: string;
}

export interface TemplateWorkflowRequest {
  templateId: string;
  customizations?: Record<string, any>;
}

export interface WorkflowValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface WorkflowResponse {
  workflow: any;
  validation: WorkflowValidation;
  metadata: {
    generatedAt: string;
    description?: string;
    aiProvider?: string;
    userId?: string;
    optimized?: boolean;
    templateId?: string;
    customizations?: Record<string, any>;
  };
}

export interface ApplicationContext {
  templates: Array<{
    id: string;
    name: string;
    description: string;
    usageCount: number;
    nodeTypes: Array<{
      type: string;
      name: string;
      position: number[];
      parameters: string[];
    }>;
    connections: Record<string, string[]>;
    complexity: 'simple' | 'medium' | 'complex';
    createdAt: string;
  }>;
  popularNodes: Record<string, number>;
  connectionPatterns: Record<string, number>;
  usageStats: {
    templates: {
      total_templates: number;
      templates_with_nodes: number;
      avg_nodes_per_template: number;
      unique_node_types: number;
    };
    workflows: {
      total_workflows: number;
      active_workflows: number;
      unique_users: number;
    };
  };
  availableCredentials: Record<string, string>;
  workingPatterns: Record<string, {
    sequence: string[];
    templates: Array<{
      name: string;
      description: string;
    }>;
    totalUsage: number;
    activeUsage: number;
  }>;
}

class EnhancedAIService {
  private baseUrl = '/enhanced-ai';

  // Générer un workflow intelligent avec contexte
  async generateIntelligentWorkflow(request: IntelligentWorkflowRequest): Promise<WorkflowResponse> {
    try {
      console.log('🤖 [EnhancedAI] Génération intelligente demandée:', request.description);
      
      const response = await apiClient.request(`${this.baseUrl}/generate-intelligent`, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      console.log('✅ [EnhancedAI] Workflow intelligent généré');
      return response;
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la génération intelligente:', error);
      throw error;
    }
  }

  // Générer un workflow optimisé pour l'utilisateur
  async generateOptimizedWorkflow(request: OptimizedWorkflowRequest): Promise<WorkflowResponse> {
    try {
      console.log('🎯 [EnhancedAI] Génération optimisée demandée:', request.description);
      
      const response = await apiClient.request(`${this.baseUrl}/generate-optimized`, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      console.log('✅ [EnhancedAI] Workflow optimisé généré');
      return response;
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la génération optimisée:', error);
      throw error;
    }
  }

  // Générer un workflow basé sur un template existant
  async generateFromTemplate(request: TemplateWorkflowRequest): Promise<WorkflowResponse> {
    try {
      console.log('📋 [EnhancedAI] Génération depuis template:', request.templateId);
      
      const response = await apiClient.request(`${this.baseUrl}/generate-from-template`, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      console.log('✅ [EnhancedAI] Workflow depuis template généré');
      return response;
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la génération depuis template:', error);
      throw error;
    }
  }

  // Obtenir le contexte de l'application
  async getApplicationContext(): Promise<ApplicationContext> {
    try {
      console.log('🧠 [EnhancedAI] Récupération du contexte...');
      
      const response = await apiClient.request(`${this.baseUrl}/context`);
      
      console.log('✅ [EnhancedAI] Contexte récupéré');
      console.log('📊 [EnhancedAI] Structure de la réponse:', {
        hasData: !!response.data,
        hasContext: !!response.context,
        hasDataContext: !!response.data?.context,
        keys: Object.keys(response)
      });
      
      // Retourner le contexte depuis la structure correcte
      if (response.data?.context) {
        console.log('📋 [EnhancedAI] Contexte trouvé dans data.context');
        return response.data.context;
      } else if (response.context) {
        console.log('📋 [EnhancedAI] Contexte trouvé dans context');
        return response.context;
      } else if (response.data) {
        console.log('📋 [EnhancedAI] Contexte trouvé dans data');
        return response.data;
      } else {
        console.log('📋 [EnhancedAI] Contexte trouvé dans response direct');
        return response;
      }
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la récupération du contexte:', error);
      throw error;
    }
  }

  // Valider un workflow
  async validateWorkflow(workflow: any): Promise<WorkflowValidation> {
    try {
      console.log('🔍 [EnhancedAI] Validation du workflow...');
      
      const response = await apiClient.request(`${this.baseUrl}/validate`, {
        method: 'POST',
        body: JSON.stringify({ workflow })
      });

      console.log('✅ [EnhancedAI] Workflow validé');
      return response.validation;
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la validation:', error);
      throw error;
    }
  }

  // Corriger un workflow
  async fixWorkflow(workflow: any): Promise<{
    originalWorkflow: any;
    fixedWorkflow: any;
    validation: WorkflowValidation;
  }> {
    try {
      console.log('🔧 [EnhancedAI] Correction du workflow...');
      
      const response = await apiClient.request(`${this.baseUrl}/fix`, {
        method: 'POST',
        body: JSON.stringify({ workflow })
      });

      console.log('✅ [EnhancedAI] Workflow corrigé');
      return {
        originalWorkflow: response.originalWorkflow,
        fixedWorkflow: response.fixedWorkflow,
        validation: response.validation
      };
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la correction:', error);
      throw error;
    }
  }

  // Récupérer tous les nœuds disponibles depuis n8n
  async getAllNodes(): Promise<{
    nodes: Record<string, any[]>;
    totalCount: number;
    allTypes: string[];
    categories: string[];
    source: string;
  }> {
    try {
      console.log('📦 [EnhancedAI] Récupération de tous les nœuds n8n...');
      
      // Essayer d'abord l'API n8n directe
      try {
        const n8nResponse = await apiClient.request('/n8n/nodes');
        if (n8nResponse.success && n8nResponse.data) {
          console.log('✅ [EnhancedAI] Nœuds récupérés depuis n8n API');
          return n8nResponse.data;
        }
      } catch (n8nError) {
        console.warn('⚠️ [EnhancedAI] Impossible de récupérer depuis n8n API, utilisation du registre local');
      }
      
      // Fallback: utiliser le registre local
      const registryResponse = await apiClient.request(`${this.baseUrl}/nodes-registry`);
      if (registryResponse.success && registryResponse.data) {
        console.log('✅ [EnhancedAI] Nœuds récupérés depuis le registre local');
        return registryResponse.data;
      }
      
      throw new Error('Aucune source de nœuds disponible');
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la récupération des nœuds:', error);
      throw error;
    }
  }

  // Analyser la description et suggérer des améliorations
  async analyzeDescription(description: string): Promise<{
    suggestions: string[];
    recommendedNodes: string[];
    complexity: 'simple' | 'medium' | 'complex';
    estimatedNodes: number;
  }> {
    try {
      console.log('🔍 [EnhancedAI] Analyse de la description...');
      
      // Pour l'instant, retourner une analyse basique
      // Plus tard, on pourra intégrer une analyse IA plus poussée
      const suggestions: string[] = [];
      const recommendedNodes: string[] = [];
      let complexity: 'simple' | 'medium' | 'complex' = 'simple';
      let estimatedNodes = 3;

      const lowerDesc = description.toLowerCase();

      // Analyser la complexité
      if (lowerDesc.includes('complex') || lowerDesc.includes('multiple') || lowerDesc.includes('advanced')) {
        complexity = 'complex';
        estimatedNodes = 8;
      } else if (lowerDesc.includes('simple') || lowerDesc.includes('basic')) {
        complexity = 'simple';
        estimatedNodes = 3;
      } else {
        complexity = 'medium';
        estimatedNodes = 5;
      }

      // Suggestions basées sur la description
      if (lowerDesc.includes('email')) {
        suggestions.push('Considérez ajouter un nœud IMAP pour lire les emails');
        recommendedNodes.push('n8n-nodes-imap.imap', 'n8n-nodes-base.emailSend');
      }

      if (lowerDesc.includes('pdf')) {
        suggestions.push('Utilisez un nœud extractFromFile pour traiter les PDFs');
        recommendedNodes.push('n8n-nodes-base.extractFromFile');
      }

      if (lowerDesc.includes('data') || lowerDesc.includes('database')) {
        suggestions.push('Ajoutez un nœud PostgreSQL pour stocker les données');
        recommendedNodes.push('n8n-nodes-base.postgres');
      }

      if (lowerDesc.includes('ai') || lowerDesc.includes('intelligent')) {
        suggestions.push('Intégrez un AI Agent pour le traitement intelligent');
        recommendedNodes.push('@n8n/n8n-nodes-langchain.agent');
      }

      // Toujours recommander les nœuds essentiels
      recommendedNodes.push('@n8n/n8n-nodes-langchain.lmChatOpenRouter');
      recommendedNodes.push('@n8n/n8n-nodes-langchain.toolCalculator');
      recommendedNodes.push('@n8n/n8n-nodes-langchain.memoryBufferWindow');

      return {
        suggestions,
        recommendedNodes,
        complexity,
        estimatedNodes
      };
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de l\'analyse:', error);
      throw error;
    }
  }
}

export const enhancedAIService = new EnhancedAIService();
