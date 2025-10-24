import React, { useState, useEffect } from 'react';
import {
  User,
  Settings,
  Activity,
  Award,
  Shield,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building,
  Briefcase,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  Eye,
  Edit3,
  Save,
  X,
  Camera,
  Bell,
  Palette,
  Lock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  LogOut,
  Monitor,
  Smartphone
} from 'lucide-react';
import { userProfileService, UserProfile, UserPreferences, UserStatistics, UserActivity, UserSession, UserAchievement } from '../../services/userProfileService';
import { NotificationCenter } from './NotificationCenter';

// =====================================================
// USER PROFILE MAIN COMPONENT
// =====================================================

export const UserProfileView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'activity' | 'statistics' | 'sessions' | 'achievements' | 'notifications'>('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'profile', name: 'Profil', icon: User },
    { id: 'preferences', name: 'Préférences', icon: Settings },
    { id: 'activity', name: 'Activité', icon: Activity },
    { id: 'statistics', name: 'Statistiques', icon: BarChart3 },
    { id: 'sessions', name: 'Sessions', icon: Shield },
    { id: 'achievements', name: 'Succès', icon: Award },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ];

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-slate-600">Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Mon Profil</h1>
        <p className="text-slate-600">Gérez vos informations personnelles et préférences</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'statistics' && <StatisticsTab />}
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
        {activeTab === 'notifications' && <NotificationCenter />}
      </div>
    </div>
  );
};

// =====================================================
// PROFILE TAB COMPONENT
// =====================================================

