import { apiClient } from '../lib/api';

interface CommunityStats {
  total_discussions: number;
  total_replies: number;
  total_users: number;
  active_discussions_today: number;
  top_categories: Array<{ name: string; count: number }>;
  recent_activity: Array<{
    type: string;
    title: string;
    author: string;
    created_at: string;
  }>;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  discussions_count: number;
  created_at: string;
  updated_at: string;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category_id: string;
  author_id: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED' | 'LOCKED';
  is_pinned: boolean;
  is_featured: boolean;
  views_count: number;
  likes_count: number;
  replies_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  author_email: string;
  author_first_name: string;
  author_last_name: string;
  category_name: string;
  category_color: string;
}

interface DiscussionReply {
  id: string;
  discussion_id: string;
  author_id: string;
  content: string;
  parent_reply_id?: string;
  is_solution: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  author_email: string;
  author_first_name: string;
  author_last_name: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'MEETUP' | 'WEBINAR' | 'WORKSHOP' | 'CONTEST' | 'ANNOUNCEMENT';
  start_date: string;
  end_date?: string;
  location: string;
  is_virtual: boolean;
  max_participants?: number;
  current_participants: number;
  organizer_id: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  organizer_email: string;
  organizer_first_name: string;
  organizer_last_name: string;
}


interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria?: any;
  assigned_count: number;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationInfo;
  error?: string;
}

