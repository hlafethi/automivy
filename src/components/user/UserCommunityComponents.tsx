import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  MessageSquare, 
  Calendar, 
  Trophy, 
  Heart, 
  Reply, 
  Plus, 
  Search, 
  Filter,
  Clock,
  MapPin,
  User,
  Star,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { communityService } from '../../services/communityService';
import { CreateDiscussionModal } from './CreateDiscussionModal';

// ===== COMPOSANT PRINCIPAL COMMUNAUTÉ UTILISATEUR =====
export function UserCommunityView() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'events' | 'badges'>('discussions');

  const tabs = [
    { id: 'discussions', name: 'Discussions', icon: MessageSquare },
    { id: 'events', name: 'Événements', icon: Calendar },
    { id: 'badges', name: 'Badges', icon: Trophy }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users2 className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Communauté</h2>
          <p className="text-slate-600">Participez aux discussions et événements</p>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === tab.id
                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="mt-6">
        {activeTab === 'discussions' && <UserDiscussionsView />}
        {activeTab === 'events' && <UserEventsView />}
        {activeTab === 'badges' && <UserBadgesView />}
      </div>
    </div>
  );
}

// ===== DISCUSSIONS UTILISATEUR =====
export function UserDiscussionsView() {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: '',
    search: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await communityService.getDiscussions(filters);
      setDiscussions(result.data);
    } catch (err) {
      setError('Erreur lors du chargement des discussions');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeDiscussion = async (discussionId: string) => {
    try {
      await communityService.likeDiscussion(discussionId);
      // Recharger les données
      loadData();
    } catch (err) {
      console.error('Erreur lors du like:', err);
    }
  };

  const handleUnlikeDiscussion = async (discussionId: string) => {
    try {
      await communityService.unlikeDiscussion(discussionId);
      // Recharger les données
      loadData();
    } catch (err) {
      console.error('Erreur lors du unlike:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres et recherche */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Rechercher une discussion..."
              />
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle discussion
          </button>
        </div>
      </div>

      {/* Liste des discussions */}
      <div className="space-y-4">
        {discussions.map(discussion => (
          <div key={discussion.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{discussion.title}</h3>
                  <p className="text-sm text-slate-500">
                    par {discussion.author_email} • {new Date(discussion.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  {discussion.category_name}
                </span>
                {discussion.is_pinned && (
                  <Star className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>
            
            <p className="text-slate-600 mb-4 line-clamp-3">{discussion.content}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {discussion.replies_count} réponses
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(discussion.last_activity_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => discussion.is_liked ? handleUnlikeDiscussion(discussion.id) : handleLikeDiscussion(discussion.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                    discussion.is_liked 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${discussion.is_liked ? 'fill-current' : ''}`} />
                  {discussion.likes_count}
                </button>
                <button className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <Reply className="w-4 h-4" />
                  Répondre
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">Page 1 sur 5</span>
          <button className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal de création de discussion */}
      <CreateDiscussionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadData(); // Recharger les discussions
        }}
      />
    </div>
  );
}

// ===== ÉVÉNEMENTS UTILISATEUR =====
export function UserEventsView() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participatingEvents, setParticipatingEvents] = useState<Set<string>>(new Set());
  const [participationLoading, setParticipationLoading] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    type: '',
    search: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await communityService.getEvents(filters);
      setEvents(result.data);
      
      // Vérifier la participation pour chaque événement
      const participationChecks = result.data.map(async (event) => {
        try {
          const participation = await communityService.checkEventParticipation(event.id);
          return { eventId: event.id, isParticipating: participation.isParticipating };
        } catch (err) {
          console.error(`Erreur vérification participation pour ${event.id}:`, err);
          return { eventId: event.id, isParticipating: false };
        }
      });
      
      const participationResults = await Promise.all(participationChecks);
      const participatingSet = new Set(
        participationResults
          .filter(result => result.isParticipating)
          .map(result => result.eventId)
      );
      setParticipatingEvents(participatingSet);
    } catch (err) {
      setError('Erreur lors du chargement des événements');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipation = async (eventId: string) => {
    const isParticipating = participatingEvents.has(eventId);
    
    setParticipationLoading(prev => new Set(prev).add(eventId));
    
    try {
      if (isParticipating) {
        await communityService.unparticipateFromEvent(eventId);
        setParticipatingEvents(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      } else {
        await communityService.participateInEvent(eventId);
        setParticipatingEvents(prev => new Set(prev).add(eventId));
      }
    } catch (err) {
      console.error('Erreur lors de la participation:', err);
      alert(isParticipating ? 'Erreur lors de la désinscription' : 'Erreur lors de l\'inscription');
    } finally {
      setParticipationLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'MEETUP': return 'bg-blue-100 text-blue-800';
      case 'WEBINAR': return 'bg-green-100 text-green-800';
      case 'WORKSHOP': return 'bg-orange-100 text-orange-800';
      case 'CONTEST': return 'bg-purple-100 text-purple-800';
      case 'ANNOUNCEMENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'MEETUP': return <Users2 className="w-4 h-4" />;
      case 'WEBINAR': return <MessageSquare className="w-4 h-4" />;
      case 'WORKSHOP': return <Trophy className="w-4 h-4" />;
      case 'CONTEST': return <Star className="w-4 h-4" />;
      case 'ANNOUNCEMENT': return <MessageSquare className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Rechercher un événement..."
              />
            </div>
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Tous les types</option>
            <option value="MEETUP">Meetup</option>
            <option value="WEBINAR">Webinaire</option>
            <option value="WORKSHOP">Atelier</option>
            <option value="CONTEST">Concours</option>
            <option value="ANNOUNCEMENT">Annonce</option>
          </select>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map(event => (
          <div key={event.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)} mr-3`}>
                  {getEventTypeIcon(event.event_type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                  <p className="text-sm text-slate-500">
                    par {event.organizer_email}
                  </p>
                </div>
              </div>
              
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.event_type)}`}>
                {event.event_type}
              </span>
            </div>
            
            <p className="text-slate-600 mb-4 line-clamp-3">{event.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-slate-500">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(event.start_date).toLocaleDateString()}
                {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
              </div>
              <div className="flex items-center text-sm text-slate-500">
                {event.is_virtual ? (
                  <MessageSquare className="w-4 h-4 mr-2" />
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {event.is_virtual ? 'En ligne' : event.location}
              </div>
              {event.max_participants && (
                <div className="flex items-center text-sm text-slate-500">
                  <Users2 className="w-4 h-4 mr-2" />
                  {event.current_participants}/{event.max_participants} participants
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {event.status === 'PUBLISHED' ? 'Publié' :
                 event.status === 'CANCELLED' ? 'Annulé' : 'Brouillon'}
              </span>
              
              <button 
                onClick={() => handleParticipation(event.id)}
                disabled={participationLoading.has(event.id)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  participatingEvents.has(event.id)
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } ${participationLoading.has(event.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {participationLoading.has(event.id) ? (
                  'Chargement...'
                ) : participatingEvents.has(event.id) ? (
                  'Se désinscrire'
                ) : (
                  'Participer'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== BADGES UTILISATEUR =====
export function UserBadgesView() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await communityService.getBadges();
      setBadges(data);
    } catch (err) {
      setError('Erreur lors du chargement des badges');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Système de badges</h3>
        <p className="text-slate-600 mb-6">
          Gagnez des badges en participant activement à la communauté. Chaque badge représente un accomplissement unique.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {badges.map(badge => (
            <div key={badge.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mr-3"
                  style={{ backgroundColor: badge.color + '20', color: badge.color }}
                >
                  {badge.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{badge.name}</h4>
                  <p className="text-sm text-slate-500">{badge.assigned_count} attribué(s)</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
