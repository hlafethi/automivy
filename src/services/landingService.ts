import { apiClient } from '../lib/api';

export interface LandingContent {
  [section: string]: {
    [field: string]: string;
  };
}

export interface LandingStats {
  sections: Array<{
    section: string;
    field_count: number;
    last_updated: string;
  }>;
  totalFields: number;
}

export class LandingService {
  // Récupérer tout le contenu de la landing page
  static async getContent(): Promise<LandingContent> {
    try {
      console.log('🔍 [LandingService] Récupération du contenu de la landing page');
      const response = await apiClient.request('/landing', 'GET');
      console.log('✅ [LandingService] Contenu récupéré avec succès');
      return response;
    } catch (error) {
      console.error('❌ [LandingService] Erreur lors de la récupération du contenu:', error);
      throw error;
    }
  }

  // Récupérer le contenu d'une section spécifique
  static async getSectionContent(section: string): Promise<{ [field: string]: string }> {
    try {
      console.log(`🔍 [LandingService] Récupération de la section: ${section}`);
      const response = await apiClient.request(`/landing/section/${section}`, 'GET');
      console.log(`✅ [LandingService] Section ${section} récupérée avec succès`);
      return response;
    } catch (error) {
      console.error(`❌ [LandingService] Erreur lors de la récupération de la section ${section}:`, error);
      throw error;
    }
  }

  // Mettre à jour le contenu d'une section (Admin seulement)
  static async updateSection(section: string, content: { [field: string]: string }): Promise<void> {
    try {
      console.log(`🚨🚨🚨 [LandingService] ===== DÉBUT UPDATE SECTION =====`);
      console.log(`🚨🚨🚨 [LandingService] Section: ${section}`);
      console.log(`🚨🚨🚨 [LandingService] Contenu à mettre à jour:`, JSON.stringify(content, null, 2));
      console.log(`🚨🚨🚨 [LandingService] Token présent:`, !!apiClient.token);
      console.log(`🚨🚨🚨 [LandingService] URL appelée: /landing/section/${section}`);
      
      const response = await apiClient.request(`/landing/section/${section}`, {
        method: 'PUT',
        body: content
      });
      
      console.log(`🚨🚨🚨 [LandingService] Réponse reçue:`, response);
      console.log(`✅ [LandingService] Section ${section} mise à jour avec succès`);
      console.log(`🚨🚨🚨 [LandingService] ===== FIN UPDATE SECTION =====`);
    } catch (error) {
      console.error(`❌ [LandingService] Erreur lors de la mise à jour de la section ${section}:`, error);
      console.log(`🚨🚨🚨 [LandingService] ===== FIN UPDATE SECTION (ERREUR) =====`);
      throw error;
    }
  }

  // Mettre à jour un champ spécifique (Admin seulement)
  static async updateField(section: string, field: string, content: string): Promise<void> {
    try {
      console.log(`🔍 [LandingService] Mise à jour du champ: ${section}.${field}`);
      
      await apiClient.request('/landing/field', 'PUT', {
        section,
        field,
        content
      });
      console.log(`✅ [LandingService] Champ ${section}.${field} mis à jour avec succès`);
    } catch (error) {
      console.error(`❌ [LandingService] Erreur lors de la mise à jour du champ ${section}.${field}:`, error);
      throw error;
    }
  }

  // Supprimer une section (Admin seulement)
  static async deleteSection(section: string): Promise<void> {
    try {
      console.log(`🔍 [LandingService] Suppression de la section: ${section}`);
      
      await apiClient.request(`/landing/section/${section}`, 'DELETE');
      console.log(`✅ [LandingService] Section ${section} supprimée avec succès`);
    } catch (error) {
      console.error(`❌ [LandingService] Erreur lors de la suppression de la section ${section}:`, error);
      throw error;
    }
  }

  // Récupérer les statistiques du contenu (Admin seulement)
  static async getStats(): Promise<LandingStats> {
    try {
      console.log('🔍 [LandingService] Récupération des statistiques');
      const response = await apiClient.request('/landing/stats', 'GET');
      console.log('✅ [LandingService] Statistiques récupérées avec succès');
      return response;
    } catch (error) {
      console.error('❌ [LandingService] Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}
