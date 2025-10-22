import { apiClient } from '../lib/api';

// Types pour les tickets
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report';
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  created_by_email?: string;
  created_by_role?: string;
  assigned_to_email?: string;
  assigned_to_role?: string;
  comments_count?: number;
  attachments_count?: number;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  user_email?: string;
  author_role?: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_email?: string;
}

export interface TicketNotification {
  id: string;
  ticket_id: string;
  user_id: string;
  type: 'created' | 'updated' | 'assigned' | 'commented' | 'resolved' | 'closed';
  message: string;
  is_read: boolean;
  created_at: string;
  ticket_title?: string;
  ticket_status?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
  highPriority: number;
  thisWeek: number;
  thisMonth: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report';
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report';
  assigned_to?: string;
}

export interface CreateCommentData {
  comment_text: string;
  is_internal?: boolean;
}

export class TicketsService {
  // Récupérer tous les tickets
  static async getAllTickets(): Promise<Ticket[]> {
    try {
      const response = await apiClient.request('/tickets', { method: 'GET' });
      return response.tickets || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
      throw error;
    }
  }

  // Récupérer un ticket spécifique
  static async getTicket(ticketId: string): Promise<Ticket> {
    try {
      const response = await apiClient.request(`/tickets/${ticketId}`, { method: 'GET' });
      const ticket = response.ticket;
      
      // Normaliser les commentaires pour correspondre à l'interface frontend
      if (ticket.comments) {
        ticket.comments = ticket.comments.map((comment: any) => ({
          ...comment,
          user_email: comment.author_email,
          author_role: comment.author_role
        }));
      }
      
      return ticket;
    } catch (error) {
      console.error('Erreur lors de la récupération du ticket:', error);
      throw error;
    }
  }

  // Créer un nouveau ticket
  static async createTicket(data: CreateTicketData): Promise<Ticket> {
    try {
      const response = await apiClient.request('/tickets', { method: 'POST', body: JSON.stringify(data) });
      return response.ticket;
    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error);
      throw error;
    }
  }

  // Mettre à jour un ticket
  static async updateTicket(ticketId: string, data: UpdateTicketData): Promise<Ticket> {
    try {
      const response = await apiClient.request(`/tickets/${ticketId}`, { method: 'PUT', body: JSON.stringify(data) });
      return response.ticket;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du ticket:', error);
      throw error;
    }
  }

  // Ajouter un commentaire à un ticket
  static async addComment(ticketId: string, data: CreateCommentData): Promise<TicketComment> {
    try {
      const response = await apiClient.request(`/tickets/${ticketId}/comments`, { method: 'POST', body: JSON.stringify(data) });
      return response.comment;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      throw error;
    }
  }

  // Récupérer les notifications non lues
  static async getUnreadNotifications(): Promise<TicketNotification[]> {
    try {
      const response = await apiClient.request('/tickets/notifications/unread', { method: 'GET' });
      return response.notifications || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  }

  // Marquer une notification comme lue
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.request(`/tickets/notifications/${notificationId}/read`, { method: 'PUT' });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
      throw error;
    }
  }

  // Récupérer les statistiques des tickets (admin uniquement)
  static async getTicketStats(): Promise<TicketStats> {
    try {
      const response = await apiClient.request('/tickets/stats/overview', { method: 'GET' });
      return response.stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  // Utilitaires pour l'affichage
  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Ouvert',
      in_progress: 'En cours',
      resolved: 'Résolu',
      closed: 'Fermé'
    };
    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  static getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Élevée',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  }

  static getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  }

  static getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      general: 'Général',
      technical: 'Technique',
      billing: 'Facturation',
      feature_request: 'Demande de fonctionnalité',
      bug_report: 'Rapport de bug'
    };
    return labels[category] || category;
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'À l\'instant';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  }
}
