import { apiClient } from '../lib/api';

// =====================================================
// USER PROFILE SERVICE
// =====================================================

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  location?: string;
  website?: string;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
  total_workflows: number;
  active_workflows: number;
  total_automations: number;
  successful_automations: number;
  failed_automations: number;
  community_posts: number;
  community_likes: number;
  community_events_attended: number;
  last_activity?: string;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  email_notifications: boolean;
  app_notifications: boolean;
  community_notifications: boolean;
  workflow_notifications: boolean;
  email_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  privacy_level: 'public' | 'friends' | 'private';
  updated_at: string;
}

export interface UserStatistics {
  id: string;
  user_id: string;
  total_workflows: number;
  active_workflows: number;
  total_automations: number;
  successful_automations: number;
  failed_automations: number;
  community_posts: number;
  community_likes: number;
  community_events_attended: number;
  last_activity?: string;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_description?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  last_activity: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  points: number;
  unlocked_at: string;
  metadata: Record<string, any>;
}

export interface UserProfileSummary {
  profile: UserProfile;
  recent_activity: UserActivity[];
  total_achievements: number;
  active_sessions: number;
}

class UserProfileService {
  private baseUrl = '/user-profile';

  // Get user profile with statistics
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.request(`${this.baseUrl}/profile`);
    return response.data;
  }

  // Update user profile
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.request(`${this.baseUrl}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return response.data;
  }

  // Get user preferences
  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.request(`${this.baseUrl}/preferences`);
    return response.data;
  }

  // Update user preferences
  async updatePreferences(preferencesData: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await apiClient.request(`${this.baseUrl}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferencesData),
    });
    return response.data;
  }

  // Get user statistics
  async getStatistics(): Promise<UserStatistics> {
    const response = await apiClient.request(`${this.baseUrl}/statistics`);
    return response.data;
  }

  // Get user activity logs
  async getActivity(params: {
    page?: number;
    limit?: number;
    activity_type?: string;
  } = {}): Promise<{
    data: UserActivity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.activity_type) searchParams.append('activity_type', params.activity_type);

    const response = await apiClient.request(`${this.baseUrl}/activity?${searchParams.toString()}`);
    return response;
  }

  // Get user achievements
  async getAchievements(): Promise<UserAchievement[]> {
    const response = await apiClient.request(`${this.baseUrl}/achievements`);
    return response.data;
  }

  // Get user sessions
  async getSessions(): Promise<UserSession[]> {
    const response = await apiClient.request(`${this.baseUrl}/sessions`);
    return response.data;
  }

  // Terminate a session
  async terminateSession(sessionId: string): Promise<void> {
    await apiClient.request(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Update user statistics (admin only)
  async updateStatistics(statistics: Partial<UserStatistics>, targetUserId?: string): Promise<void> {
    await apiClient.request(`${this.baseUrl}/statistics`, {
      method: 'PUT',
      body: JSON.stringify({
        targetUserId,
        statistics,
      }),
    });
  }

  // Get user profile summary
  async getProfileSummary(): Promise<UserProfileSummary> {
    const response = await apiClient.request(`${this.baseUrl}/summary`);
    return response.data;
  }

  // Helper method to format user name
  formatUserName(profile: UserProfile): string {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile.first_name) {
      return profile.first_name;
    } else if (profile.last_name) {
      return profile.last_name;
    } else {
      return profile.email;
    }
  }

  // Helper method to get user initials
  getUserInitials(profile: UserProfile): string {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    } else if (profile.first_name) {
      return profile.first_name[0].toUpperCase();
    } else if (profile.last_name) {
      return profile.last_name[0].toUpperCase();
    } else {
      return profile.email[0].toUpperCase();
    }
  }

  // Helper method to get avatar URL or generate initials
  getAvatarUrl(profile: UserProfile): string | null {
    if (profile.avatar_url) {
      return profile.avatar_url;
    }
    return null;
  }

  // Helper method to check if profile is complete
  isProfileComplete(profile: UserProfile): boolean {
    return !!(
      profile.first_name &&
      profile.last_name &&
      profile.bio &&
      profile.location
    );
  }

  // Helper method to get profile completion percentage
  getProfileCompletionPercentage(profile: UserProfile): number {
    const fields = [
      'first_name',
      'last_name',
      'bio',
      'phone',
      'company',
      'job_title',
      'location',
      'website',
      'avatar_url'
    ];
    
    const completedFields = fields.filter(field => 
      profile[field as keyof UserProfile] && 
      profile[field as keyof UserProfile] !== ''
    ).length;
    
    return Math.round((completedFields / fields.length) * 100);
  }
}

export const userProfileService = new UserProfileService();
