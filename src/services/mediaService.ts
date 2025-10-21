import { apiClient } from '../lib/api';

export interface MediaFile {
  filename: string;
  url: string;
  size: number;
  created: string;
  isImage: boolean;
  isVideo: boolean;
}

export interface UploadResponse {
  message: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

export class MediaService {
  // Upload d'un fichier média
  static async uploadFile(file: File): Promise<UploadResponse> {
    try {
      console.log('🔍 [MediaService] Upload de fichier:', file.name);
      
      const formData = new FormData();
      formData.append('media', file);
      
      const response = await apiClient.request('/media/upload', {
        method: 'POST',
        body: formData
        // Pas de Content-Type manuel - le navigateur le définit automatiquement avec la boundary
      });
      
      console.log('✅ [MediaService] Fichier uploadé avec succès:', response.url);
      return response;
    } catch (error) {
      console.error('❌ [MediaService] Erreur lors de l\'upload:', error);
      throw error;
    }
  }

  // Lister les fichiers uploadés
  static async getFiles(): Promise<MediaFile[]> {
    try {
      console.log('🔍 [MediaService] Récupération de la liste des fichiers');
      const response = await apiClient.request('/media/list', {
        method: 'GET'
      });
      console.log('✅ [MediaService] Liste récupérée:', response.length, 'fichiers');
      return response;
    } catch (error) {
      console.error('❌ [MediaService] Erreur lors de la récupération:', error);
      throw error;
    }
  }

  // Supprimer un fichier
  static async deleteFile(filename: string): Promise<void> {
    try {
      console.log('🔍 [MediaService] Suppression du fichier:', filename);
      await apiClient.request(`/media/${filename}`, {
        method: 'DELETE'
      });
      console.log('✅ [MediaService] Fichier supprimé avec succès');
    } catch (error) {
      console.error('❌ [MediaService] Erreur lors de la suppression:', error);
      throw error;
    }
  }

  // Formater la taille du fichier
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Vérifier si le fichier est une image
  static isImageFile(filename: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  }

  // Vérifier si le fichier est une vidéo
  static isVideoFile(filename: string): boolean {
    return /\.(mp4|webm|mov|avi)$/i.test(filename);
  }
}