class CommunityService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const response = await apiClient.request(`/community${endpoint}`, options);
    return response;
  }

  // Statistiques
  async getStats(): Promise<CommunityStats> {
    const response = await this.makeRequest<CommunityStats>('/stats');
    return response.data;
  }

  // Catégories
  async getCategories(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ data: Category[]; pagination: PaginationInfo }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);

    const response = await this.makeRequest<Category[]>(
      `/categories?${searchParams.toString()}`
    );
    
    return {
      data: response.data,
      pagination: response.pagination!
    };
  }

  async createCategory(category: {
    name: string;
    description: string;
    color: string;
    icon: string;
    sort_order: number;
  }): Promise<Category> {
    const response = await this.makeRequest<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
    return response.data;
  }

  // Discussions
  async getDiscussions(params: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
  } = {}): Promise<{ data: Discussion[]; pagination: PaginationInfo }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category) searchParams.append('category', params.category);
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.order) searchParams.append('order', params.order);

    const response = await this.makeRequest<Discussion[]>(
      `/discussions?${searchParams.toString()}`
    );
    
    return {
      data: response.data,
      pagination: response.pagination!
    };
  }

  async getDiscussionReplies(discussionId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: DiscussionReply[]; pagination: PaginationInfo }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await this.makeRequest<DiscussionReply[]>(
      `/discussions/${discussionId}/replies?${searchParams.toString()}`
    );
    
    return {
      data: response.data,
      pagination: response.pagination!
    };
  }

  // Événements
  async getEvents(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{ data: CommunityEvent[]; pagination: PaginationInfo }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.type) searchParams.append('type', params.type);
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);

    const response = await this.makeRequest<CommunityEvent[]>(
      `/events?${searchParams.toString()}`
    );
    
    return {
      data: response.data,
      pagination: response.pagination!
    };
  }



  // Badges
  async getBadges(): Promise<UserBadge[]> {
    const response = await this.makeRequest<UserBadge[]>('/badges');
    return response.data;
  }

  // Tags
  async getTags(search?: string): Promise<Tag[]> {
    const searchParams = new URLSearchParams();
    if (search) searchParams.append('search', search);

    const response = await this.makeRequest<Tag[]>(
      `/tags?${searchParams.toString()}`
    );
    return response.data;
  }

  // Créer un badge
  async createBadge(badgeData: {
    name: string;
    description: string;
    icon?: string;
    color?: string;
    criteria?: any;
  }): Promise<UserBadge> {
    const response = await this.makeRequest<UserBadge>('/badges', {
      method: 'POST',
      body: JSON.stringify(badgeData),
    });
    return response.data;
  }

  // Mettre à jour un badge
  async updateBadge(badgeId: string, badgeData: {
    name: string;
    description: string;
    icon?: string;
    color?: string;
    criteria?: any;
  }): Promise<UserBadge> {
    const response = await this.makeRequest<UserBadge>(`/badges/${badgeId}`, {
      method: 'PUT',
      body: JSON.stringify(badgeData),
    });
    return response.data;
  }

  // Supprimer un badge
  async deleteBadge(badgeId: string): Promise<void> {
    await this.makeRequest(`/badges/${badgeId}`, {
      method: 'DELETE',
    });
  }

  // ===== DISCUSSIONS =====
  
  // Créer une discussion
  async createDiscussion(discussionData: {
    title: string;
    content: string;
    category_id: string;
    tags?: string[];
  }): Promise<Discussion> {
    const response = await this.makeRequest<Discussion>('/discussions', {
      method: 'POST',
      body: JSON.stringify(discussionData),
    });
    return response.data;
  }

  // Mettre à jour une discussion
  async updateDiscussion(discussionId: string, discussionData: {
    title: string;
    content: string;
    category_id: string;
    status?: string;
  }): Promise<Discussion> {
    const response = await this.makeRequest<Discussion>(`/discussions/${discussionId}`, {
      method: 'PUT',
      body: JSON.stringify(discussionData),
    });
    return response.data;
  }

  // Supprimer une discussion
  async deleteDiscussion(discussionId: string): Promise<void> {
    await this.makeRequest(`/discussions/${discussionId}`, {
      method: 'DELETE',
    });
  }

  // Ajouter un like à une discussion
  async likeDiscussion(discussionId: string): Promise<void> {
    await this.makeRequest(`/discussions/${discussionId}/like`, {
      method: 'POST',
    });
  }

  // Retirer un like d'une discussion
  async unlikeDiscussion(discussionId: string): Promise<void> {
    await this.makeRequest(`/discussions/${discussionId}/like`, {
      method: 'DELETE',
    });
  }

  // ===== ÉVÉNEMENTS =====

  // Créer un événement
  async createEvent(eventData: {
    title: string;
    description: string;
    event_type: string;
    start_date: string;
    end_date: string;
    location: string;
    is_virtual: boolean;
    max_participants?: number | null;
    status?: string;
  }): Promise<CommunityEvent> {
    const response = await this.makeRequest<CommunityEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    return response.data;
  }

  // Mettre à jour un événement
  async updateEvent(eventId: string, eventData: {
    title: string;
    description: string;
    event_type: string;
    start_date: string;
    end_date: string;
    location: string;
    is_virtual: boolean;
    max_participants?: number | null;
    status?: string;
  }): Promise<CommunityEvent> {
    const response = await this.makeRequest<CommunityEvent>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
    return response.data;
  }

  // Supprimer un événement
  async deleteEvent(eventId: string): Promise<void> {
    await this.makeRequest(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Participer à un événement
  async participateInEvent(eventId: string): Promise<void> {
    await this.makeRequest(`/events/${eventId}/participate`, {
      method: 'POST',
    });
  }

  // Se désinscrire d'un événement
  async unparticipateFromEvent(eventId: string): Promise<void> {
    await this.makeRequest(`/events/${eventId}/participate`, {
      method: 'DELETE',
    });
  }

  // Vérifier la participation à un événement
  async checkEventParticipation(eventId: string): Promise<{ isParticipating: boolean }> {
    const response = await this.makeRequest<{ isParticipating: boolean }>(`/events/${eventId}/participation`);
    return response.data;
  }

  // Récupérer les participants d'un événement (admin)
  async getEventParticipants(eventId: string, filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);

    const response = await this.makeRequest<{
      data: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/events/${eventId}/participants?${params.toString()}`);
    return response;
  }

  // Supprimer un participant d'un événement (admin)
  async removeEventParticipant(eventId: string, participantId: string): Promise<void> {
    await this.makeRequest(`/events/${eventId}/participants/${participantId}`, {
      method: 'DELETE',
    });
  }

  // Nettoyage
  async cleanup(): Promise<void> {
    await this.makeRequest('/cleanup', {
      method: 'POST',
    });
  }
}

export const communityService = new CommunityService();
export type {
  CommunityStats,
  Category,
  Discussion,
  DiscussionReply,
  CommunityEvent,
  UserBadge,
  Tag,
  PaginationInfo,
  ApiResponse
};