const ProfileTab: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await userProfileService.getProfile();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedProfile = await userProfileService.updateProfile(formData);
      setProfile(updatedProfile);
      setEditing(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setEditing(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image est trop volumineuse. Taille maximale : 5MB');
      return;
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    try {
      setUploading(true);
      // Convertir l'image en base64 pour l'instant
      // Dans une vraie application, vous voudriez uploader vers un service comme AWS S3
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setFormData({ ...formData, avatar_url: result });
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'avatar:', error);
      alert('Erreur lors de l\'upload de l\'image');
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  const completionPercentage = userProfileService.getProfileCompletionPercentage(profile);

  return (
    <div className="p-6">
      {/* Profile Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-slate-200">
                <span className="text-2xl font-bold text-blue-600">
                  {userProfileService.getUserInitials(profile)}
                </span>
              </div>
            )}
            {editing && (
              <label className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white cursor-pointer ${
                uploading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}>
                {uploading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {userProfileService.formatUserName(profile)}
            </h2>
            <p className="text-slate-600">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-32 bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-slate-600">{completionPercentage}% complété</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit3 className="w-4 h-4" />
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Prénom</label>
          <input
            type="text"
            value={formData.first_name || ''}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
          <input
            type="text"
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Entreprise</label>
          <input
            type="text"
            value={formData.company || ''}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Poste</label>
          <input
            type="text"
            value={formData.job_title || ''}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Localisation</label>
          <input
            type="text"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
          <input
            type="url"
            value={formData.website || ''}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={!editing}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">Biographie</label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            disabled={!editing}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            placeholder="Parlez-nous de vous..."
          />
        </div>
      </div>
    </div>
  );
};

// =====================================================
// PREFERENCES TAB COMPONENT
// =====================================================

const PreferencesTab: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await userProfileService.getPreferences();
      setPreferences(data);
    } catch (err) {
      console.error('Erreur lors du chargement des préférences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    try {
      setSaving(true);
      const updatedPreferences = await userProfileService.updatePreferences(preferences);
      setPreferences(updatedPreferences);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600">Erreur lors du chargement des préférences</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Préférences</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Thème</label>
          <div className="flex gap-4">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <label key={theme} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={preferences.theme === theme}
                  onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="capitalize">{theme === 'system' ? 'Système' : theme === 'light' ? 'Clair' : 'Sombre'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Notifications</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.email_notifications}
                onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Notifications par email</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.app_notifications}
                onChange={(e) => setPreferences({ ...preferences, app_notifications: e.target.checked })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Bell className="w-4 h-4 text-slate-500" />
              <span>Notifications in-app</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.community_notifications}
                onChange={(e) => setPreferences({ ...preferences, community_notifications: e.target.checked })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Users className="w-4 h-4 text-slate-500" />
              <span>Notifications de la communauté</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.workflow_notifications}
                onChange={(e) => setPreferences({ ...preferences, workflow_notifications: e.target.checked })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Activity className="w-4 h-4 text-slate-500" />
              <span>Notifications des workflows</span>
            </label>
          </div>
        </div>

        {/* Email Frequency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Fréquence des emails</label>
          <select
            value={preferences.email_frequency}
            onChange={(e) => setPreferences({ ...preferences, email_frequency: e.target.value as any })}
            className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="never">Jamais</option>
            <option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
          </select>
        </div>

        {/* Privacy Level */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Niveau de confidentialité</label>
          <div className="flex gap-4">
            {(['public', 'friends', 'private'] as const).map((level) => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="privacy"
                  value={level}
                  checked={preferences.privacy_level === level}
                  onChange={(e) => setPreferences({ ...preferences, privacy_level: e.target.value as any })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="capitalize">
                  {level === 'private' ? 'Privé' : level === 'friends' ? 'Amis' : 'Public'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// ACTIVITY TAB COMPONENT
// =====================================================

const ActivityTab: React.FC = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadActivities();
  }, [page]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const result = await userProfileService.getActivity({ page, limit: 20 });
      setActivities(result.data);
      setTotalPages(result.pagination.pages);
    } catch (err) {
      console.error('Erreur lors du chargement des activités:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login': return <LogOut className="w-4 h-4 text-green-600" />;
      case 'profile_updated': return <Edit3 className="w-4 h-4 text-blue-600" />;
      case 'workflow_created': return <Activity className="w-4 h-4 text-purple-600" />;
      case 'workflow_executed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'community_post': return <MessageSquare className="w-4 h-4 text-orange-600" />;
      default: return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityDescription = (activity: UserActivity) => {
    if (activity.activity_description) {
      return activity.activity_description;
    }
    
    switch (activity.activity_type) {
      case 'login': return 'Connexion à la plateforme';
      case 'profile_updated': return 'Profil mis à jour';
      case 'workflow_created': return 'Nouveau workflow créé';
      case 'workflow_executed': return 'Workflow exécuté';
      case 'community_post': return 'Publication dans la communauté';
      default: return 'Activité enregistrée';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Activité récente</h3>
      
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Aucune activité récente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-shrink-0">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {getActivityDescription(activity)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(activity.created_at).toLocaleString('fr-FR')}
                </p>
                {activity.ip_address && (
                  <p className="text-xs text-slate-400 mt-1">
                    IP: {activity.ip_address}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-3 py-2 text-sm text-slate-600">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// STATISTICS TAB COMPONENT
// =====================================================

const StatisticsTab: React.FC = () => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await userProfileService.getStatistics();
      setStatistics(data);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-lg p-4">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600">Erreur lors du chargement des statistiques</p>
      </div>
    );
  }

  const stats = [
    {
      title: 'Workflows totaux',
      value: statistics.total_workflows,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Workflows actifs',
      value: statistics.active_workflows,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Automatisations totales',
      value: statistics.total_automations,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Automatisations réussies',
      value: statistics.successful_automations,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Automatisations échouées',
      value: statistics.failed_automations,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Publications communauté',
      value: statistics.community_posts,
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Likes communauté',
      value: statistics.community_likes,
      icon: Users,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      title: 'Événements participés',
      value: statistics.community_events_attended,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Statistiques personnelles</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-slate-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <h4 className="text-sm font-medium text-slate-700">{stat.title}</h4>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {statistics.last_activity && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Dernière activité: {new Date(statistics.last_activity).toLocaleString('fr-FR')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// SESSIONS TAB COMPONENT
// =====================================================

const SessionsTab: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userProfileService.getSessions();
      console.log('🔍 Sessions chargées:', data);
      setSessions(data);
    } catch (err) {
      console.error('Erreur lors du chargement des sessions:', err);
      setError('Erreur lors du chargement des sessions. Vérifiez votre connexion.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir terminer cette session ?')) return;
    
    try {
      await userProfileService.terminateSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Erreur lors de la suppression de la session:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadSessions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Sessions actives</h3>
      
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Aucune session active</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {session.user_agent ? 
                      (session.user_agent.includes('Mobile') ? 'Mobile' : 'Desktop') : 
                      'Appareil inconnu'
                    }
                  </p>
                  <p className="text-xs text-slate-500">
                    {session.ip_address && `IP: ${session.ip_address}`}
                    {session.last_activity && ` • Dernière activité: ${new Date(session.last_activity).toLocaleString('fr-FR')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {new Date(session.created_at).toLocaleDateString('fr-FR')}
                </span>
                {session.is_active && (
                  <button
                    onClick={() => handleTerminateSession(session.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Terminer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================
// ACHIEVEMENTS TAB COMPONENT
// =====================================================

const AchievementsTab: React.FC = () => {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const data = await userProfileService.getAchievements();
      setAchievements(data);
    } catch (err) {
      console.error('Erreur lors du chargement des succès:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Succès et badges</h3>
      
      {achievements.length === 0 ? (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Aucun succès débloqué</p>
          <p className="text-sm text-slate-500 mt-2">Continuez à utiliser la plateforme pour débloquer des succès !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">{achievement.achievement_name}</h4>
                {achievement.achievement_description && (
                  <p className="text-sm text-slate-600 mt-1">{achievement.achievement_description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">
                    Débloqué le {new Date(achievement.unlocked_at).toLocaleDateString('fr-FR')}
                  </span>
                  {achievement.points > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      +{achievement.points} points
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
