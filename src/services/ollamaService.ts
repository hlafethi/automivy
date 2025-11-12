// Service frontend pour Ollama
import { apiClient } from '../lib/api';

export interface OllamaGenerateRequest {
  prompt: string;
  model: string;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaWorkflowRequest {
  description: string;
  model: string;
  context?: any;
}

export interface OllamaModel {
  id?: string;
  name?: string;
  size?: number;
  modified_at?: string;
  created?: string;
  object?: string;
}

class OllamaService {
  private baseUrl = '/ollama';

  // Tester la connexion Ollama
  async testConnection(): Promise<{ success: boolean; models?: string[]; message?: string; error?: string }> {
    try {
      console.log('🔍 [Ollama] Test de connexion...');
      const response = await apiClient.request(`${this.baseUrl}/test`);
      console.log('✅ [Ollama] Connexion testée');
      return response;
    } catch (error) {
      console.error('❌ [Ollama] Erreur test connexion:', error);
      throw error;
    }
  }

  // Lister les modèles disponibles
  async getModels(): Promise<OllamaModel[]> {
    try {
      console.log('📋 [Ollama] Récupération des modèles...');
      const response = await apiClient.request(`${this.baseUrl}/models`);
      console.log('✅ [Ollama] Modèles récupérés');
      return response.models || [];
    } catch (error) {
      console.error('❌ [Ollama] Erreur récupération modèles:', error);
      throw error;
    }
  }

  // Récupérer les modèles disponibles (alias pour compatibilité)
  async getAvailableModels(): Promise<Array<{id: string, name: string}>> {
    try {
      console.log('📋 [LocalAI] Récupération des modèles disponibles...');
      const response = await apiClient.request(`${this.baseUrl}/models`);
      console.log('✅ [LocalAI] Modèles récupérés:', response.models?.length || 0);
      
      if (response.success && response.models) {
        return response.models.map((m: OllamaModel) => {
          const modelId = m.id || m.name || '';
          // Formater le nom pour un affichage plus lisible
          const formattedName = this.formatModelName(modelId);
          return {
            id: modelId,
            name: formattedName
          };
        });
      }
      return [];
    } catch (error) {
      console.error('❌ [LocalAI] Erreur récupération modèles:', error);
      throw error;
    }
  }

  // Formater le nom d'un modèle pour un affichage lisible
  private formatModelName(modelId: string): string {
    if (!modelId) return 'Modèle inconnu';
    
    // Remplacer les underscores et tirets par des espaces
    let formatted = modelId
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Ajouter espace avant majuscules
    
    // Mettre en forme selon les patterns connus
    if (modelId.includes('mistral')) {
      formatted = formatted.replace(/mistral\s*(\d+b?)/i, 'Mistral $1');
      if (modelId.includes('instruct')) {
        formatted += ' Instruct';
      }
      if (modelId.includes('v0.3')) {
        formatted += ' v0.3';
      }
    } else if (modelId.includes('gemma')) {
      formatted = formatted.replace(/gemma/i, 'Gemma');
      if (modelId.includes('27b')) {
        formatted = formatted.replace(/27\s*b/i, '27B');
      }
      if (modelId.includes('it')) {
        formatted += ' IT';
      }
    } else if (modelId.includes('qwen') || modelId.includes('Qwen')) {
      formatted = formatted.replace(/qwen/i, 'Qwen');
      if (modelId.includes('3')) {
        formatted += ' 3';
      }
      if (modelId.includes('coder')) {
        formatted += ' Coder';
      }
      if (modelId.includes('480B')) {
        formatted += ' 480B';
      }
    } else if (modelId.includes('planetoid')) {
      formatted = formatted.replace(/planetoid/i, 'Planetoid');
      if (modelId.includes('27b')) {
        formatted = formatted.replace(/27\s*b/i, '27B');
      }
      if (modelId.includes('v.2')) {
        formatted += ' v.2';
      }
    } else if (modelId.includes('openai') || modelId.includes('gpt')) {
      formatted = formatted.replace(/openai/i, 'OpenAI').replace(/gpt/i, 'GPT');
      if (modelId.includes('oss')) {
        formatted += ' OSS';
      }
      if (modelId.includes('20b')) {
        formatted += ' 20B';
      }
      if (modelId.includes('neo')) {
        formatted += ' Neo';
      }
    }
    
    // Capitaliser la première lettre
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Générer du contenu
  async generate(request: OllamaGenerateRequest): Promise<{
    content: string;
    metadata: {
      model: string;
      generationTime: number;
      tokens: number;
    };
  }> {
    try {
      console.log('🤖 [Ollama] Génération de contenu...');
      const response = await apiClient.request(`${this.baseUrl}/generate`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      console.log('✅ [Ollama] Contenu généré');
      return response;
    } catch (error) {
      console.error('❌ [Ollama] Erreur génération:', error);
      throw error;
    }
  }

  // Générer un workflow
  async generateWorkflow(request: OllamaWorkflowRequest): Promise<{
    workflow: any;
    metadata: {
      model: string;
      generationTime: number;
      tokens: number;
    };
  }> {
    try {
      console.log('🔧 [Ollama] Génération de workflow...');
      const response = await apiClient.request(`${this.baseUrl}/generate-workflow`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      console.log('✅ [Ollama] Workflow généré');
      return response;
    } catch (error) {
      console.error('❌ [Ollama] Erreur génération workflow:', error);
      throw error;
    }
  }
}

export const ollamaService = new OllamaService();
